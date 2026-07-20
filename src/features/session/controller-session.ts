import { createSocketIOConnection } from "../../infra/signaling/socketio-connection";
import { createRtcTransport } from "../../infra/webrtc/rtc-transport";

export function startController(roomId: string) {
  const connection = createSocketIOConnection();
  const transport = createRtcTransport();

  // ★ Controllerの本命：displayId を受け取って、そこへ P2P を張る（offer開始）
  connection.onJoined(({ displayId }) => {
    if (displayId) transport.connect(displayId);
  });

  // Displayが落ちたら終了
  connection.onLeft(({ role }) => {
    if (role === "display") console.log("Displayが切れました");
  });

  connection.onJoinError((reason) => console.warn("参加エラー:", reason));

  // 全部登録してから start（roleは controller）
  connection.start(roomId, "controller");

  // UIから座標を送る関数を返す
  return {
    sendDraw: (msg: unknown) => transport.sender.send(msg),
  };
}