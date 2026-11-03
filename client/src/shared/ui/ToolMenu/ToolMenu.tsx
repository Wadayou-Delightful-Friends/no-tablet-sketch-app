import type { ToolType } from "../../types/tool";
import { TOOL_ORDER } from "../../types/tool";
import { ToolItem } from "../ToolItem/ToolItem";
import "./ToolMenu.css";

type ToolMenuProps = {
  open: boolean;
  /** 長押し中に指が重なっているツール。指が離れると null に戻る */
  hoverTool: ToolType | null;
};

/**
 * 左上ボタンの下に縦方向へ展開するツール一覧。
 * 表示/非表示・展開アニメーションのみを担当し、
 * ホバー判定や確定処理は useToolSelector 側で行う。
 */
export function ToolMenu({ open, hoverTool }: ToolMenuProps) {
  return (
    <div
      className={`tool-menu${open ? " tool-menu--open" : ""}`}
      aria-hidden={!open}
    >
      {TOOL_ORDER.map((tool) => (
        <ToolItem key={tool} tool={tool} isHovered={hoverTool === tool} />
      ))}
    </div>
  );
}
