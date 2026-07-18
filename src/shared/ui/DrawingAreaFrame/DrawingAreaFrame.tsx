import "./DrawingAreaFrame.css";

/**
 * PC側の描画エリア（画面全体）の縦横比。
 *
 * 今はPC側の実際の解像度を受け取る手段がないため 16:9 を仮定している。
 * 将来、PC側から実際の画面サイズを共有できるようになったら、
 * この定数を props 化して差し替える想定。
 */
const DESKTOP_ASPECT_RATIO = 16 / 9;

/**
 * スマホ画面上に、PCの描画エリア（画面全体）に対応する範囲を
 * カメラのビューファインダーのような4隅の角で示すオーバーレイ。
 *
 * 表示だけが目的で操作は受け付けないため pointer-events: none にしてあり、
 * 下に重なる ToolButton 等のタップを妨げない。
 */
export function DrawingAreaFrame() {
  return (
    <div className="drawing-area-frame-wrapper">
      <div
        className="drawing-area-frame"
        style={{ aspectRatio: DESKTOP_ASPECT_RATIO }}
      >
        <span className="drawing-area-frame__corner drawing-area-frame__corner--tl" />
        <span className="drawing-area-frame__corner drawing-area-frame__corner--tr" />
        <span className="drawing-area-frame__corner drawing-area-frame__corner--bl" />
        <span className="drawing-area-frame__corner drawing-area-frame__corner--br" />
      </div>
    </div>
  );
}
