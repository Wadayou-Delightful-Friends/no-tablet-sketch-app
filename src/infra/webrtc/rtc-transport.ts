// infra/webrtc/rtc-transport.ts
import { socket } from "../signaling/socket"; // 共有socketをimport（引数なし）
import { rtcConfig } from "./rtc-config";
import type { Sender } from "../../domain/ports/sender";
import type { Receiver } from "../../domain/ports/receiver";





// 型を定義
type SignalIncoming = {
  from: string;
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};
/**
 * 主にIDが確立後にwebRTCのシグナリング（SDP Offer、ICE候補収集など）をサーバー側と通信しら
 * 行うクライアントサイド。
 * @returns sender/receiver..シグナリング確立後送受信者が用いるオブジェクト
 * connect IDチャネル確立後に発信側（主にコントローラ）がシグナリングを用いるために使う
 * close 接続の遮断を感知するオブジェクト
 * 
 */
export function createRtcTransport() {

  const listeners = new Set<(peerId: string, msg: unknown) => void>();

  type Entry = {
    pc: RTCPeerConnection;
    channel?: RTCDataChannel;//sender,receiverの中継の役割を担う自信のチャンネル

    pending: RTCIceCandidateInit[]; // remote未設定時にICEを貯める
  };
  const peers = new Map<string, Entry>();
  //let onMsg: (peerId: string, msg: unknown) => void = () => {};

  // DataChannel の受信口をセット
  function setupChannel(peerId: string, ch: RTCDataChannel) {
    peers.get(peerId)!.channel = ch;
    ch.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    listeners.forEach((fn) => fn(peerId, msg));   // ← 全員に配る
  };
  }
/**
 * 
 * @param peerId 繋ぎ相手のID 誰と繋ぐかがわかる
 * @param initiator webrtc接続でさきに通信を試みた方
 * @returns 
 */
  // 相手ごとに RTCPeerConnection を作る
  function createPeer(peerId: string, initiator: boolean): Entry {
    const pc = new RTCPeerConnection(rtcConfig);
    const entry: Entry = { pc, pending: [] };
    peers.set(peerId, entry);

    // 自分のICE候補を相手へ中継（共有socket経由）
    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit("signal", { to: peerId, candidate: e.candidate });
    };

    if (initiator) {
      // 発信側（Controller）：DataChannelを作り、offerを出す
      setupChannel(peerId, pc.createDataChannel("draw"));
      pc.onnegotiationneeded = async () => {
        await pc.setLocalDescription(await pc.createOffer());
        socket.emit("signal", { to: peerId, description: pc.localDescription });
      };
    } else {
      // 受け側（Display）：相手が作ったDataChannelを受け取る
      pc.ondatachannel = (e) => setupChannel(peerId, e.channel);
    }
    return entry;
  }
/**
 * from : 送ってきた相手のsocket.id
 * descripton SDP
 * candidate : ICE候補
 */
  // 相手からの signal（offer/answer/ICE）を捌く
  socket.off("signal");
  socket.on("signal", async ({ from, description, candidate }: SignalIncoming ) => {
    const entry = peers.get(from) ?? createPeer(from, false);
    const { pc } = entry;
    if (description) {
      await pc.setRemoteDescription(description);
      for (const c of entry.pending) await pc.addIceCandidate(c);
      entry.pending = [];
      if (description.type === "offer"&& pc.signalingState === "have-remote-offer") {
        await pc.setLocalDescription(await pc.createAnswer());
        socket.emit("signal", { to: from, description: pc.localDescription });
      }
    } else if (candidate) {
      if (pc.remoteDescription) await pc.addIceCandidate(candidate);
      else entry.pending.push(candidate); // remote未設定なら貯める
    }
  });

  // features に返す
  const sender: Sender = {
    send: (msg) => {
      const data = JSON.stringify(msg);
      peers.forEach(({ channel }) => channel?.readyState === "open" && channel.send(data));
    },
  };
  const receiver: Receiver = {
    onMessage: (cb) => { 
       listeners.add(cb);              // 名簿に追加
    return () => listeners.delete(cb);  // 解除関数を返す },
    },
  };
  function connect(peerId: string) {
    createPeer(peerId, true); // 発信側として接続開始（Controllerが使う）
  }
  function close(peerId: string) {
    peers.get(peerId)?.pc.close();
    peers.delete(peerId);
  }

  return { sender, receiver, connect, close };
}