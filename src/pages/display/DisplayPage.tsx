import { useState, useEffect } from "react";
import { CanvasSurface } from "../../shared/ui/canvas/CanvasSurface";
// --- 追加: キャンバスを描画一式（Scene / Renderer / Dispatcher）へ接続する ---
import { useSketchCanvas } from "../../features/sketch/useSketchCanvas";
import { SelectedToolBadge } from "../../shared/ui/SelectedToolBadge/SelectedToolBadge";
import { QrConnectModal } from "../../shared/ui/QrConnectModal/QrConnectModal";
import { useIncomingSelectedTool } from "../../shared/model/selectedTool/useIncomingSelectedTool";
import { startDisplay } from "../../features/session/display-session";
import "./DisplayPage.css";

/**
 * デスクトップ側で表示するページ。
 * 描画エリア（灰色の枠）に加えて、スマホ側で選択中のツールを
 * 枠の左上に表示する（ツールの選択操作自体はスマホ側のみで行う）。
 */
export function DisplayPage() {
  // 追加: canvas の ref・リサイズ時の再描画ハンドラ・遠隔コマンドの入力口を受け取る
  const { canvasRef, handleResize, handleRemoteMessage } = useSketchCanvas();
  const selectedTool = useIncomingSelectedTool();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // セッションの生成はページの責務。受信を描画へ繋ぐ配線もここで行う
  useEffect(() => {
    const { receiver } = startDisplay(
      (id) => setRoomId(id),        // サーバーが部屋発行 → QR表示
      () => setIsConnected(true),   // スマホ接続 → モーダルを閉じる
    );
    receiver.onMessage(handleRemoteMessage);
  }, [handleRemoteMessage]);

  return (
    <main className="display-page">
      <CanvasSurface ref={canvasRef} onResize={handleResize} />
      <SelectedToolBadge tool={selectedTool} />
      {roomId && !isConnected && <QrConnectModal roomId={roomId} />}
    </main>
  );
}