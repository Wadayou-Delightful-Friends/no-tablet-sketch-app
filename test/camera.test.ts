import {
    createCamera,
    worldToScreen,
    screenToWorld,
    screenLengthToWorld,
    worldLengthToScreen,
    panBy,
    zoomAt,
    zoomFactorPerStep,
    DEFAULT_ZOOM_SETTINGS,
} from "../src/domain/camera/camera";
import { test, assert, assertCloseTo, assertPointCloseTo } from "./harness";

const SCREEN_ORIGIN = { x: 0, y: 0 };

test("初期カメラは world と screen が一致する", () => {
    const camera = createCamera(SCREEN_ORIGIN);
    assertPointCloseTo(worldToScreen(camera, { x: 10, y: -5 }), { x: 10, y: -5 }, "screen");
});

test("createCamera は指定した画面位置にワールド原点を置く", () => {
    const screenCenter = { x: 400, y: 300 };
    const camera = createCamera(screenCenter);
    assertPointCloseTo(worldToScreen(camera, { x: 0, y: 0 }), screenCenter, "origin");
    assertCloseTo(camera.scale, 1, "scale");
});

test("worldToScreen と screenToWorld は往復で元に戻る", () => {
    const camera = zoomAt(
        panBy(createCamera(SCREEN_ORIGIN), { x: 120, y: -40 }),
        { x: 300, y: 200 },
        1.75,
        DEFAULT_ZOOM_SETTINGS,
    );
    const world = { x: 12.5, y: -34.25 };
    const roundTripped = screenToWorld(camera, worldToScreen(camera, world));
    assertPointCloseTo(roundTripped, world, "roundTripped");
});

test("panBy は表示を delta ぶん平行移動する", () => {
    const camera = panBy(createCamera(SCREEN_ORIGIN), { x: 30, y: 20 });
    assertPointCloseTo(worldToScreen(camera, { x: 0, y: 0 }), { x: 30, y: 20 }, "origin");
    assertCloseTo(camera.scale, 1, "scale");
});

test("zoomAt は scale を factor 倍にする", () => {
    const camera = zoomAt(createCamera(SCREEN_ORIGIN), { x: 400, y: 300 }, 1.25, DEFAULT_ZOOM_SETTINGS);
    assertCloseTo(camera.scale, 1.25, "scale");
});

test("zoomAt は anchor 直下の world 点を動かさない", () => {
    const before = panBy(createCamera(SCREEN_ORIGIN), { x: 100, y: 50 });
    const anchor = { x: 400, y: 300 };
    const worldAtAnchor = screenToWorld(before, anchor);
    const after = zoomAt(before, anchor, 1.25, DEFAULT_ZOOM_SETTINGS);
    assertPointCloseTo(worldToScreen(after, worldAtAnchor), anchor, "anchor");
});

test("zoomAt を往復（1.25倍→0.8倍）するとほぼ等倍に戻る", () => {
    const camera = zoomAt(
        zoomAt(createCamera(SCREEN_ORIGIN), { x: 400, y: 300 }, 1.25, DEFAULT_ZOOM_SETTINGS),
        { x: 400, y: 300 },
        0.8,
        DEFAULT_ZOOM_SETTINGS,
    );
    assertCloseTo(camera.scale, 1, "scale");
});

test("zoomAt は scale を maxScale 超・minScale 未満にしない", () => {
    const anchor = { x: 400, y: 300 };
    const zoomedIn = zoomAt(createCamera(SCREEN_ORIGIN), anchor, 100, DEFAULT_ZOOM_SETTINGS);
    assertCloseTo(zoomedIn.scale, DEFAULT_ZOOM_SETTINGS.maxScale, "maxScale");
    const zoomedOut = zoomAt(createCamera(SCREEN_ORIGIN), anchor, 1e-9, DEFAULT_ZOOM_SETTINGS);
    assertCloseTo(zoomedOut.scale, DEFAULT_ZOOM_SETTINGS.minScale, "minScale");
});

test("クランプ上限に達した後にさらに zoomAt しても translation は動かない", () => {
    const anchor = { x: 400, y: 300 };
    const atMax = zoomAt(createCamera(SCREEN_ORIGIN), anchor, 100, DEFAULT_ZOOM_SETTINGS);
    const zoomedAgain = zoomAt(atMax, { x: 100, y: 200 }, 2, DEFAULT_ZOOM_SETTINGS);
    assertCloseTo(zoomedAgain.scale, atMax.scale, "scale");
    assertPointCloseTo(zoomedAgain.translation, atMax.translation, "translation");
});

test("zoomFactorPerStep を stepCount 回掛けると minScale から maxScale に届く", () => {
    const factor = zoomFactorPerStep(DEFAULT_ZOOM_SETTINGS);
    assert(factor > 1, `factor should be greater than 1, got ${factor}`);
    let scale = DEFAULT_ZOOM_SETTINGS.minScale;
    for (let step = 0; step < DEFAULT_ZOOM_SETTINGS.stepCount; step++) {
        scale *= factor;
    }
    assertCloseTo(scale, DEFAULT_ZOOM_SETTINGS.maxScale, "scale after all steps");
});

test("screenLengthToWorld と worldLengthToScreen は scale に応じて互いに逆変換になる", () => {
    const camera = zoomAt(createCamera(SCREEN_ORIGIN), { x: 0, y: 0 }, 2, DEFAULT_ZOOM_SETTINGS);
    assertCloseTo(screenLengthToWorld(camera, 10), 5, "screenLengthToWorld");
    assertCloseTo(worldLengthToScreen(camera, 5), 10, "worldLengthToScreen");
});
