import { ToolButton } from "../../shared/ui/ToolButton/ToolButton";
import { ToolMenu } from "../../shared/ui/ToolMenu/ToolMenu";
import { HistoryMenu } from "./HistoryMenu";
import { useToolSelector } from "./useToolSelector";
import { useHistoryMenu } from "./useHistoryMenu";
import type { ToolType } from "../../shared/types/tool";

type ToolSelectorProps = {
  onSelectedToolChange?: (selectedTool: ToolType) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onReset?: () => void;
};

export function ToolSelector({ onSelectedToolChange, onUndo, onRedo, onReset }: ToolSelectorProps) {
  // ツール選択（長押し→スライド）。reset はもうここに渡さない
  const { menuOpen: toolMenuOpen, hoverTool, isPressing, handlers: toolHandlers } =
    useToolSelector(onSelectedToolChange);

  // 履歴操作（タップ→メニュー）
  const { menuOpen: historyMenuOpen, iconHandlers, handleActionSelect } =
    useHistoryMenu({ onUndo, onRedo, onReset });

  return (
    <>
      <ToolButton
        onPointerDown={(e) => {
          toolHandlers.onPointerDown(e);
          iconHandlers.onPointerDown(e);
        }}
        onPointerMove={toolHandlers.onPointerMove}
        onPointerUp={(e) => {
          toolHandlers.onPointerUp(e);
          iconHandlers.onPointerUp(e);
        }}
        onPointerCancel={toolHandlers.onPointerCancel}
        isPressing={isPressing}
      />
      <ToolMenu open={toolMenuOpen} hoverTool={hoverTool} />
      <HistoryMenu open={historyMenuOpen} onSelect={handleActionSelect} />
    </>
  );
}