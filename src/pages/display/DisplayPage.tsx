import { CanvasSurface } from "../../shared/ui/canvas/CanvasSurface";
import { SelectedToolBadge } from "../../shared/ui/SelectedToolBadge/SelectedToolBadge";
import { useIncomingSelectedTool } from "../../shared/model/selectedTool/useIncomingSelectedTool";
import "./DisplayPage.css";

/**
 * デスクトップ側で表示するページ。
 * 描画エリア（灰色の枠）に加えて、スマホ側で選択中のツールを
 * 枠の左上に表示する（ツールの選択操作自体はスマホ側のみで行う）。
 */
export function DisplayPage() {
  const selectedTool = useIncomingSelectedTool();

  return (
    <main className="display-page">
      <CanvasSurface />
      <SelectedToolBadge tool={selectedTool} />
    </main>
  );
}