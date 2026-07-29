/**
 * 板タブ（スマートフォン）側で選択可能な描画ツールの種類。
 *
 * pen    : 描画（ペン）
 * eraser : 消しゴム
 * reset  : キャンバスのリセット
 */
export type ToolType = "pen" | "eraser" | "reset" | "undo" | "redo";

/**
 * メニューに表示するツールの並び順。
 * ToolMenu / useToolSelector の両方でこの並びを参照する。
 */
export const TOOL_ORDER: ToolType[] = ["pen", "eraser", "reset", "undo", "redo"];
