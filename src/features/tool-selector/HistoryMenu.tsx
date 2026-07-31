// src/features/tool-selector/HistoryMenu.tsx
import { HISTORY_ACTION_ORDER } from "../../shared/types/history-action";
import type { HistoryActionType } from "../../shared/types/history-action";
import { HistoryItem } from "../../shared/ui/HistoryItem/HistoryItem";
import "./HistoryMenu.css";

type HistoryMenuProps = {
  open: boolean;
  onSelect: (action: HistoryActionType) => void;
};

/**
 * タップで開く履歴操作（undo/redo/reset）メニュー。
 * ToolMenu と違い、各ボタンは独立して即座にタップに反応する
 * （ドラッグでホバー対象を選ぶ方式ではない）。
 */
export function HistoryMenu({ open, onSelect }: HistoryMenuProps) {
  return (
    <div
      className={`history-menu${open ? " history-menu--open" : ""}`}
      aria-hidden={!open}
    >
      {HISTORY_ACTION_ORDER.map((action) => (
        <HistoryItem key={action} action={action} onSelect={onSelect} />
      ))}
    </div>
  );
}