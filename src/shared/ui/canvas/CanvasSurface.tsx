import { forwardRef, useEffect, useRef } from "react";
import "./CanvasSurface.css";

/**
 * PC 側に表示する描画エリア本体。
 *
 * 現時点ではスクリーンショットにある「白いキャンバス + 灰色の枠」を
 * 表示するだけで、実際にストロークを描く処理は未実装（今後の拡張）。
 *
 * 将来スマホ側から座標を受け取ってそのまま描画できるよう、
 * 内部の <canvas> を ref として外に渡せる形にしてある。
 */
export const CanvasSurface = forwardRef<HTMLCanvasElement>(
  function CanvasSurface(_props, forwardedRef) {
    const containerRef = useRef<HTMLDivElement>(null);
    const localCanvasRef = useRef<HTMLCanvasElement | null>(null);

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
