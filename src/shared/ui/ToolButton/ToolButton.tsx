import type { PointerEvent } from "react";
import "./ToolButton.css";

/** パレットアイコン（初期状態の丸ボタンに表示） */
function PaletteIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 1 0 10 10c0-1.1-.9-2-2-2h-2.32a2 2 0 0 1-1.64-3.15c.28-.4.44-.87.44-1.35A3.5 3.5 0 0 0 12.62 2H12Z" />
      <circle cx="7.5" cy="10.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="11" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="15" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

type ToolButtonProps = {
  onPointerDown: (e: PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (e: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (e: PointerEvent<HTMLButtonElement>) => void;
  onPointerCancel: (e: PointerEvent<HTMLButtonElement>) => void;
};

/**
 * 画面左上に常時表示される丸ボタン。
 * 長押し + 上下スライドによるツール選択の起点となる唯一の操作対象。
 *
 * touch-action: none を指定し、長押し中にブラウザのスクロール/
 * コンテキストメニューが割り込まないようにしている。
 */
export function ToolButton({
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: ToolButtonProps) {
  return (
    <button
      type="button"
      className="tool-button"
      aria-label="ツールメニューを開く（長押し）"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <PaletteIcon />
    </button>
  );
}
