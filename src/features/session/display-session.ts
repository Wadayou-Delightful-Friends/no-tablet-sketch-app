import { createSocketIOConnection } from "../../infra/signaling/socketio-connection";
import { createRtcTransport } from "../../infra/webrtc/rtc-transport";
/**
 * 
 * @param roomId シグナリングの部屋番号
 * @param onDraw Controllerがデータを受信した時に、Displayに届いた瞬間に入るイベントハンドラ
 */
export function startDisplay(onRoomReady: (roomId: string) => void, onConnected?: () => void, onPeerLeft?: (peerId: string) => void,    ) {
  const connection = createSocketIOConnection();
  const transport = createRtcTransport();

  // ↓ ここで必要なものを全部まとめて登録する
   // ★ サーバーが部屋を発行したら、idを外へ渡す（→ DisplayPageがQR表示）
  connection.onRoomCreated((roomId) => { 
     console.log("部屋発行:", roomId);
     onRoomReady(roomId);
   });

  connection.onPeerJoined((peerId) => {
    console.log("Controller接続:", peerId)
    onConnected?.();     
  });
  connection.onLeft(({ peerId, role }) => {
    if (role === "controller") {
      transport.close(peerId);
      onPeerLeft?.(peerId);  
    }
  });
  connection.onJoinError((reason) => console.warn("エラー:", reason));

   // ★ start(roomId) じゃなく createRoom()（サーバーに発行を依頼）
  connection.createRoom();

  return {
    receiver: transport.receiver,   // ← 受信の口をそのまま返す
    // onPeerJoined を購読する口も返せる
  };
}