import { useCallback, useEffect, useRef, useState } from "react";
import type { Command } from "../../domain/command/command";
import { useControllerInput } from "../../features/controller-input/useControllerInput";
import { startController } from "../../features/session/controller-session";
import { ToolSelector } from "../../features/tool-selector/ToolSelector";
import { DrawingAreaFrame } from "../../shared/ui/DrawingAreaFrame/DrawingAreaFrame";
import { LandscapeLock } from "../../shared/ui/LandscapeLock/LandscapeLock";
import type { ToolType } from "../../shared/types/tool";
import "./ControllerPage.css";

/**
 * スマートフォン側で表示するページ。
 * 端末の向きに関わらず常に横画面のレイアウトで開始する。
 */
export function ControllerPage() {
  //URLから部屋をもらいにいく
  const roomId = new URLSearchParams(location.search).get("room");

  //現在選択しているツール
  const [selectedTool, setSelectedTool] = useState<ToolType>("pen");
  const sendDrawRef = useRef<(message: unknown) => void>(() => {});

  // `ControllerPage` 自体でも向きを検知してクラス名を切り替える
  const [isPortrait, setIsPortrait] = useState(
    () => window.matchMedia("(orientation: portrait)").matches
  );

  useEffect(() => {
    const mql = window.matchMedia("(orientation: portrait)");
    const handleChange = () => setIsPortrait(mql.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  //roomIdの値が変更した瞬間実行されるが理論上はURLから読み取るため一回しか実行されない。
  useEffect(() => {
    if (!roomId) return;
    const { sendDraw } = startController(roomId);
    sendDrawRef.current = sendDraw;
  }, [roomId]);

  //使い回しができるようにsenderを保存しておく。この場合currentにはsenderが入る。
  const sendCommand = useCallback((command: Command): void => {
    sendDrawRef.current(command);
  }, []);

  const handleSelectedToolChange = useCallback((tool: ToolType) => {
    setSelectedTool(tool);
    // Command型（write/erase/move/zoom/reset）とは別の種類のメッセージだが、
    // 送信の窓口（sendDrawRef.current）は「何でも送れる」作りなので、
    // 新しい type を持たせるだけでそのまま送れる
    sendDrawRef.current({ type: "tool-changed", changed_tool: tool });
  }, []);

  const pageClassName = isPortrait
    ? "controller-page controller-page--portrait-lock"
    : "controller-page";

  const { sendReset, ...inputHandlers } = useControllerInput({
    selectedTool,
    sendCommand,
  });

  if (!roomId) return <p>QRコードから開いてください</p>;

  return (
    <LandscapeLock>
      <div className={pageClassName}>
        <DrawingAreaFrame {...inputHandlers} />
        <ToolSelector
          onSelectedToolChange={handleSelectedToolChange}
          onReset={sendReset}
        />
      </div>
    </LandscapeLock>
  );
}