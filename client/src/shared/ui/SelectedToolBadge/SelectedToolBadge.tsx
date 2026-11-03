import type { ToolType } from "../../types/tool";
import { TOOL_ICON_SRC } from "../../assets/toolIcons";
import "./SelectedToolBadge.css";

type SelectedToolBadgeProps = {
  tool: ToolType;
};

/**
 * PC側の描画エリアの枠の左上端に表示する、
 * 現在スマホ側で選択されているツールのアイコン表示。
 *
 * 見た目のみを担当し、tool の値そのものは
 * shared/model/selectedTool/useIncomingSelectedTool から呼び出し側が取得する想定。
 */
export function SelectedToolBadge({ tool }: SelectedToolBadgeProps) {
  return (
    <div className="selected-tool-badge" data-tool={tool}>
      <span
        className="selected-tool-badge__icon"
        style={{
          WebkitMaskImage: `url(${TOOL_ICON_SRC[tool]})`,
          maskImage: `url(${TOOL_ICON_SRC[tool]})`,
        }}
      />
    </div>
  );
}
