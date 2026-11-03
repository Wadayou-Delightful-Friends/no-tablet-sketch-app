// features/tool-selector/useHistoryMenu.ts（新設）
import { useCallback, useRef, useState } from "react";
import type { PointerEvent } from "react";
import type { HistoryActionType } from "../../shared/types/history-action";

/** タップと判定する上限時間 (ms)。これを超えて押し続けたら長押し扱いとし、タップにしない */
const TAP_MAX_MS = 300;
/** タップと判定する移動量の上限 (px)。指がずれた場合は誤タップとみなさない */
const TAP_MAX_MOVE_PX = 8;

type UseHistoryMenuCallbacks = {
  onUndo?: () => void;
  onRedo?: () => void;
  onReset?: () => void;
};

/**
 * パレットアイコンをタップすると開く、履歴操作（undo/redo/reset）メニューの
 * 状態とイベントハンドラをまとめたフック。
 *
 * useToolSelector（長押し→縦スライドで選択・指を離して確定）とは操作方式が異なる：
 * このメニューは開いたままの状態で各ボタンを個別にタップする。
 * undo/redo はタップのたびに実行してメニューを開いたままにし連打を許可する。
 * reset は実行後に必ずメニューを閉じ、誤連打による多重リセットを防ぐ。
 *
 * @param callbacks undo/redo/reset それぞれが選ばれた時の通知先
 * @returns メニュー開閉状態と、アイコン用・各ボタン用のイベントハンドラ
 */
export function useHistoryMenu({ onUndo, onRedo, onReset }: UseHistoryMenuCallbacks) {
  const [menuOpen, setMenuOpen] = useState(false);

  const pointerDownAtRef = useRef<number | null>(null);
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleIconPointerDown = useCallback((e: PointerEvent<HTMLButtonElement>) => {
    pointerDownAtRef.current = Date.now();
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleIconPointerUp = useCallback((e: PointerEvent<HTMLButtonElement>) => {
    const downAt = pointerDownAtRef.current;
    const downPos = pointerDownPosRef.current;
    pointerDownAtRef.current = null;
    pointerDownPosRef.current = null;
    if (downAt === null || downPos === null) return;

    const elapsed = Date.now() - downAt;
    const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
    // 長押し（ツール選択ジェスチャ）と衝突しないよう、短時間・小移動の
    // 操作だけをタップとして扱う
    if (elapsed <= TAP_MAX_MS && moved <= TAP_MAX_MOVE_PX) {
      setMenuOpen((open) => !open);
    }
  }, []);

  const handleActionSelect = useCallback(
    (action: HistoryActionType) => {
      if (action === "undo") {
        onUndo?.();
        // undo は連打を許可するため、メニューを閉じない
        return;
      }
      if (action === "redo") {
        onRedo?.();
        return;
      }
      // reset は破壊的操作なので、実行後に必ず閉じる
      onReset?.();
      setMenuOpen(false);
    },
    [onUndo, onRedo, onReset],
  );

  return {
    menuOpen,
    iconHandlers: {
      onPointerDown: handleIconPointerDown,
      onPointerUp: handleIconPointerUp,
    },
    handleActionSelect,
  };
}