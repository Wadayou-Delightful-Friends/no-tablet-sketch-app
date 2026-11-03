import type { Ref } from "react";
import "./RemoteCursor.css";

export function RemoteCursor({ ref }: { ref: Ref<HTMLDivElement> }) {
  return <div ref={ref} className="remote-cursor" />;
}