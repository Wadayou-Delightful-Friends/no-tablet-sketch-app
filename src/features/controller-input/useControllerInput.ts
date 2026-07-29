import { useCallback, useRef, useState } from "react";
import type { PointerEvent } from "react";
import type {
  Command,
  EraseCommand,
  WriteCommand,
} from "../../domain/command/command";
import type { NormalizedPoint } from "../../domain/schema_common/point";
import type { ToolType } from "../../shared/types/tool";

/** 線の太さは座標と違い正規化せず画面 px で送る */
const PEN_RADIUS = 2;
const ERASER_RADIUS = 12;

type StrokeCommandType = WriteCommand["type"] | EraseCommand["type"];

type UseControllerInputParameters = {
  selectedTool: ToolType;
  sendCommand: (command: Command) => void;
};

/**
 * 数値を正規化座標の範囲である 0〜1 に収める。
 *
 * Pointer Capture中に指が入力領域の外へ出た場合でも、送信する座標が
 * Commandの想定範囲を超えないようにするために使用する。
 *
 * @param value 範囲を制限する数値
 * @returns 0〜1に収めた数値
 */
function clampToNormalizedRange(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Pointer Eventの画面座標を、入力領域内の0〜1正規化座標へ変換する。
 *
 * 通常の横画面では左上を原点として座標を割り、CSSで90度回転している
 * 縦画面では軸の入れ替えとY方向の反転を行う。
 *
 * @param event 描画領域で発生したReactのPointer Event
 * @returns 正規化座標。入力領域のサイズを取得できない場合はnull
 */
function getNormalizedPoint(
  event: PointerEvent<HTMLDivElement>,
): NormalizedPoint | null {
  const bounds = event.currentTarget.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) return null;

  const isPortrait = window.matchMedia("(orientation: portrait)").matches;
  if (isPortrait) {
    return {
      x: clampToNormalizedRange((event.clientY - bounds.top) / bounds.height),
      y: clampToNormalizedRange((bounds.right - event.clientX) / bounds.width),
    };
  }

  return {
    x: clampToNormalizedRange((event.clientX - bounds.left) / bounds.width),
    y: clampToNormalizedRange((event.clientY - bounds.top) / bounds.height),
  };
}

/**
 * Controllerのツールを、描画用Commandのtypeへ変換する。
 *
 * resetには対応するCommandがまだ存在しないため、描画入力としては扱わない。
 *
 * @param selectedTool Controllerで選択されているツール
 * @returns writeまたはerase。描画対象外のツールならnull
 */
function getStrokeCommandType(selectedTool: ToolType): StrokeCommandType | null {
  if (selectedTool === "pen") return "write";
  if (selectedTool === "eraser") return "erase";
  return null;
}

/**
 * スマートフォンのPointer入力を正規化し、点単位の描画Commandへ変換する。
 *
 * Controller画面の描画領域で使用し、pointerdownでストロークを開始、
 * pointermoveで同じstroke_idの点を送り、pointerup/cancelで終了する。
 * WebRTCには依存せず、生成したCommandは引数のsendCommandへ渡す。
 *
 * @param parameters selectedToolとCommandの送り先
 * @returns 描画領域へ設定するPointer Eventハンドラ
 */
export function useControllerInput({
  selectedTool,
  sendCommand,
}: UseControllerInputParameters) {
  //const [controllerId] = useState(() => crypto.randomUUID());
  /**
   * ローカルスマホ接続の際は下記のコードのコメントアウトして下記のcontrollerIdをコメントアウトする
   */
 const [controllerId] = useState(
  () => crypto.randomUUID?.() ?? `ctrl-${Math.random().toString(36).slice(2, 10)}`
);
  const commandSequenceRef = useRef(0);
  const strokeSequenceRef = useRef(0);
  const activePointerIdRef = useRef<number | null>(null);
  const activeStrokeIdRef = useRef<string | null>(null);
  const activeCommandTypeRef = useRef<StrokeCommandType | null>(null);

  const sendStrokeCommand = useCallback(
    (
      commandType: StrokeCommandType,
      strokeId: string,
      normalizedPoint: NormalizedPoint,
    ): void => {
      const commandBody = {
        controller_id: controllerId,
        seq: ++commandSequenceRef.current,
        timestamp: Date.now(),
        stroke_id: strokeId,
        radius: commandType === "erase" ? ERASER_RADIUS : PEN_RADIUS,
        point: normalizedPoint,
      };

      const command: WriteCommand | EraseCommand =
        commandType === "erase"
          ? { type: "erase", ...commandBody }
          : { type: "write", ...commandBody };

      sendCommand(command);
    },
    [controllerId, sendCommand],
  );

  const sendReset = useCallback((): void => {
        sendCommand({
          type: "reset",
          controller_id: controllerId,
          seq: ++commandSequenceRef.current,
          timestamp: Date.now(),
        });
      }, [controllerId, sendCommand]);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>): void => {
      if (!event.isPrimary) return;

      const commandType = getStrokeCommandType(selectedTool);
      const normalizedPoint = getNormalizedPoint(event);
      if (commandType === null || normalizedPoint === null) return;

      event.currentTarget.setPointerCapture(event.pointerId);
      activePointerIdRef.current = event.pointerId;
      activeCommandTypeRef.current = commandType;
      activeStrokeIdRef.current = `${controllerId}:${++strokeSequenceRef.current}`;

      sendStrokeCommand(
        commandType,
        activeStrokeIdRef.current,
        normalizedPoint,
      );
    },
    [controllerId, selectedTool, sendStrokeCommand],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>): void => {
      if (activePointerIdRef.current !== event.pointerId) return;

      const commandType = activeCommandTypeRef.current;
      const strokeId = activeStrokeIdRef.current;
      const normalizedPoint = getNormalizedPoint(event);
      if (commandType === null || strokeId === null || normalizedPoint === null) return;

      sendStrokeCommand(commandType, strokeId, normalizedPoint);
    },
    [sendStrokeCommand],
  );

  const handlePointerEnd = useCallback(
    (event: PointerEvent<HTMLDivElement>): void => {
      if (activePointerIdRef.current !== event.pointerId) return;

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      activePointerIdRef.current = null;
      activeStrokeIdRef.current = null;
      activeCommandTypeRef.current = null;
    },
    [],
  );

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerEnd,
    onPointerCancel: handlePointerEnd,
    sendReset,
  };
}