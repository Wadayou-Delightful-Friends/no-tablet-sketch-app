import { useState, useEffect, useCallback, useRef } from "react";
import { CanvasSurface } from "../../shared/ui/canvas/CanvasSurface";
import { useSketchCanvas } from "../../features/sketch/useSketchCanvas";
//import { SelectedToolBadge } from "../../shared/ui/SelectedToolBadge/SelectedToolBadge";
import { TOOL_ICON_SRC } from "../../shared/assets/toolIcons";
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

/** カーソルのタイムアウト表示を反映するための再描画間隔 */
const CURSOR_REFRESH_MS = 1000;

/** 接続中の Controller ごとの表示状態（配列で持つことで接続順を保つ） */
type ControllerState = {
  id: string;
  tool: ToolType;
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

   const peerToControllerRef = useRef(new Map<string, string>());
  /**
   * 受信メッセージから Controller の状態を更新する。
   * 座標コマンドは高頻度で届くため、ツールが変わったときだけ配列を作り直し、
   * それ以外は同じ配列を返して再レンダリング（＝canvas の巻き込み再描画）を防ぐ。
   */
  const updateController = useCallback(
    (id: string, changedTool: ToolType | null) => {
      setControllers((prev) => {
        const found = prev.find((c) => c.id === id);

        // 初めて見る Controller は末尾に追加する（＝接続順に並ぶ）
        if (!found) {
          return [...prev, { id, tool: changedTool ?? "pen" }];
        }
        // ツールが変わったときだけ、その Controller の状態を差し替える
        if (changedTool !== null && found.tool !== changedTool) {
          return prev.map((c) => (c.id === id ? { ...c, tool: changedTool } : c));
        }
        return prev;
      });
    },
    [],
  );


  /**
   * renderer 側のカーソルは「一定時間動きがなければ描かない」判定を持つが、
   * immediate mode ではコマンドが来ないと再描画されず、判定が画面に反映されない。
   * そのため定期的に再描画だけを走らせる（handleResize は render(scene) を呼ぶ）。
   */
  useEffect(() => {
    const timer = window.setInterval(handleResize, CURSOR_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [handleResize]);

  // セッションの生成はページの責務。受信を描画へ繋ぐ配線もここで行う
  useEffect(() => {
    const { receiver } = startDisplay(
      (id) => setRoomId(id),        // サーバーが部屋発行 → QR表示
      () => setIsConnected(true),   // スマホ接続 → モーダルを閉じる
      (peerId) => {                 // スマホ切断 → その行を消す
        const controllerId = peerToControllerRef.current.get(peerId);
        if (controllerId === undefined) return;
        peerToControllerRef.current.delete(peerId);
        setControllers((prev) => prev.filter((c) => c.id !== controllerId));
      },
    );

    // 係①: 描画コマンドを canvas へ流す
    receiver.onMessage(handleRemoteMessage);

    // 係②: Controller ごとのツール状態を追う
    receiver.onMessage((peerId, msg) => {
      const m = msg as {
        type?: string;
        changed_tool?: ToolType;
        controller_id?: string;
      };
      const id = m?.controller_id;
      if (!id) return;

      // 切断時に引けるよう peerId と controller_id の対応を控える
      peerToControllerRef.current.set(peerId, id);

      const changedTool =
        m.type === "tool-changed" && m.changed_tool ? m.changed_tool : null;
      updateController(id, changedTool);
    });
  }, [handleRemoteMessage, updateController]);


  return (
    <main className="display-page">
      <CanvasSurface ref={canvasRef} onResize={handleResize} />

      {/* 接続中の Controller を、接続順に縦へ並べる */}
      {/* 接続中の Controller をまとめて表示するパネル */}
{controllers.length > 0 && (
  <div
    style={{
      position: "absolute",
      top: 5,
      left: 3,
      zIndex: 30,
      display: "flex",
      flexDirection: "column",
      gap: 6,
      padding: 6,
      borderRadius: 10,
      background: "rgba(30, 30, 30, 0.75)",
      backdropFilter: "blur(4px)",       // 背景をぼかして浮いて見せる
      pointerEvents: "none",
      transition: "all 200ms ease",      // 伸縮を滑らかに
    }}
  >
    {controllers.map((c) => (
      <div
        key={c.id}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          height: 38,
          transition: "opacity 200ms ease",
        }}
      >
        {/* アイコン（丸） */}
        <span
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: "rgba(60, 60, 60, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              width: 22,
              height: 22,
              backgroundColor: "#fff" ,
              WebkitMaskImage: `url(${TOOL_ICON_SRC[c.tool]})`,
              maskImage: `url(${TOOL_ICON_SRC[c.tool]})`,
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              WebkitMaskPosition: "center",
              maskPosition: "center",
              WebkitMaskSize: "contain",
              maskSize: "contain",
            }}
          />
        </span>

        {/* 名前とツール名 */}
        <span style={{ fontSize: 13, fontWeight: 700, color: colorForController(c.id) }}>
          {labelForController(c.id)}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#ef6f6f", paddingRight: 6 }}>
          {TOOL_LABEL[c.tool]}
        </span>
      </div>
    ))}
  </div>
)}

      {roomId && !isConnected && <QrConnectModal roomId={roomId} />}
      <QrButton isConnected={isConnected} onToggle={() => setIsConnected((p) => !p)} />
    </main>
  );
}