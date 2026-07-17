import type { ComponentType } from "react";
import type { ToolType } from "../../types/tool";
import "./ToolItem.css";

/** ペンアイコン（斜めの鉛筆） */
function PenIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

/** 消しゴムアイコン */
function EraserIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 21H8l-6.5-6.5a2 2 0 0 1 0-2.828l9-9a2 2 0 0 1 2.828 0l6.5 6.5a2 2 0 0 1 0 2.828L13 19" />
      <path d="M17.5 12.5 9.5 4.5" />
    </svg>
  );
}

/** リセットアイコン（点線の四角） */
function ResetIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 3" />
    </svg>
  );
}

const ICONS: Record<ToolType, ComponentType> = {
  pen: PenIcon,
  eraser: EraserIcon,
  reset: ResetIcon,
};

type ToolItemProps = {
  tool: ToolType;
  /** 現在ホバー中（指が重なっている）かどうか */
  isHovered: boolean;
};

/**
 * ペン・消しゴム・リセットのうち 1 個分のアイコン表示専用コンポーネント。
 * タッチ/ポインターイベントは親（ToolButton 側）で一括管理しているため、
 * このコンポーネント自体はイベントを持たない（見た目のみ）。
 */
export function ToolItem({ tool, isHovered }: ToolItemProps) {
  const Icon = ICONS[tool];

  return (
    <div
      className={`tool-item${isHovered ? " tool-item--active" : ""}`}
      data-tool={tool}
    >
      <Icon />
    </div>
  );
}
