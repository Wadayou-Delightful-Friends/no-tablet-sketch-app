import { ToolSelector } from "../../features/tool-selector/ToolSelector";
import { DrawingAreaFrame } from "../../shared/ui/DrawingAreaFrame/DrawingAreaFrame";
import "./ControllerPage.css";

/**
 * スマートフォン側で表示するページ。
 * 現時点ではツール選択 UI のみを配置する。
 */
export function ControllerPage() {
  return (
    <div className="controller-page">
      <DrawingAreaFrame />
      <ToolSelector />
    </div>
  );
}
