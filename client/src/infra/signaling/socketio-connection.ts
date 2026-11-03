import type {Connection, Role} from "../../domain/ports/connection";
import { socket } from "./socket";
/**
 * 
 * QR-> ID取得後のシグナリングでのチャネル接続を想定したイベントを持ったオブジェクト
 */
export function createSocketIOConnection(): Connection {
    return {

        createRoom() {
         socket.emit("create-room");
        },
        onRoomCreated(cb) {
          socket.on("room-created", (p: { roomId: string }) => cb(p.roomId));
        },

        //コントローラーがシグナリングサーバーの部屋に到達する
        start(roomId, role) {
            socket.emit("join", {roomId, role});
        },
        //が部屋に入ったことがわかる関数プロパティ
        onJoined(cb) {
           socket.on("joined", (info: { roomId: string; displayId?: string }) => cb(info));
        },
        //Controllerが部屋に入ったことがわかる関数プロパティ
        onPeerJoined(cb) {
          socket.on("peer-joined", (p: { peerId: string }) => cb(p.peerId));
        },
        //切断が切れたことがわかる
         onLeft(cb) {
             socket.on("left", (info: { peerId: string; role: Role }) => cb(info));
        },
        //到達エラー
         onJoinError(cb) {
            socket.on("join-error", (p: { reason: string }) => cb(p.reason));
        },
    }
}