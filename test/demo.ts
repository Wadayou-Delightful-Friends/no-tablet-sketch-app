/**
 * 無限キャンバスの動作デモ。
 * ここが「DOM イベント → Command」の変換層。src/ 側は Command を受け取って
 * からの処理だけを持ち、DOM API には依存しない（境界の理由は
 * docs/feature_canvas/input-and-demo.md）。
 *
 * 操作:
 * - ドラッグ: 描く（WriteCommand）
 * - Space を押しながらドラッグ / 中ボタンドラッグ: 移動（MoveCommand）
 * - ホイール: カーソル位置を中心に拡大縮小（ZoomCommand）
 */

import { createScene } from "../src/domain/scene/scene";
import { createCommandDispatcher } from "../src/domain/command/command_dispatcher";
import { createCanvas2dRenderer } from "../src/infra/render-canvas2d/canvas2d_renderer";
import { DEFAULT_ZOOM_SETTINGS, zoomFactorPerStep } from "../src/domain/camera/camera";
import type { Command, WriteCommand, MoveCommand, ZoomCommand } from "../src/domain/command/command";
import type { ScreenPoint } from "../src/domain/schema_common/point";

const CONTROLLER_ID = "demo";
const PEN_RADIUS_SCREEN_PX = 2;
/** ホイール1目盛り＝ズーム1段階。段階数・範囲は DEFAULT_ZOOM_SETTINGS で調整する */
const zoomFactorPerWheelTick = zoomFactorPerStep(DEFAULT_ZOOM_SETTINGS);

const canvas = document.getElementById("sketch-canvas") as HTMLCanvasElement;
const statusLabel = document.getElementById("status-label") as HTMLElement;

// 初期表示の中央をワールド原点にする（キャンバスの中央 = world (0,0)）
const scene = createScene({ x: canvas.width / 2, y: canvas.height / 2 });
const renderer = createCanvas2dRenderer(canvas);
const dispatcher = createCommandDispatcher(scene, renderer, DEFAULT_ZOOM_SETTINGS);

/** コマンド envelope（controller_id / seq / timestamp）の採番。変換層が持つ唯一の連番状態 */
let commandSeq = 0;
const nextEnvelope = () => ({
    controller_id: CONTROLLER_ID,
    seq: ++commandSeq,
    timestamp: Date.now(),
});

const sendCommand = (command: Command): void => {
    dispatcher.applyCommand(command);
    statusLabel.textContent =
        `strokes: ${scene.strokes.length} / scale: ${scene.camera.scale.toFixed(2)} / ` +
        `translation: (${scene.camera.translation.x.toFixed(0)}, ${scene.camera.translation.y.toFixed(0)})`;
};

const toCanvasPoint = (event: PointerEvent | WheelEvent): ScreenPoint => {
    const bounds = canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
};

// ---- 入力状態（ドラッグ中の判定に必要な最小限だけ持つ） ----

let strokeCount = 0;
/** 描画ドラッグ中のストローク ID。null なら描いていない */
let activeStrokeId: string | null = null;
/** パンドラッグ中の前回ポインタ位置。null ならパンしていない */
let lastPanPoint: ScreenPoint | null = null;
let isSpacePressed = false;

// ---- 標準リスナーイベント → Command ----

canvas.addEventListener("pointerdown", (event) => {
    canvas.setPointerCapture(event.pointerId);
    const isPanGesture = isSpacePressed || event.button === 1;
    if (isPanGesture) {
        lastPanPoint = toCanvasPoint(event);
        return;
    }
    activeStrokeId = `${CONTROLLER_ID}:${++strokeCount}`;
    const command: WriteCommand = {
        type: "write",
        ...nextEnvelope(),
        stroke_id: activeStrokeId,
        radius: PEN_RADIUS_SCREEN_PX,
        point: toCanvasPoint(event),
    };
    sendCommand(command);
});

canvas.addEventListener("pointermove", (event) => {
    if (lastPanPoint !== null) {
        const currentPoint = toCanvasPoint(event);
        const command: MoveCommand = {
            type: "move",
            ...nextEnvelope(),
            delta: { x: currentPoint.x - lastPanPoint.x, y: currentPoint.y - lastPanPoint.y },
        };
        lastPanPoint = currentPoint;
        sendCommand(command);
        return;
    }
    if (activeStrokeId !== null) {
        const command: WriteCommand = {
            type: "write",
            ...nextEnvelope(),
            stroke_id: activeStrokeId,
            radius: PEN_RADIUS_SCREEN_PX,
            point: toCanvasPoint(event),
        };
        sendCommand(command);
    }
});

canvas.addEventListener("pointerup", () => {
    activeStrokeId = null;
    lastPanPoint = null;
});

canvas.addEventListener("wheel", (event) => {
    // ブラウザのページズーム・スクロールを抑止してキャンバスのズームに割り当てる
    event.preventDefault();
    const zoomIn = event.deltaY < 0;
    const command: ZoomCommand = {
        type: "zoom",
        ...nextEnvelope(),
        anchor: toCanvasPoint(event),
        factor: zoomIn ? zoomFactorPerWheelTick : 1 / zoomFactorPerWheelTick,
    };
    sendCommand(command);
}, { passive: false });

window.addEventListener("keydown", (event) => {
    if (event.code === "Space") {
        // Space スクロールを抑止してパン用の修飾キーにする
        event.preventDefault();
        isSpacePressed = true;
    }
});

window.addEventListener("keyup", (event) => {
    if (event.code === "Space") {
        isSpacePressed = false;
    }
});

renderer.render(scene);
