import { useEffect, useRef } from "react";
import { startController } from "../features/session/controller-session";

export function TestControllerPage() {
  const sendRef = useRef<(msg: unknown) => void>(() => {});

  useEffect(() => {
    const { sendDraw } = startController("test-room");
    sendRef.current = sendDraw;
  }, []);

  return (
    <div>
      <p>Test Controller</p>
      <button
        onClick={() =>
          sendRef.current({ t: "move", x: Math.random().toFixed(2), y: Math.random().toFixed(2) })
        }
      >
        座標を送る
      </button>
    </div>
  );
}