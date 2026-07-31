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

/**
 * スマートフォン画面に配置する「ツール選択」機能一式。
 * 選択結果をonSelectedToolChangeでControllerの描画入力へ通知する。
 *
 * @param props 選択ツールが変わった時の通知先
 * @returns ツールボタンと選択メニュー
 */
export function ToolSelector({ onSelectedToolChange, onUndo, onRedo, onReset }: ToolSelectorProps) {
  // ツール選択（長押し→スライド）。reset はもうここに渡さない
  const { menuOpen: toolMenuOpen, hoverTool, handlers: toolHandlers } =
    useToolSelector(onSelectedToolChange);

  // 履歴操作（タップ→メニュー）
  const { menuOpen: historyMenuOpen, iconHandlers, handleActionSelect } =
    useHistoryMenu({ onUndo, onRedo, onReset });

  // 同じパレットアイコンが「長押し」と「タップ」の両方のジェスチャを
  // 受け取る必要があるため、両フックのハンドラを1つの要素にまとめる
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
      />
      <ToolMenu open={toolMenuOpen} hoverTool={hoverTool} />
      <HistoryMenu open={historyMenuOpen} onSelect={handleActionSelect} />
    </>
  );
}