import { createSocketIOConnection } from "../../infra/signaling/socketio-connection";
import { createRtcTransport } from "../../infra/webrtc/rtc-transport";
/**
 * 
 * @param roomId シグナリングの部屋番号
 * @param onDraw Controllerがデータを受信した時に、Displayに届いた瞬間に入るイベントハンドラ
 */
export function startDisplay(roomId: string, onDraw: (peerId: string, msg: unknown) => void) {
  const connection = createSocketIOConnection();
  const transport = createRtcTransport();

  // ↓ ここで必要なものを全部まとめて登録する
  transport.receiver.onMessage((peerId, msg) => onDraw(peerId, msg));
  connection.onJoined(({ roomId }) => console.log("部屋作成OK:", roomId));
  connection.onPeerJoined((peerId) => console.log("Controller接続:", peerId));
  connection.onLeft(({ peerId, role }) => {
    if (role === "controller") transport.close(peerId);
  });
  connection.onJoinError((reason) => console.warn("エラー:", reason));

  // 全部登録し終わってから、最後に start
  connection.start(roomId, "display");
}