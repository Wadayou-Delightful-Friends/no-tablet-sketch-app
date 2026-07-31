import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import type {
  Command,
  EraseCommand,
  MoveCommand,
  WriteCommand,
  ZoomCommand,
} from "../../domain/command/command";
import type { NormalizedPoint } from "../../domain/schema_common/point";
import type { ToolType } from "../../shared/types/tool";
import {
  calculatePinchZoomFactor,
  getTwoFingerGestureSnapshot,
} from "./twoFingerGesture";
import type {
  ControllerPointerPosition,
  TwoFingerGestureSnapshot,
} from "./twoFingerGesture";

/** 線の太さは座標と違い正規化せず画面 px で送る */
const PEN_RADIUS = 2;
const ERASER_RADIUS = 12;
/** 一本指の描画か二本指の移動かを判定するため、描画Commandを保留する時間 */
const TOUCH_GESTURE_DECISION_MS = 80;

type StrokeCommandType = WriteCommand["type"] | EraseCommand["type"];
type GestureMode =
  | "idle"
  | "single-pointer"
  | "drawing"
  | "transforming"
  | "waiting-for-release";

type ActiveStroke = {
  pointerId: number;
  commandType: StrokeCommandType;
  strokeId: string | null;
  bufferedPoints: NormalizedPoint[];
};

type TwoFingerGestureState = {
  pointerIds: readonly [number, number];
  previousSnapshot: TwoFingerGestureSnapshot;
  lastSentZoomDistancePx: number;
};

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
 * Pointer Eventから、Command用の正規化座標と距離計算用の画面座標を取得する。
 *
 * 正規化座標は送信するCommandに使い、client座標は端末上の指間距離を
 * 縦横比の影響なく計算するために使う。
 *
 * @param event 描画領域で発生したReactのPointer Event
 * @returns 正規化座標とCSS px座標。入力領域のサイズを取得できない場合はnull
 */
function getControllerPointerPosition(
  event: PointerEvent<HTMLDivElement>,
): ControllerPointerPosition | null {
  const normalizedPoint = getNormalizedPoint(event);
  if (normalizedPoint === null) return null;

  return {
    normalizedPoint,
    clientPoint: {
      x: event.clientX,
      y: event.clientY,
    },
  };
}

/**
 * Controllerのツールを、描画用Commandのtypeへ変換する。
 *
 * reset / undo / redoはストローク操作ではないため、描画入力としては扱わない。
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
 * スマートフォンのPointer入力を正規化し、描画・移動・拡大縮小Commandへ変換する。
 *
 * 一本指ではwrite/erase、二本指では中点差からmove、指間距離の比からzoomを生成する。
 * 二本指から一本指へ戻った直後は誤描画を防ぐため、全指が離れるまで待機する。
 * WebRTCには依存せず、生成したCommandは引数のsendCommandへ渡す。
 *
 * @param parameters selectedToolとCommandの送り先
 * @returns 描画領域へ設定するPointer Eventハンドラ
 */
