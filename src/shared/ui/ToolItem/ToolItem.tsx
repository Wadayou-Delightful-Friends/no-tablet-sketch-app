import type { ToolType } from "../../types/tool";
import penIcon from "./icons/pen.png";
import eraserIcon from "./icons/eraser.png";
import resetIcon from "./icons/reset.png";
import "./ToolItem.css";

const ICON_SRC: Record<ToolType, string> = {
  pen: penIcon,
  eraser: eraserIcon,
  reset: resetIcon,
};

type ToolItemProps = {
  tool: ToolType;
  /** 現在ホバー中（指が重なっている）かどうか */
  isHovered: boolean;
};

/**
 * ペン・消しゴム・リセットのうち 1 個分のアイコン表示専用コンポーネント。
 * タッチ/ポインターイベントは親（ToolButton 側）で一括管理しているため、
 * このコンポーネント自体はイベントを持たない（見た目のみ）。
 */
export function ToolItem({ tool, isHovered }: ToolItemProps) {
  return (
    <div
      className={`tool-item${isHovered ? " tool-item--active" : ""}`}
      data-tool={tool}
    >
      <span
        className="tool-item__icon"
        style={{
          WebkitMaskImage: `url(${ICON_SRC[tool]})`,
          maskImage: `url(${ICON_SRC[tool]})`,
        }}
      />
    </div>
  );
}
