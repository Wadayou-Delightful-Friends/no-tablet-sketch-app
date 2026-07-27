import { useCallback, useEffect, useRef, useState } from "react";
import type { Command } from "../../domain/command/command";
import { useControllerInput } from "../../features/controller-input/useControllerInput";
import { startController } from "../../features/session/controller-session";
import { ToolSelector } from "../../features/tool-selector/ToolSelector";
import { DrawingAreaFrame } from "../../shared/ui/DrawingAreaFrame/DrawingAreaFrame";
import { LandscapeLock } from "../../shared/ui/LandscapeLock/LandscapeLock";
import type { ToolType } from "../../shared/types/tool";
import "./ControllerPage.css";

/** QRコードからroom IDを受け取る実装が入るまで、既存の通信サンプルと同じ部屋を使う。 */
//const TEMPORARY_ROOM_ID = "test-room";

/**
 * スマートフォン側で表示するページ。
 * 端末の向きに関わらず常に横画面のレイアウトで開始する。
 */
export function ControllerPage() {
  const roomId = new URLSearchParams(location.search).get("room"); 
  const [selectedTool, setSelectedTool] = useState<ToolType>("pen");
  const sendDrawRef = useRef<(message: unknown) => void>(() => {});

  useEffect(() => {
    const { sendDraw } = startController(roomId);
    sendDrawRef.current = sendDraw;
  }, [roomId]);

  const sendCommand = useCallback((command: Command): void => {
    sendDrawRef.current(command);
  }, []);

  const inputHandlers = useControllerInput({ selectedTool, sendCommand });

  if (!roomId) return <p>QRコードから開いてください</p>;

  return (
    <LandscapeLock>
      <div className="controller-page">
        <DrawingAreaFrame {...inputHandlers} />
        <ToolSelector onSelectedToolChange={setSelectedTool} />
      </div>
    </LandscapeLock>
  );
}
