import { useCallback, useRef, useState } from "react";
import type { PointerEvent } from "react";
import type { ToolType } from "../../shared/types/tool";
import { TOOL_ORDER } from "../../shared/types/tool";

/** 長押しと判定するまでの時間 (ms) */
const LONG_PRESS_MS = 300;

/**
 * メニュー1項目分の高さ + 間隔 (px)
 * shared/ui/ToolButton/ToolButton.css, shared/ui/ToolMenu/ToolMenu.css の
 * レイアウト定数と必ず一致させること。
 */
const ITEM_HEIGHT = 56;
const ITEM_GAP = 8;
const STEP = ITEM_HEIGHT + ITEM_GAP;

/**
 * 左上ボタンの長押し→縦スライドによるツール選択の状態とイベントハンドラをまとめたフック。
 *
 * 操作の流れ:
 * 1. ボタンを pointerDown → 一定時間後（長押し確定）にメニューを開く
 * 2. 指を離さず pointerMove → 押した位置からの縦方向の移動量でホバー中ツールを算出
 * 3. pointerUp → その時点のホバー中ツールを選択ツールとして確定し、メニューを閉じる
 */
export function useToolSelector() {
  const [selectedTool, setSelectedTool] = useState<ToolType>("pen");
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoverTool, setHoverTool] = useState<ToolType | null>(null);

  const longPressTimerRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const activePointerIdRef = useRef<number | null>(null);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const resetGesture = useCallback(() => {
    clearLongPressTimer();
    activePointerIdRef.current = null;
    startYRef.current = null;
  }, [clearLongPressTimer]);

  /**
   * 押した位置からの相対Y座標を、TOOL_ORDER 上のインデックスへ変換する。
   * 移動量ゼロ（＝長押し直後、まだ指を動かしていない状態）では
   * 現在選択中のツールを指すように、選択中ツールのインデックスを基準にする。
   */
  const resolveHoverTool = useCallback(
    (clientY: number): ToolType => {
      const startY = startYRef.current ?? clientY;
      const deltaY = clientY - startY;
      const baseIndex = TOOL_ORDER.indexOf(selectedTool);
      const rawIndex = baseIndex + Math.round(deltaY / STEP);
      const clampedIndex = Math.min(Math.max(rawIndex, 0), TOOL_ORDER.length - 1);
      return TOOL_ORDER[clampedIndex];
    },
    [selectedTool]
  );

  const handlePointerDown = useCallback(
    (e: PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      activePointerIdRef.current = e.pointerId;
      startYRef.current = e.clientY;

      clearLongPressTimer();
      longPressTimerRef.current = window.setTimeout(() => {
        setMenuOpen(true);
        // メニューが開いた瞬間は、現在選択中のツールをホバー状態にしておく
        setHoverTool(selectedTool);
      }, LONG_PRESS_MS);
    },
    [clearLongPressTimer, selectedTool]
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent<HTMLButtonElement>) => {
      if (activePointerIdRef.current !== e.pointerId) return;
      if (!menuOpen) return;

      setHoverTool(resolveHoverTool(e.clientY));
    },
    [menuOpen, resolveHoverTool]
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent<HTMLButtonElement>) => {
      if (activePointerIdRef.current !== e.pointerId) {
        resetGesture();
        return;
      }

      // メニューが開く前に指を離した場合（=長押しに満たない）は何もしない
      if (menuOpen && hoverTool) {
        setSelectedTool(hoverTool);
      }

      setMenuOpen(false);
      setHoverTool(null);
      resetGesture();
    },
    [menuOpen, hoverTool, resetGesture]
  );

  const handlePointerCancel = useCallback(() => {
    setMenuOpen(false);
    setHoverTool(null);
    resetGesture();
  }, [resetGesture]);

  return {
    selectedTool,
    menuOpen,
    hoverTool,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
    },
  };
}
