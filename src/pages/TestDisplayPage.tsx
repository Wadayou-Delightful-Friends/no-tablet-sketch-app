import { useEffect } from "react";
import { startDisplay } from "../features/session/display-session";

export function TestDisplayPage() {
  useEffect(() => {
    startDisplay("test-room", (peerId, msg) => {
      console.log("📥 届いた:", peerId, msg);
    });
  }, []);

  return <div>Test Display（コンソール見てね）</div>;
}