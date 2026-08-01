import { ToolButton } from "../../shared/ui/ToolButton/ToolButton";
import { ToolMenu } from "../../shared/ui/ToolMenu/ToolMenu";
import { CoachMark } from "../../shared/ui/CoachMark/CoachMark";
import { HistoryMenu } from "./HistoryMenu";
import { useToolSelector } from "./useToolSelector";
import { useHistoryMenu } from "./useHistoryMenu";
import { useCoachMark } from "./useCoachMark"
import type { ToolType } from "../../shared/types/tool";

type ToolSelectorProps = {
  onSelectedToolChange?: (selectedTool: ToolType) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onReset?: () => void;
};

const COACH_MARK_MESSAGE = "長押しでツール切り替え、\nタップで履歴操作";

export function ToolSelector({ onSelectedToolChange, onUndo, onRedo, onReset }: ToolSelectorProps) {
  // ツール選択（長押し→スライド）。reset はもうここに渡さない
  const { menuOpen: toolMenuOpen, hoverTool, isPressing, handlers: toolHandlers } =
    useToolSelector(onSelectedToolChange);

  // 履歴操作（タップ→メニュー）
  const { menuOpen: historyMenuOpen, iconHandlers, handleActionSelect } =
    useHistoryMenu({ onUndo, onRedo, onReset });

  // 初回だけ表示するコーチマーク
  const { visible: coachMarkVisible, dismiss: dismissCoachMark } = useCoachMark();

  return (
    <>
      <ToolButton
        onPointerDown={(e) => {
          // HistoryMenu（undo/redo/reset）表示中は長押しでツールメニューを開かないようにする
          if (!historyMenuOpen) {
            toolHandlers.onPointerDown(e);
          }
          iconHandlers.onPointerDown(e);
        }}
        onPointerMove={(e) => {
          if(!historyMenuOpen) {
            toolHandlers.onPointerMove(e);
          }
        }}
        onPointerUp={(e) => {
          if (!historyMenuOpen) {
            toolHandlers.onPointerUp(e);
          }
          iconHandlers.onPointerUp(e);
        }}
        onPointerCancel={(e) => {
          if (!historyMenuOpen) {
            toolHandlers.onPointerCancel();
          }
        }}
        isPressing={isPressing}
      />
      <ToolMenu open={toolMenuOpen} hoverTool={hoverTool} />
      <HistoryMenu open={historyMenuOpen} onSelect={handleActionSelect} />
      {coachMarkVisible && (
        <CoachMark message={COACH_MARK_MESSAGE} onDismiss={dismissCoachMark} />
      )}
    </>
  );
}