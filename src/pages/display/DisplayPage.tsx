import { useState, useEffect } from "react";
import { CanvasSurface } from "../../shared/ui/canvas/CanvasSurface";
// --- 追加: キャンバスを描画一式（Scene / Renderer / Dispatcher）へ接続する ---
import { useSketchCanvas } from "../../features/sketch/useSketchCanvas";
import { SelectedToolBadge } from "../../shared/ui/SelectedToolBadge/SelectedToolBadge";
import { QrConnectModal } from "../../shared/ui/QrConnectModal/QrConnectModal";
//import type { ToolType } from "../../shared/types/tool";
import { startDisplay } from "../../features/session/display-session";
import "./DisplayPage.css";
import type { ToolType } from "../../shared/types/tool";

/**
 * デスクトップ側で表示するページ。
 * 描画エリア（灰色の枠）に加えて、スマホ側で選択中のツールを
 * 枠の左上に表示する（ツールの選択操作自体はスマホ側のみで行う）。
 */
export function DisplayPage() {
  // 追加: canvas の ref・リサイズ時の再描画ハンドラ・遠隔コマンドの入力口を受け取る
  const { canvasRef, handleResize, handleRemoteMessage } = useSketchCanvas();
  const [selectedTool, setSelectedTool] = useState<ToolType>("pen");
  const [lastCommandType, setLastCommandType] = useState<string>("-"); 
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // セッションの生成はページの責務。受信を描画へ繋ぐ配線もここで行う
  /**
   * useEffectは理論上最初に一回しか実行されない
   * receiverが信号を感知したらhandleRemoteMessageが動きcanvasへの描画が行われる。
   */
  useEffect(() => {
    const { receiver } = startDisplay(
      (id) => setRoomId(id),        // サーバーが部屋発行 → QR表示
      () => setIsConnected(true),   // スマホ接続 → モーダルを閉じる
    );
    receiver.onMessage(handleRemoteMessage);

    receiver.onMessage((_peerId, msg) => {
    const m = msg as { type?: string; changed_tool?: ToolType };
    if (m?.type) setLastCommandType(m.type);
    if (m?.type === "tool-changed" && m.changed_tool) setSelectedTool(m.changed_tool);
  });

  }, [handleRemoteMessage]);

  return (
    <main className="display-page">
      <CanvasSurface ref={canvasRef} onResize={handleResize} />
      <SelectedToolBadge tool={selectedTool} />
      <div style={{
  position: "fixed",
  top: 12,
  left: 50,
  zIndex: 20,
  display: "flex",        // 横並びにする
  gap: 1,                 // 2つの間隔
  pointerEvents: "none",  // クリックを透過
}}>
  <span style={{
    background: "rgba(0, 0, 0, 0.69)",
    color: "#fff",
    padding: "4px 4px",
    borderRadius: 2,
  }}>
    selected:
  </span>
  <span style={{ background: "rgba(0,0,0,0.6)", color: "#ffd24a", padding: "4px 4px", borderRadius: 2 }}>
    {lastCommandType}
  </span>
  <span style={{
    background: "rgba(0,0,0,0.6)",
    color: "#2a91ff",
    padding: "4px 4px",
    borderRadius: 2,
  }}>
    {selectedTool}
  </span>
  
</div>
      
      {roomId && !isConnected && <QrConnectModal roomId={roomId} />}
    </main>
  );
}