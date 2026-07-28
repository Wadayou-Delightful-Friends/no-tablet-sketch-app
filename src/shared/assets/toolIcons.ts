import type { ToolType } from "../types/tool";
import penIcon from "./icons/pen.png";
import eraserIcon from "./icons/eraser.png";
import resetIcon from "./icons/reset.png";
import undoIcon from "./icons/undo.png";
import redoIcon from "./icons/redo.png";

/**
 * ツールごとのアイコン画像。
 * スマホ側のツールメニュー（ToolItem）とPC側の選択中ツール表示（SelectedToolBadge）
 * の両方から参照する共通の対応表。
 */
export const TOOL_ICON_SRC: Record<ToolType, string> = {
  pen: penIcon,
  eraser: eraserIcon,
  reset: resetIcon,
  undo: undoIcon,
  redo: redoIcon,
};
