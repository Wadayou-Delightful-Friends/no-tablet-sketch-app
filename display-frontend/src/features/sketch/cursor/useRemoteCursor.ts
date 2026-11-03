import { useCallback, useRef } from "react";

/** 描画が止まってからカーソルを隠すまでの時間 */
const HIDE_DELAY_MS = 400;

/**
 * 遠隔カーソルの表示を DOM 直接操作で行うフック。
 * 座標ごとに setState すると再レンダーで canvas が再構築され、
 * 描画中のストロークが途切れるため、ref 経由で style だけ書き換える。
 */
export function useRemoteCursor() {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  /** canvas 基準の座標へ移動して表示。一定時間動きが無ければ自動で隠れる */
  const moveCursor = useCallback((point: { x: number; y: number }): void => {
    const el = cursorRef.current;
    if (el === null) return;

    el.style.transform = `translate3d(${point.x}px, ${point.y}px, 0) translate(-50%, -50%)`;
    el.style.opacity = "1";

    if (hideTimerRef.current !== null) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      if (cursorRef.current !== null) cursorRef.current.style.opacity = "0";
    }, HIDE_DELAY_MS);
  }, []);

  return { cursorRef, moveCursor };
}