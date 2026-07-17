import { ToolSelector } from "../../features/tool-selector/ToolSelector";
import { DrawingAreaFrame } from "../../shared/ui/DrawingAreaFrame/DrawingAreaFrame";
import { LandscapeLock } from "../../shared/ui/LandscapeLock/LandscapeLock";
import "./ControllerPage.css";

/**
 * スマートフォン側で表示するページ。
 * 端末の向きに関わらず常に横画面のレイアウトで開始する。
 */
export function ControllerPage() {
  return (
    <LandscapeLock>
      <div className="controller-page">
        <DrawingAreaFrame />
        <ToolSelector />
      </div>
    </LandscapeLock>
  );
}

