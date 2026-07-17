import { ToolButton } from "../../shared/ui/ToolButton/ToolButton";
import { ToolMenu } from "../../shared/ui/ToolMenu/ToolMenu";
import { useToolSelector } from "./useToolSelector";

/**
 * スマートフォン画面に配置する「ツール選択」機能一式。
 * 現在選択中のツール（selectedTool）は将来的に、
 * 実際の描画処理（WebSocket 送信など）へ渡す想定。
 */
export function ToolSelector() {
  const { selectedTool, menuOpen, hoverTool, handlers } = useToolSelector();

  // TODO: selectedTool が変わったタイミングで、
  // PC 側への通知（送信）処理をここに接続する
  void selectedTool;

  return (
    <>
      <ToolButton {...handlers} />
      <ToolMenu open={menuOpen} hoverTool={hoverTool} />
    </>
  );
}
