import { useState, useEffect, useRef, useCallback } from "react";
import { CanvasSurface } from "../../shared/ui/canvas/CanvasSurface";
import { useSketchCanvas } from "../../features/sketch/useSketchCanvas";
import { SelectedToolBadge } from "../../shared/ui/SelectedToolBadge/SelectedToolBadge";
import { QrConnectModal } from "../../shared/ui/QrConnectModal/QrConnectModal";
import { startDisplay } from "../../features/session/display-session";
import { QrButton } from "../../shared/ui/QrConnectModal/QRButton";
import "./DisplayPage.css";
import type { ToolType } from "../../shared/types/tool";
import type { Command } from "../../domain/command/command";

const TOOL_LABEL: Record<ToolType, string> = {
  pen: "ペン",
  eraser: "消しゴム",
};

/**
+  * 受信した最後のコマンド種別の表示名。
+  * write/erase は選択中ツールのラベル（TOOL_LABEL）と隣り合わせて表示するため
+  * 「描画中」「消去中」という進行形にし、pen/eraser と意味が重複しないようにする。
+  */
const COMMAND_TYPE_LABEL: Record<Command["type"], string> = {
  write: "描画中",
  erase: "消去中",
  move: "移動/拡大縮小",
  zoom: "移動/拡大縮小",
  reset: "リセット",
  undo: "元に戻す",
  redo: "やり直す",
};

/**
 * デスクトップ側で表示するページ。
 * 描画エリア（灰色の枠）に加えて、スマホ側で選択中のツールを
 * 枠の左上に表示する（ツールの選択操作自体はスマホ側のみで行う）。
 */
export function DisplayPage() {
  // 追加: canvas の ref・リサイズ時の再描画ハンドラ・遠隔コマンドの入力口を受け取る
  const { canvasRef, handleResize, handleRemoteMessage } = useSketchCanvas();
  const [selectedTool, setSelectedTool] = useState<ToolType>("pen");

  const [lastCommandType, setLastCommandType] = useState<Command["type"] | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const lastCommandTimerRef = useRef<number | null>(null);

  /**
   * zoom/move はドラッグ中に大量のコマンドが連続して届くため、
   * 受信の都度そのまま表示すると一瞬で他の種別に上書きされ視認できない。
   * そこで最後に更新されてから一定時間は表示を保持し、経過したら消す
   * （タイマー式。表示中に同種別が続けば毎回タイマーを延長する）。
   */
  const HOLD_MS = 1000;

  const showCommandType = useCallback((type: Command["type"]) => {
    setLastCommandType(type);
    if (lastCommandTimerRef.current !== null) {
      window.clearTimeout(lastCommandTimerRef.current);
    }
    lastCommandTimerRef.current = window.setTimeout(() => {
      setLastCommandType(null);
      lastCommandTimerRef.current = null;
    }, HOLD_MS);
  }, []);


  // セッションの生成はページの責務。受信を描画へ繋ぐ配線もここで行う
  /**
   * useEffectは理論上最初に一回しか実行されない
   * receiverが信号を感知したらhandleRemoteMessageが動きcanvasへの描画が行われる。
   */
  useEffect(() => {
    const { receiver } = startDisplay(
      (id) => setRoomId(id),        // サーバーが部屋発行 → QR表示
      () => setIsConnected(true),   // スマホ接続 → モーダルを閉じる
    );
    receiver.onMessage(handleRemoteMessage);

    receiver.onMessage((_peerId, msg) => {
    const m = msg as { type?: string; changed_tool?: ToolType };

    if (m?.type && m.type in COMMAND_TYPE_LABEL) {
      showCommandType(m.type as Command["type"]);
    }

    if (m?.type === "tool-changed" && m.changed_tool) setSelectedTool(m.changed_tool);
  });

  }, [handleRemoteMessage, showCommandType]);

  // アンマウント時にタイマーが残らないようにする
  useEffect(() => {
    return () => {
      if (lastCommandTimerRef.current !== null) {
        window.clearTimeout(lastCommandTimerRef.current);
      }
    };
  }, []);

  /**
    * write/erase は選択中ツールと矛盾する組み合わせでは表示しない。
    * 例: 消しゴムで描いた直後にペンへ切り替えると、lastCommandType はまだ
    * "erase" のままになり、ツール表示は「ペン」なのに右側が「消去中」のまま
    * 残ってしまう。この食い違いを避けるため write/erase だけツールと突き合わせる
    * （move/zoom/reset/undo/redo はツールに依存しないため常に表示する）。
    */
  const isCommandTypeVisible =
    lastCommandType !== null &&
    (lastCommandType !== "write" && lastCommandType !== "erase"
      ? true
      : (lastCommandType === "write" && selectedTool === "pen") ||
        (lastCommandType === "erase" && selectedTool === "eraser"));

  return (
    <main className="display-page">
      <CanvasSurface ref={canvasRef} onResize={handleResize} />
      <SelectedToolBadge tool={selectedTool} />

      <div
        style={{
          position: "absolute",
          top: 5,
          left: 46, // SelectedToolBadge（left:3px + width:38px）の右に並べる
          zIndex: 20,
          maxWidth: 120,
          padding: "4px 10px",
          borderRadius: 6,
          background: "rgba(60, 60, 60, 0.7)",
          display: "flex",
          alignItems: "center",
          pointerEvents: "none",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: "#ef6f6f" }}>
          {TOOL_LABEL[selectedTool]}
        </span>
        <span
          style={{
            fontSize: 12,
            color: "#8a8a8a",
            opacity: isCommandTypeVisible && lastCommandType ? 1 : 0,
            transition: "opacity 150ms ease",
          }}
        >
          |
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "#c9c9c9",
            opacity: isCommandTypeVisible && lastCommandType ? 1 : 0,
            transition: "opacity 150ms ease",
          }}
        >
          {lastCommandType ? COMMAND_TYPE_LABEL[lastCommandType] : ""}
        </span>
      </div>
        
      
     {roomId && !isConnected && (
      <QrConnectModal roomId={roomId} />
    )}
    <QrButton isConnected= {isConnected}  onToggle= {() => setIsConnected((p) => !p)}/>

    </main>
  );
}