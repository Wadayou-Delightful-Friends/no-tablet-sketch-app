import {CanvasSurface} from "../../shared/ui/canvas/CanvasSurface";
// --- 追加: キャンバスを描画一式（Scene / Renderer / Dispatcher）へ接続する ---
import {useSketchCanvas} from "../../features/sketch/useSketchCanvas";
import "./DisplayPage.css";

export function DisplayPage() {
  // 追加: canvas の ref とリサイズ時の再描画ハンドラを受け取る
  const { canvasRef, handleResize } = useSketchCanvas();

  return (
    <main className="display-page">
      {/* 追加: ref / onResize でレンダラーと接続 */}
      <CanvasSurface ref={canvasRef} onResize={handleResize} />
    </main>
  )
}
