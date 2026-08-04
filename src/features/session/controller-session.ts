import { createSocketIOConnection } from "../../infra/signaling/socketio-connection";
import { createRtcTransport } from "../../infra/webrtc/rtc-transport";

/**
 * @param roomId QRから読み取った部屋番号
 * @returns sendDraw 描画コマンドの送信口 / dispose セッションの後始末
 */
export function startController(roomId: string) {
  const connection = createSocketIOConnection();
  const transport = createRtcTransport();

  connection.onJoined(({ displayId }) => {
    if (!displayId) return;
    console.log("[controller] connect:", displayId);
    transport.connect(displayId);
  });

  connection.onLeft(({ role }) => {
    if (role === "display") console.warn("[controller] Displayが切断しました");
  });

  connection.onJoinError((reason) => console.error("[join] 失敗:", reason));

  connection.start(roomId, "controller");

  return {
    sendDraw: (message: unknown) => transport.sender.send(message),
    /** connection と transport の両方を畳む */
    dispose: () => {
      connection.dispose();
      transport.dispose();
    },
  };
}