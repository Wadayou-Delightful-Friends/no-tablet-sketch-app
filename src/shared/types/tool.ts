/**
 * 板タブ（スマートフォン）側で選択可能な描画ツールの種類。
 *
 * pen    : 描画（ペン）
 * eraser : 消しゴム
 * 
 * 選択ジェスチャー
 * 長押し→スライド選択（既存 useToolSelector)
 */
export type ToolType = "pen" | "eraser";
export const TOOL_ORDER: ToolType[] = ["pen", "eraser"];