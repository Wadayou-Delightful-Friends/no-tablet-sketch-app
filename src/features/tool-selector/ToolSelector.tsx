import { ToolButton } from "../../shared/ui/ToolButton/ToolButton";
import { ToolMenu } from "../../shared/ui/ToolMenu/ToolMenu";
import { useToolSelector } from "./useToolSelector";
import type { ToolType } from "../../shared/types/tool";

type ToolSelectorProps = {
  onSelectedToolChange?: (selectedTool: ToolType) => void;
};

/**
 * スマートフォン画面に配置する「ツール選択」機能一式。
 * 選択結果をonSelectedToolChangeでControllerの描画入力へ通知する。
 *
 * @param props 選択ツールが変わった時の通知先
 * @returns ツールボタンと選択メニュー
 */
export function ToolSelector({ onSelectedToolChange }: ToolSelectorProps) {
  const { menuOpen, hoverTool, handlers } = useToolSelector(onSelectedToolChange);

  return (
    <>
      <ToolButton {...handlers} />
      <ToolMenu open={menuOpen} hoverTool={hoverTool} />
    </>
  );
}
