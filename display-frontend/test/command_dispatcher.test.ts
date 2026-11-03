import { createCommandDispatcher } from "../src/domain/command/command_dispatcher";
import { createScene } from "../src/domain/scene/scene";
import { DEFAULT_ZOOM_SETTINGS } from "../src/domain/camera/camera";
import type { Renderer } from "../src/domain/ports/renderer";
import type { WriteCommand, EraseCommand, MoveCommand, ZoomCommand } from "../src/domain/command/command";
import type { Stroke } from "../src/domain/stroke/stroke";
import type { WorldPoint } from "../src/domain/schema_common/point";
import { test, assert, assertCloseTo, assertPointCloseTo } from "./harness";

/** 描画呼び出しの回数だけ数える fake（Canvas2D なしで domain の配線を検証する） */
const createFakeRenderer = (): Renderer & { renderCount: number } => ({
    renderCount: 0,
    render() {
        this.renderCount += 1;
    },
});

/** 出口は forEachPoint だけなので、テストでは点を配列に集めてから検証する */
const collectPoints = (stroke: Stroke): WorldPoint[] => {
    const points: WorldPoint[] = [];
    stroke.forEachPoint((point) => points.push(point));
    return points;
};

const envelope = { controller_id: "c1", seq: 1, timestamp: 0 };
/** ワールド原点を画面左上に置く（テストの期待値を読みやすくするため） */
const SCREEN_ORIGIN = { x: 0, y: 0 };

test("write コマンドで点がストロークスタックに積まれ、再描画される", () => {
    const scene = createScene(SCREEN_ORIGIN);
    const renderer = createFakeRenderer();
    const dispatcher = createCommandDispatcher(scene, renderer, DEFAULT_ZOOM_SETTINGS);

    const command: WriteCommand = { type: "write", ...envelope, stroke_id: "c1:1", radius: 2, point: { x: 10, y: 20 } };
    dispatcher.applyCommand(command);

    assert(scene.strokes.length === 1, "stroke should be pushed");
    assertPointCloseTo(collectPoints(scene.strokes[0])[0], { x: 10, y: 20 }, "point");
    assert(renderer.renderCount === 1, "render should be called once");
});

test("write はその時点のカメラでワールド座標に変換して記録する", () => {
    const scene = createScene(SCREEN_ORIGIN);
    const renderer = createFakeRenderer();
    const dispatcher = createCommandDispatcher(scene, renderer, DEFAULT_ZOOM_SETTINGS);

    const move: MoveCommand = { type: "move", ...envelope, delta: { x: 100, y: 50 } };
    dispatcher.applyCommand(move);
    const write: WriteCommand = { type: "write", ...envelope, stroke_id: "c1:1", radius: 2, point: { x: 100, y: 50 } };
    dispatcher.applyCommand(write);

    // 画面 (100,50) はカメラ移動後のワールド原点にあたる
    assertPointCloseTo(collectPoints(scene.strokes[0])[0], { x: 0, y: 0 }, "worldPoint");
});

test("move コマンドでカメラが delta ぶん平行移動する", () => {
    const scene = createScene(SCREEN_ORIGIN);
    const dispatcher = createCommandDispatcher(scene, createFakeRenderer(), DEFAULT_ZOOM_SETTINGS);

    const command: MoveCommand = { type: "move", ...envelope, delta: { x: 30, y: 20 } };
    dispatcher.applyCommand(command);

    assertPointCloseTo(scene.camera.translation, { x: 30, y: 20 }, "translation");
});

test("zoom コマンドで scale が factor 倍になる", () => {
    const scene = createScene(SCREEN_ORIGIN);
    const dispatcher = createCommandDispatcher(scene, createFakeRenderer(), DEFAULT_ZOOM_SETTINGS);

    const command: ZoomCommand = { type: "zoom", ...envelope, anchor: { x: 400, y: 300 }, factor: 1.25 };
    dispatcher.applyCommand(command);

    assertCloseTo(scene.camera.scale, 1.25, "scale");
});

