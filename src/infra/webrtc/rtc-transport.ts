import { socket } from "../signaling/socket";
import { rtcConfig } from "./rtc-config";
import type { Sender } from "../../domain/ports/sender";
import type { Receiver } from "../../domain/ports/receiver";

type SignalIncoming = {
  from: string;
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

type Entry = {
  pc: RTCPeerConnection;
  channel?: RTCDataChannel;
  /** remoteDescription 未設定のときに届いた ICE 候補を貯めておく */
  pending: RTCIceCandidateInit[];
  /** この peer の signal 処理を1件ずつ順に流すためのキュー */
  queue: Promise<void>;
};

/**
 * 概要: WebRTC の接続確立と、確立後のデータ送受信をまとめた層。
 *
 * 目的: シグナリング（誰と繋ぐか）と P2P（どう繋ぐか）の境目をここに閉じ込め、
 * features 側には sender / receiver だけを見せる。
 */
export function createRtcTransport() {
  const listeners = new Set<(peerId: string, msg: unknown) => void>();
  /**
   * string - 相手のsocket.id(peerid)
   * Entry (相手のdatachannelの情報など）
   */
  const peers = new Map<string, Entry>();

  /** DataChannel の受信口を繋ぐ。入手経路（自作 / ondatachannel）は問わない */
  function setupChannel(peerId: string, ch: RTCDataChannel): void {
    const entry = peers.get(peerId);
    if (!entry) return;
    entry.channel = ch;

    ch.onopen = () => console.log(`[dc] open: ${peerId}`);
    ch.onclose = () => console.log(`[dc] close: ${peerId}`);
    ch.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      listeners.forEach((fn) => fn(peerId, msg));
    };
  }

  /**
   * 相手のごとのpeer、Entryを作ってpeersに書き込む
   * @param peerId 繋ぎ相手の socket.id
   * @param initiator offer を出す側かどうか（Controller が true）
   */
  function createPeer(peerId: string, initiator: boolean): Entry {
    const pc = new RTCPeerConnection(rtcConfig);
    const entry: Entry = { pc, pending: [], queue: Promise.resolve() };
    peers.set(peerId, entry);

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit("signal", { to: peerId, candidate: e.candidate });
    };
    pc.oniceconnectionstatechange = () =>
      console.log(`[ice] ${peerId}: ${pc.iceConnectionState}`);
    pc.onconnectionstatechange = () =>
      console.log(`[pc]  ${peerId}: ${pc.connectionState}`);

    if (initiator) {
      // 発信側（Controller）: 管を作り、その変化を合図に offer を出す
      setupChannel(peerId, pc.createDataChannel("draw"));

      // onnegotiationneeded は構成が変わるたびに飛ぶ。作成中と応答待ちの間は
      // 新しい offer を作らない（重複した offer は相手の状態機械を壊す）
      let makingOffer = false;
      pc.onnegotiationneeded = async () => {
        if (makingOffer || pc.signalingState !== "stable") return;
        makingOffer = true;
        try {
          // 引数なし版は「いまの state に合う SDP」を1手で作る。
          // createOffer と2段階にすると、その間に state がズレる
          await pc.setLocalDescription();
          socket.emit("signal", { to: peerId, description: pc.localDescription });
        } catch (error) {
          console.warn("[rtc] offer作成に失敗:", error);
        } finally {
          makingOffer = false;
        }
      };
    } else {
      // 受け側（Display）: 相手が開いた管を受け取る
      pc.ondatachannel = (e) => {
        console.log(`[dc] ondatachannel: ${e.channel.label}`);
        setupChannel(peerId, e.channel);
      };
    }

    return entry;
  }

  /**
   * 概要: 相手からの signal（offer / answer / ICE候補）を捌く。
   *
   * 目的: 処理に await を含むため、複数のイベントが同時に走ると
   * setRemoteDescription と setLocalDescription の間で状態が入れ替わる。
   * peer ごとのキューに積んで直列に流し、その競合を構造的に防ぐ。
   *
   * dispose で off するため、無名関数ではなく名前付きで保持している。
   */
  const handleSignal = ({ from, description, candidate }: SignalIncoming): void => {
    const entry = peers.get(from) ?? createPeer(from, false);//fromは相手のsocket.id

    entry.queue = entry.queue
      .then(async () => {
        const { pc } = entry;

        if (description) {
          // 応答済みなのに同じ offer が再送されたら捨てる
          if (description.type === "offer" && pc.signalingState !== "stable") {
            console.warn("[rtc] 重複した offer を無視:", pc.signalingState);
            return;
          }
          // offer を出していないのに answer が来たら捨てる
          if (description.type === "answer" && pc.signalingState !== "have-local-offer") {
            console.warn("[rtc] 不要な answer を無視:", pc.signalingState);
            return;
          }

          await pc.setRemoteDescription(description);

          // remoteDescription が入るまで保留していた候補をここで流し込む
          for (const c of entry.pending) await pc.addIceCandidate(c);
          entry.pending = [];

          if (description.type === "offer") {
            await pc.setLocalDescription();
            socket.emit("signal", { to: from, description: pc.localDescription });
          }
          return;
        }

        if (candidate) {
          if (pc.remoteDescription) await pc.addIceCandidate(candidate);
          else entry.pending.push(candidate);
        }
      })
      .catch((error) => {
        // 1件失敗しても後続の signal を止めない
        console.warn("[rtc] signal処理に失敗:", error);
      });
  };

  socket.on("signal", handleSignal);//クライアントサイドの通信
/**
 * sender送信
 */
  const sender: Sender = {
    send: (msg) => {
      const data = JSON.stringify(msg);
      peers.forEach(({ channel }) => {
        if (channel?.readyState === "open") channel.send(data);
      });
    },
  };
/**
 * 受信
 */
  const receiver: Receiver = {
    onMessage: (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };

  /**
   * 概要: 発信側として相手への接続を開始する（Controller が使う）。
   *
   * 目的: 二重に呼ばれると PeerConnection が2つでき、offer が2通飛ぶ。
   * 受け側は1通目に answer を返す途中で2通目に状態を進められ、
   * setLocalDescription が "wrong state: stable" で失敗する。
   */
  function connect(peerId: string): void {
    if (peers.has(peerId)) {
      console.warn("[rtc] 既に接続済みのため無視:", peerId);
      return;
    }
    createPeer(peerId, true);
  }

  /** 相手1人ぶんの接続を閉じる（left イベントで使う） */
  function close(peerId: string): void {
    peers.get(peerId)?.pc.close();
    peers.delete(peerId);
  }

  /**
   * 概要: この transport が握っているものを全部片付ける。
   *
   * 目的: socket は共有なので、破棄せずに新しい transport を作ると
   * 古い PeerConnection が閉じられないまま残り、signal ハンドラも
   * 二重に走る。React の再マウントで必ず起きるため口を用意している。
   */
  function dispose(): void {
    console.log("[rtc] dispose:", peers.size);
    socket.off("signal", handleSignal);
    peers.forEach(({ pc }) => pc.close());
    peers.clear();
    listeners.clear();
  }

  return { sender, receiver, connect, close, dispose };
}