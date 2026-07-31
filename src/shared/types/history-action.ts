// 新設: shared/types/history-action.ts
/**
 * 板タブ（スマートフォン）側で選択可能な履歴操作の種類。
 *
 * undo     : 1つ戻る
 * redo     : 1つやり直す
 * reset   ：リセット
 * 
 * 選択ジェスチャー
 * 単押し(タップ)→専用メニュー
 * undo/redo は連打可、reset は単発
 */
export type HistoryActionType = "undo" | "redo" | "reset";
export const HISTORY_ACTION_ORDER: HistoryActionType[] = ["undo", "redo", "reset"];