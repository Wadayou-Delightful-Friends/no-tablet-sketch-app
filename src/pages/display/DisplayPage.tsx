import { useState, useEffect, useCallback } from "react";
import { CanvasSurface } from "../../shared/ui/canvas/CanvasSurface";
import { useSketchCanvas } from "../../features/sketch/useSketchCanvas";
import { SelectedToolBadge } from "../../shared/ui/SelectedToolBadge/SelectedToolBadge";
import { QrConnectModal } from "../../shared/ui/QrConnectModal/QrConnectModal";
import { QrButton } from "../../shared/ui/QrConnectModal/QRButton";
import { startDisplay } from "../../features/session/display-session";
import { labelForController, colorForController } from "../../shared/utils/controller-color";
import type { ToolType } from "../../shared/types/tool";
import "./DisplayPage.css";

const TOOL_LABEL: Record<ToolType, string> = {
  pen: "ペン",
  eraser: "消しゴム",
};

/** 接続中の Controller ごとの表示状態（配列で持つことで接続順を保つ） */
type ControllerState = {
  id: string;
  tool: ToolType;
  lastSeen: number;
};

/**
 * デスクトップ側で表示するページ。
 * 接続している Controller ごとに「アイコン・ユーザー名・ツール名」を
 * 左上へ縦に並べる（ツールの選択操作自体はスマホ側のみで行う）。
 */
export function DisplayPage() {
  const { canvasRef, handleResize, handleRemoteMessage } = useSketchCanvas();
  const [controllers, setControllers] = useState<ControllerState[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  /**
   * 受信メッセージから Controller の状態を更新する。
   * 座標コマンドは高頻度で届くため、変化がない場合は同じ配列を返して
   * 再レンダリング（＝canvas の巻き込み再描画）を起こさないようにする。
   */
 const updateController = useCallback((id: string, changedTool: ToolType | null) => {
  const now = Date.now();
  setControllers((prev) => {
    const found = prev.find((c) => c.id === id);
    if (!found) {
      return [...prev, { id, tool: changedTool ?? "pen", lastSeen: now }];
    }
    // ツール変更 or 一定時間経過していれば更新（毎回更新すると再レンダリングが多発する）
    const toolChanged = changedTool !== null && found.tool !== changedTool;
    const staleEnough = now - found.lastSeen > 1000;
    if (!toolChanged && !staleEnough) return prev;

    return prev.map((c) =>
      c.id === id ? { ...c, tool: changedTool ?? c.tool, lastSeen: now } : c
    );
  });
}, []);

// カーソルのタイムアウトを反映するため、定期的に再描画する
useEffect(() => {
  const timer = window.setInterval(() => {
    handleResize();   // 中で renderer.render(scene) を呼ぶので流用できる
  }, 60000);
  return () => window.clearInterval(timer);
}, [handleResize]);

/** この時間コマンドが来なければ、切断したとみなしてタグを消す */
const CONTROLLER_TIMEOUT_MS = 60000;

useEffect(() => {
  const timer = window.setInterval(() => {
    const limit = Date.now() - CONTROLLER_TIMEOUT_MS;
    setControllers((prev) => {
      const alive = prev.filter((c) => c.lastSeen >= limit);
      return alive.length === prev.length ? prev : alive;   // 変化なければ同じ配列
    });
  }, 2000);   // 2秒ごとにチェック

  return () => window.clearInterval(timer);
}, []);



  // セッションの生成はページの責務。受信を描画へ繋ぐ配線もここで行う
  useEffect(() => {
    const { receiver } = startDisplay(
      (id) => setRoomId(id),        // サーバーが部屋発行 → QR表示
      () => setIsConnected(true),   // スマホ接続 → モーダルを閉じる
    );

    // 係①: 描画コマンドを canvas へ流す
    receiver.onMessage(handleRemoteMessage);

    // 係②: Controller ごとのツール状態を追う
    receiver.onMessage((_peerId, msg) => {
      const m = msg as {
        type?: string;
        changed_tool?: ToolType;
        controller_id?: string;
      };
      const id = m?.controller_id;
      if (!id) return;

      const changedTool =
        m.type === "tool-changed" && m.changed_tool ? m.changed_tool : null;
      updateController(id, changedTool);
    });
  }, [handleRemoteMessage, updateController]);

  return (
    <main className="display-page">
      <CanvasSurface ref={canvasRef} onResize={handleResize} />

      {/* 接続中の Controller を、接続順に縦へ並べる */}
      {controllers.map((c, index) => (
        <div
          key={c.id}
          style={{
            position: "absolute",
            top: index * 46,   // バッジ38px + 間隔8px
            left: 0,           // バッジ自身が left:3px を持つため 0 でよい
            zIndex: 30,
            pointerEvents: "none",
          }}
        >
          <SelectedToolBadge tool={c.tool} />

          <div
            style={{
              position: "absolute",
              top: 5,
              left: 46,        // バッジ（left:3px + width:38px）の右隣
              height: 38,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0 10px",
              borderRadius: 6,
              background: "rgba(60, 60, 60, 0.7)",
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: colorForController(c.id),
              }}
            >
              {labelForController(c.id)}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#ef6f6f" }}>
              {TOOL_LABEL[c.tool]}
            </span>
          </div>
        </div>
      ))}

      {roomId && !isConnected && <QrConnectModal roomId={roomId} />}
      <QrButton isConnected={isConnected} onToggle={() => setIsConnected((p) => !p)} />
    </main>
  );
}