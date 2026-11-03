// src/shared/assets/toolIcons.ts
import type { ToolType } from "../types/tool";
import type { HistoryActionType } from "../types/history-action";
import penIcon from "./icons/pen.png";
import eraserIcon from "./icons/eraser.png";
import resetIcon from "./icons/reset.png";
import undoIcon from "./icons/undo.png";
import redoIcon from "./icons/redo.png";

/** ツール（pen/eraser）ごとのアイコン画像 */
export const TOOL_ICON_SRC: Record<ToolType, string> = {
  pen: penIcon,
  eraser: eraserIcon,
};

/** 履歴操作（undo/redo/reset）ごとのアイコン画像 */
export const HISTORY_ACTION_ICON_SRC: Record<HistoryActionType, string> = {
  undo: undoIcon,
  redo: redoIcon,
  reset: resetIcon,
};