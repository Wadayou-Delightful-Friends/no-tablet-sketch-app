import { useState } from "react";
import type { ToolType } from "../../types/tool";

/**
 * PC側（DisplayPage）が「スマホ側で現在選択されているツール」を受け取るためのフック。
 *
 * ============================================================
 * 通信担当の方へ:
 * 現時点では通信処理が未実装のため、常に固定値 "pen" を返すダミー実装です。
 * 実際の通信（WebSocketなど）が繋がったら、このファイルの中身だけを
 * 以下のような形に差し替えてください（呼び出し側の SelectedToolBadge や
 * DisplayPage は一切変更不要です）。
 *
 *   export function useIncomingSelectedTool(): ToolType {
 *     const [changed_tool, setTool] = useState<ToolType>("pen");
 *
 *     useEffect(() => {
 *       const socket = ...; // 既存の接続を利用
 *       const handleMessage = (event: MessageEvent) => {
 *         const data = JSON.parse(event.data);
 *         if (data.type === "tool-changed") {
 *           setTool(data.changed_tool as ToolType);
 *         }
 *       };
 *       socket.addEventListener("message", handleMessage);
 *       return () => socket.removeEventListener("message", handleMessage);
 *     }, []);
 *
 *     return changed_tool;
 *   }
 * ============================================================
 */
export function useIncomingSelectedTool(): ToolType {
  const [tool] = useState<ToolType>("pen");
  return tool;
}
