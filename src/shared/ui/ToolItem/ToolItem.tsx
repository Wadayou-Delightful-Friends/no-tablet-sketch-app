// src/shared/ui/ToolItem/ToolItem.tsx
import type { ToolType } from "../../types/tool";
import { TOOL_ICON_SRC } from "../../assets/toolIcons";
import "./ToolItem.css";

type ToolItemProps = {
  tool: ToolType;
  /** 現在ホバー中（指が重なっている）かどうか */
  isHovered: boolean;
};

export function ToolItem({ tool, isHovered }: ToolItemProps) {
  return (
    <div
      className={`tool-item${isHovered ? " tool-item--active" : ""}`}
      data-tool={tool}
    >
      <span
        className="tool-item__icon"
        style={{
          WebkitMaskImage: `url(${TOOL_ICON_SRC[tool]})`,
          maskImage: `url(${TOOL_ICON_SRC[tool]})`,
        }}
      />
    </div>
  );
}