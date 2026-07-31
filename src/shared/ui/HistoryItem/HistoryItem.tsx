// src/shared/ui/HistoryItem/HistoryItem.tsx
import type { HistoryActionType } from "../../types/history-action";
import { HISTORY_ACTION_ICON_SRC } from "../../assets/toolIcons";
import "./HistoryItem.css";

type HistoryItemProps = {
  action: HistoryActionType;
  onSelect: (action: HistoryActionType) => void;
};

/**
 * 履歴メニュー1項目分のボタン。ToolItem と違い、ドラッグでホバー対象を
 * 判定する必要がない（タップした項目がそのまま選択対象になるため）。
 * 赤色化は isHovered を JS で計算せず、CSS の :active 疑似クラスに任せる。
 */
export function HistoryItem({ action, onSelect }: HistoryItemProps) {
  return (
    <button
      type="button"
      className="history-item"
      aria-label={action}
      onClick={() => onSelect(action)}
    >
      <span
        className="history-item__icon"
        style={{
          WebkitMaskImage: `url(${HISTORY_ACTION_ICON_SRC[action]})`,
          maskImage: `url(${HISTORY_ACTION_ICON_SRC[action]})`,
        }}
      />
    </button>
  );
}