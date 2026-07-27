import { useEffect } from "react";
import { startDisplay } from "../features/session/display-session";

export function TestDisplayPage() {
  useEffect(() => {
    const { receiver } = startDisplay((roomId) => {
      console.log("発行されたroomId:", roomId);   // ← onRoomReady の中身
    });
    receiver.onMessage((peerId, msg) => {
      console.log("届いた:", peerId, msg);
    });
  }, []);

  return <div>Test Display（コンソール見てね）</div>;
}