export function useControllerInput({
  selectedTool,
  sendCommand,
}: UseControllerInputParameters) {
  const [controllerId] = useState(
    () =>
      crypto.randomUUID?.() ??
      `ctrl-${Math.random().toString(36).slice(2, 10)}`,
  );
  const commandSequenceRef = useRef(0);
  const strokeSequenceRef = useRef(0);
  const activePointersRef = useRef(
    new Map<number, ControllerPointerPosition>(),
  );
  const gestureModeRef = useRef<GestureMode>("idle");
  const activeStrokeRef = useRef<ActiveStroke | null>(null);
  const twoFingerGestureStateRef = useRef<TwoFingerGestureState | null>(null);
  const strokeDecisionTimerRef = useRef<number | null>(null);

  const clearStrokeDecisionTimer = useCallback((): void => {
    if (strokeDecisionTimerRef.current === null) return;
    window.clearTimeout(strokeDecisionTimerRef.current);
    strokeDecisionTimerRef.current = null;
  }, []);

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

  const confirmPendingStroke = useCallback((): void => {
    clearStrokeDecisionTimer();
    const activeStroke = activeStrokeRef.current;
    if (
      gestureModeRef.current !== "single-pointer" ||
      activeStroke === null
    ) {
      return;
    }

    activeStroke.strokeId =
      activeStroke.strokeId ??
      `${controllerId}:${++strokeSequenceRef.current}`;
    gestureModeRef.current = "drawing";

    for (const point of activeStroke.bufferedPoints) {
      sendStrokeCommand(
        activeStroke.commandType,
        activeStroke.strokeId,
        point,
      );
    }
    activeStroke.bufferedPoints = [];
  }, [clearStrokeDecisionTimer, controllerId, sendStrokeCommand]);

  const scheduleStrokeConfirmation = useCallback((): void => {
    clearStrokeDecisionTimer();
    strokeDecisionTimerRef.current = window.setTimeout(() => {
      strokeDecisionTimerRef.current = null;
      confirmPendingStroke();
    }, TOUCH_GESTURE_DECISION_MS);
  }, [clearStrokeDecisionTimer, confirmPendingStroke]);

  useEffect(
    () => () => {
      clearStrokeDecisionTimer();
    },
    [clearStrokeDecisionTimer],
  );

  const sendMoveCommand = useCallback(
    (delta: NormalizedPoint): void => {
      if (delta.x === 0 && delta.y === 0) return;

      const command: MoveCommand = {
        type: "move",
        controller_id: controllerId,
        seq: ++commandSequenceRef.current,
        timestamp: Date.now(),
        delta,
      };
      sendCommand(command);
    },
    [controllerId, sendCommand],
  );

  const sendZoomCommand = useCallback(
    (anchor: NormalizedPoint, factor: number): void => {
      if (!Number.isFinite(factor) || factor <= 0 || factor === 1) return;

      const command: ZoomCommand = {
        type: "zoom",
        controller_id: controllerId,
        seq: ++commandSequenceRef.current,
        timestamp: Date.now(),
        anchor,
        factor,
      };
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

  const startTwoFingerGesture = useCallback((): void => {
    const pointers = Array.from(activePointersRef.current.entries());
    if (pointers.length < 2) return;

    clearStrokeDecisionTimer();
    activeStrokeRef.current = null;

    const [firstPointerId, firstPointerPosition] = pointers[0];
    const [secondPointerId, secondPointerPosition] = pointers[1];
    const initialSnapshot = getTwoFingerGestureSnapshot(
      firstPointerPosition,
      secondPointerPosition,
    );
    twoFingerGestureStateRef.current = {
      pointerIds: [firstPointerId, secondPointerId],
      previousSnapshot: initialSnapshot,
      lastSentZoomDistancePx: initialSnapshot.distancePx,
    };
    gestureModeRef.current = "transforming";
  }, [clearStrokeDecisionTimer]);

  const sendUndo = useCallback((): void => {
    sendCommand({
      type: "undo",
      controller_id: controllerId,
      seq: ++commandSequenceRef.current,
      timestamp: Date.now(),
    });
  }, [controllerId, sendCommand]);

  const sendRedo = useCallback((): void => {
    sendCommand({
      type: "redo",
      controller_id: controllerId,
      seq: ++commandSequenceRef.current,
      timestamp: Date.now(),
    });
  }, [controllerId, sendCommand]);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>): void => {
      const pointerPosition = getControllerPointerPosition(event);
      if (
        pointerPosition === null ||
        activePointersRef.current.has(event.pointerId)
      ) {
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      activePointersRef.current.set(event.pointerId, pointerPosition);

      if (
        activePointersRef.current.size === 1 &&
        gestureModeRef.current === "idle"
      ) {
        gestureModeRef.current = "single-pointer";
        const commandType = getStrokeCommandType(selectedTool);
        activeStrokeRef.current =
          commandType === null
            ? null
            : {
                pointerId: event.pointerId,
                commandType,
                strokeId: null,
                bufferedPoints: [pointerPosition.normalizedPoint],
              };

        if (activeStrokeRef.current !== null) {
          if (event.pointerType === "touch") {
            scheduleStrokeConfirmation();
          } else {
            confirmPendingStroke();
          }
        }
        return;
      }

      if (
        activePointersRef.current.size === 2 &&
        gestureModeRef.current !== "waiting-for-release"
      ) {
        startTwoFingerGesture();
      }
    },
    [
      confirmPendingStroke,
      scheduleStrokeConfirmation,
      selectedTool,
      startTwoFingerGesture,
    ],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>): void => {
      if (!activePointersRef.current.has(event.pointerId)) return;
      const pointerPosition = getControllerPointerPosition(event);
      if (pointerPosition === null) return;
      activePointersRef.current.set(event.pointerId, pointerPosition);

      if (gestureModeRef.current === "transforming") {
        const twoFingerGestureState = twoFingerGestureStateRef.current;
        if (
          twoFingerGestureState === null ||
          !twoFingerGestureState.pointerIds.includes(event.pointerId)
        ) {
          return;
        }

        const firstPointerPosition = activePointersRef.current.get(
          twoFingerGestureState.pointerIds[0],
        );
        const secondPointerPosition = activePointersRef.current.get(
          twoFingerGestureState.pointerIds[1],
        );
        if (
          firstPointerPosition === undefined ||
          secondPointerPosition === undefined
        ) {
          return;
        }

        const currentSnapshot = getTwoFingerGestureSnapshot(
          firstPointerPosition,
          secondPointerPosition,
        );
        const zoomFactor = calculatePinchZoomFactor(
          twoFingerGestureState.lastSentZoomDistancePx,
          currentSnapshot.distancePx,
        );
        if (zoomFactor !== null) {
          sendZoomCommand(
            twoFingerGestureState.previousSnapshot.center,
            zoomFactor,
          );
          twoFingerGestureState.lastSentZoomDistancePx =
            currentSnapshot.distancePx;
        }
        sendMoveCommand({
          x:
            currentSnapshot.center.x -
            twoFingerGestureState.previousSnapshot.center.x,
          y:
            currentSnapshot.center.y -
            twoFingerGestureState.previousSnapshot.center.y,
        });
        twoFingerGestureState.previousSnapshot = currentSnapshot;
        return;
      }

      const activeStroke = activeStrokeRef.current;
      if (
        activeStroke === null ||
        activeStroke.pointerId !== event.pointerId
      ) {
        return;
      }

      if (gestureModeRef.current === "single-pointer") {
        activeStroke.bufferedPoints.push(pointerPosition.normalizedPoint);
        return;
      }

      if (
        gestureModeRef.current === "drawing" &&
        activeStroke.strokeId !== null
      ) {
        sendStrokeCommand(
          activeStroke.commandType,
          activeStroke.strokeId,
          pointerPosition.normalizedPoint,
        );
      }
    },
    [sendMoveCommand, sendStrokeCommand, sendZoomCommand],
  );

  const finishPointer = useCallback(
    (
      event: PointerEvent<HTMLDivElement>,
      commitPendingStroke: boolean,
    ): void => {
      if (!activePointersRef.current.has(event.pointerId)) return;

      const modeAtFinish = gestureModeRef.current;
      const activeStroke = activeStrokeRef.current;
      if (
        modeAtFinish === "single-pointer" &&
        activeStroke?.pointerId === event.pointerId
      ) {
        if (commitPendingStroke) {
          confirmPendingStroke();
        } else {
          clearStrokeDecisionTimer();
        }
      }

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      activePointersRef.current.delete(event.pointerId);

      if (modeAtFinish === "transforming") {
        const endedGesturePointer =
          twoFingerGestureStateRef.current?.pointerIds.includes(
            event.pointerId,
          ) ?? false;
        if (!endedGesturePointer) return;

        twoFingerGestureStateRef.current = null;
        activeStrokeRef.current = null;
        gestureModeRef.current =
          activePointersRef.current.size === 0
            ? "idle"
            : "waiting-for-release";
        return;
      }

      if (modeAtFinish === "waiting-for-release") {
        if (activePointersRef.current.size === 0) {
          gestureModeRef.current = "idle";
        }
        return;
      }

      clearStrokeDecisionTimer();
      activeStrokeRef.current = null;
      gestureModeRef.current =
        activePointersRef.current.size === 0
          ? "idle"
          : "waiting-for-release";
    },
    [clearStrokeDecisionTimer, confirmPendingStroke],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>): void => {
      finishPointer(event, true);
    },
    [finishPointer],
  );

  const handlePointerCancel = useCallback(
    (event: PointerEvent<HTMLDivElement>): void => {
      finishPointer(event, false);
    },
    [finishPointer],
  );

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
    sendReset,
    sendUndo,
    sendRedo,
  };
}
