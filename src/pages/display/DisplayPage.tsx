import { useState } from "react";
import {CanvasSurface} from "../../shared/ui/canvas/CanvasSurface";
// --- 追加: キャンバスを描画一式（Scene / Renderer / Dispatcher）へ接続する ---
import {useSketchCanvas} from "../../features/sketch/useSketchCanvas";
import { SelectedToolBadge } from "../../shared/ui/SelectedToolBadge/SelectedToolBadge";
import { QrConnectModal } from "../../shared/ui/QrConnectModal/QrConnectModal";
import { useIncomingSelectedTool } from "../../shared/model/selectedTool/useIncomingSelectedTool";
import "./DisplayPage.css";

/**
 * デスクトップ側で表示するページ。
 * 描画エリア（灰色の枠）に加えて、スマホ側で選択中のツールを
 * 枠の左上に表示する（ツールの選択操作自体はスマホ側のみで行う）。
 */
export function DisplayPage() {
  // 追加: canvas の ref とリサイズ時の再描画ハンドラを受け取る
  const { canvasRef, handleResize } = useSketchCanvas();
  const selectedTool = useIncomingSelectedTool();
  const [isConnected, setIsConnected] = useState(false);

  return (
    <main className="display-page">
      {/* 追加: ref / onResize でレンダラーと接続 */}
      <CanvasSurface ref={canvasRef} onResize={handleResize} />
      <SelectedToolBadge tool={selectedTool} />

      {!isConnected && (
        <QrConnectModal onDismiss={() => setIsConnected(true)} />
      )}
    </main>
  );
}