test("zoom コマンドを重ねても scale は zoomSettings の範囲を超えない", () => {
    const scene = createScene(SCREEN_ORIGIN);
    const dispatcher = createCommandDispatcher(scene, createFakeRenderer(), DEFAULT_ZOOM_SETTINGS);

    const command: ZoomCommand = { type: "zoom", ...envelope, anchor: { x: 0, y: 0 }, factor: 4 };
    dispatcher.applyCommand(command);
    dispatcher.applyCommand(command);

    assertCloseTo(scene.camera.scale, DEFAULT_ZOOM_SETTINGS.maxScale, "scale");
});

test("ズーム中に描いても、描いた画面位置のワールド点として記録される", () => {
    const scene = createScene(SCREEN_ORIGIN);
    const dispatcher = createCommandDispatcher(scene, createFakeRenderer(), DEFAULT_ZOOM_SETTINGS);

    const zoom: ZoomCommand = { type: "zoom", ...envelope, anchor: { x: 0, y: 0 }, factor: 2 };
    dispatcher.applyCommand(zoom);
    const write: WriteCommand = { type: "write", ...envelope, stroke_id: "c1:1", radius: 4, point: { x: 100, y: 100 } };
    dispatcher.applyCommand(write);

    // scale=2 なので画面 (100,100) はワールド (50,50)、radius も半分になる
    assertPointCloseTo(collectPoints(scene.strokes[0])[0], { x: 50, y: 50 }, "worldPoint");
    assertCloseTo(scene.strokes[0].style.radius, 2, "worldRadius");
});

test("write コマンドは PEN_DEFAULT のストロークとして記録される", () => {
    const scene = createScene(SCREEN_ORIGIN);
    const dispatcher = createCommandDispatcher(scene, createFakeRenderer(), DEFAULT_ZOOM_SETTINGS);

    const write: WriteCommand = { type: "write", ...envelope, stroke_id: "c1:1", radius: 2, point: { x: 10, y: 20 } };
    dispatcher.applyCommand(write);

    assert(scene.strokes[0].style.kind === "PEN_DEFAULT",
        `kind: expected PEN_DEFAULT, got ${scene.strokes[0].style.kind}`);
});

test("erase コマンドは ERASE_DEFAULT のストロークとして write と同じ経路で記録される", () => {
    const scene = createScene(SCREEN_ORIGIN);
    const renderer = createFakeRenderer();
    const dispatcher = createCommandDispatcher(scene, renderer, DEFAULT_ZOOM_SETTINGS);

    const erase: EraseCommand = { type: "erase", ...envelope, stroke_id: "c1:1", radius: 12, point: { x: 10, y: 20 } };
    dispatcher.applyCommand(erase);

    // 消しゴムも「積んで描画時に合成する」ため、write と同様にスタックへ積まれる
    assert(scene.strokes.length === 1, "erase stroke should be pushed");
    assert(scene.strokes[0].style.kind === "ERASE_DEFAULT",
        `kind: expected ERASE_DEFAULT, got ${scene.strokes[0].style.kind}`);
    assertPointCloseTo(collectPoints(scene.strokes[0])[0], { x: 10, y: 20 }, "worldPoint");
    assertCloseTo(scene.strokes[0].style.radius, 12, "worldRadius");
    assert(renderer.renderCount === 1, "render should be called once");
});

test("write と erase は積み順（描画順）を保ってスタックに並ぶ", () => {
    // 消しゴムは「それより前に積まれた絵だけを抜く」ため、この順序が正しさの前提
    const scene = createScene(SCREEN_ORIGIN);
    const dispatcher = createCommandDispatcher(scene, createFakeRenderer(), DEFAULT_ZOOM_SETTINGS);

    dispatcher.applyCommand({ type: "write", ...envelope, stroke_id: "c1:1", radius: 2, point: { x: 0, y: 0 } });
    dispatcher.applyCommand({ type: "erase", ...envelope, stroke_id: "c1:2", radius: 12, point: { x: 1, y: 1 } });
    dispatcher.applyCommand({ type: "write", ...envelope, stroke_id: "c1:3", radius: 2, point: { x: 2, y: 2 } });

    const kinds = scene.strokes.map((stroke) => stroke.style.kind).join(",");
    assert(kinds === "PEN_DEFAULT,ERASE_DEFAULT,PEN_DEFAULT", `kinds should keep draw order, got ${kinds}`);
});
