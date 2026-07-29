import { forwardRef, useEffect, useRef } from "react";
import "./CanvasSurface.css";

// --- 追加: レンダラー側へリサイズを通知するための prop ---
type CanvasSurfaceProps = {
  /**
   * リサイズ完了後（バッキングストア再設定・ctx.scale 適用後）に CSS px サイズで通知する。
   *
   * canvas.width への再代入でビットマップが消えるため、
   * 受け取った側は再描画する必要がある。
   */
  onResize?: (size: { width: number; height: number }) => void;
};

/**
 * PC 側に表示する描画エリア本体。
 *
 * 「白いキャンバス + 灰色の枠」の表示と、高DPI 対応のサイズ調整までを担当する。
 * 何を描くかは知らず、内部の <canvas> を ref として外に渡すことで
 * 描画側（Renderer）と接続できるようにしてある。
 */
export const CanvasSurface = forwardRef<HTMLCanvasElement, CanvasSurfaceProps>(
  function CanvasSurface({ onResize }, forwardedRef) {
    const containerRef = useRef<HTMLDivElement>(null);
    const localCanvasRef = useRef<HTMLCanvasElement | null>(null);

    // --- 追加: 最新のコールバックを ref に保持する ---
    // こうしておくと下の useEffect の依存配列を空のまま維持でき、
    // 親の再レンダーで ResizeObserver が張り直されるのを防げる
    const onResizeRef = useRef(onResize);
    onResizeRef.current = onResize;

    useEffect(() => {
      const container = containerRef.current;
      const canvas = localCanvasRef.current;
      if (!container || !canvas) return;

      // 高DPI環境でも文字/線がぼやけないよう、devicePixelRatio 分だけ
      // 実ピクセル数を増やし、CSS 側の見た目サイズは変えずに拡大縮小する。
      const resize = () => {
        const width = container.clientWidth;
        const height = container.clientHeight;
        const dpr = window.devicePixelRatio || 1;

        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const ctx = canvas.getContext("2d");
        ctx?.scale(dpr, dpr);

        // 追加: コンテキストが CSS px で描画できる状態になった後に通知する。
        // 消えたビットマップを描き直す責務は受け取り側にある
        onResizeRef.current?.({ width, height });
      };

      resize();

      const observer = new ResizeObserver(resize);
      observer.observe(container);
      return () => observer.disconnect();
    }, []);

    return (
      <div ref={containerRef} className="canvas-surface">
        <canvas
          ref={(node) => {
            localCanvasRef.current = node;
            if (typeof forwardedRef === "function") {
              forwardedRef(node);
            } else if (forwardedRef) {
              forwardedRef.current = node;
            }
          }}
        />
      </div>
    );
  }
);
