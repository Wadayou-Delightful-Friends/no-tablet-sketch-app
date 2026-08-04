import type {Connection, Role} from "../../domain/ports/connection";
import { socket } from "./socket";

type SocketHandler = (...args: unknown[]) => void;
/**
 * 
 * QR-> ID取得後のシグナリングでのチャネル接続を想定したイベントを持ったオブジェクト
 */
/**
 * 概要: Connection port の Socket.IO 実装。
 *
 * 目的: socket はモジュール全体で1つを共有しているため、破棄せずに
 * 作り直すとハンドラが積み上がり、同じイベントが何度も処理される
 * （offer が複数飛ぶ原因になる）。自分が登録した分だけを控えておき、
 * dispose でまとめて外せるようにしている。
 */
export function createSocketIOConnection(): Connection {
  const registered: Array<{ event: string; handler: SocketHandler }> = [];

  const on = <T>(event: string, callback: (payload: T) => void): void => {
    const handler = callback as unknown as SocketHandler;
    socket.on(event, handler);        // ← socket.on はここだけ
    registered.push({ event, handler });
  };

  return {
    start(roomId, role) { socket.emit("join", { roomId, role }); },
    createRoom() { socket.emit("create-room"); },

    onRoomCreated(cb) {
      on<{ roomId: string }>("room-created", ({ roomId }) => cb(roomId));
    },
    onJoined(cb) {
      on<{ roomId: string; displayId?: string }>("joined", cb);
    },
    onPeerJoined(cb) {
      on<{ peerId: string }>("peer-joined", ({ peerId }) => cb(peerId));
    },
    onLeft(cb) {
      on<{ peerId: string; role: Role }>("left", cb);
    },
    onJoinError(cb) {
      on<{ reason: string }>("join-error", ({ reason }) => cb(reason));
      on<{ roomId: string }>("no-display", ({ roomId }) =>
        cb(`その部屋に Display が居ません: ${roomId}`),
      );
    },

    dispose() {
      console.log("[connection] dispose:", registered.length);
      registered.forEach(({ event, handler }) => socket.off(event, handler));
      registered.length = 0;
    },
  };
}