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
 * 横画面レイアウト上の「縦方向」の座標を取得する。
 *
 * 通常の横画面では clientY をそのまま利用する。
 * CSSで90°回転している縦画面では、
 * 見た目の上下移動は実際には clientX の移動になるため
 * clientX を利用する。
 */
function getLogicalY(clientX: number, clientY: number) {
  const isPortrait = window.matchMedia("(orientation: portrait)").matches;

  if (!isPortrait) {
    return clientY;
  }

  // 90°回転時は上下方向を反転する
  return window.innerWidth - clientX;
}

/**
 * 左上ボタンの長押し→縦スライドによるツール選択の状態とイベントハンドラをまとめたフック。
 *
 * 操作の流れ:
 * 1. ボタンを pointerDown → 一定時間後（長押し確定）にメニューを開く
 * 2. 指を離さず pointerMove → 押した位置からの縦方向の移動量でホバー中ツールを算出
 * 3. pointerUp → その時点のホバー中ツールを選択ツールとして確定し、メニューを閉じる
 *
 * @param onSelectedToolChange 選択ツールが確定した時の通知先
 * @returns 選択状態、メニュー状態、Pointer Eventハンドラ
 */
export function useToolSelector(
  onSelectedToolChange?: (selectedTool: ToolType) => void
) {
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
   * 指の現在位置（縦方向の座標）から、ホバー中のツールを判定する。
   *
   * ToolMenu の表示位置を基準に、指がどのツール項目の範囲にあるかを計算する。
   * 現在選択中のツールを基準にした相対移動量ではなく、
   * メニュー上の絶対位置で判定することで、どのツール選択後でも
   * 他のツールへ移動しやすくする。
   */
  const resolveHoverTool = useCallback(
    (clientY: number): ToolType => {
      const menuTop = 80; // ToolMenu.css の top と合わせる

      const index = Math.floor(
        (clientY - menuTop) / STEP
      );

      const clampedIndex = Math.min(
        Math.max(index, 0),
        TOOL_ORDER.length - 1
      );

      return TOOL_ORDER[clampedIndex];
    },
    []
);

  const handlePointerDown = useCallback(
    (e: PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      activePointerIdRef.current = e.pointerId;
      startYRef.current = getLogicalY(e.clientX, e.clientY);

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

      setHoverTool(
        resolveHoverTool(
          getLogicalY(e.clientX, e.clientY)
        )
      );
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
        onSelectedToolChange?.(hoverTool);
      }

      setMenuOpen(false);
      setHoverTool(null);
      resetGesture();
    },
    [menuOpen, hoverTool, onSelectedToolChange, resetGesture]
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
