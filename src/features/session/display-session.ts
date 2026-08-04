import { createSocketIOConnection } from "../../infra/signaling/socketio-connection";
import { createRtcTransport } from "../../infra/webrtc/rtc-transport";

/**
 * @param onRoomReady サーバーが部屋を発行したら、その roomId を受け取る
 * @param onConnected Controller が接続してきたら呼ばれる
 * @param onPeerLeft  Controller が切断したら、その peerId を受け取る
 */
export function startDisplay(
  onRoomReady: (roomId: string) => void,
  onConnected?: () => void,
  onPeerLeft?: (peerId: string) => void,
) {
  const connection = createSocketIOConnection();
  const transport = createRtcTransport();

  connection.onRoomCreated((roomId) => {
    console.log("[display] 部屋発行:", roomId);
    onRoomReady(roomId);
  });

  connection.onPeerJoined((peerId) => {
    console.log("[display] Controller接続:", peerId);
    onConnected?.();
  });

  connection.onLeft(({ peerId, role }) => {
    if (role !== "controller") return;
    transport.close(peerId);
    onPeerLeft?.(peerId);
  });

  connection.onJoinError((reason) => console.warn("[display] エラー:", reason));

  connection.createRoom();

  return {
    receiver: transport.receiver,
    dispose: () => {
      connection.dispose();
      transport.dispose();
    },
  };
}