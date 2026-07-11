import { createCamera, worldToScreen, screenToWorld, panBy, zoomAt } from "../src/domain/camera/camera";
import { test, assertCloseTo, assertPointCloseTo } from "./harness";

test("初期カメラは world と screen が一致する", () => {
    const camera = createCamera();
    assertPointCloseTo(worldToScreen(camera, { x: 10, y: -5 }), { x: 10, y: -5 }, "screen");
});

test("worldToScreen と screenToWorld は往復で元に戻る", () => {
    const camera = zoomAt(panBy(createCamera(), { x: 120, y: -40 }), { x: 300, y: 200 }, 1.75);
    const world = { x: 12.5, y: -34.25 };
    const roundTripped = screenToWorld(camera, worldToScreen(camera, world));
    assertPointCloseTo(roundTripped, world, "roundTripped");
});

test("panBy は表示を delta ぶん平行移動する", () => {
    const camera = panBy(createCamera(), { x: 30, y: 20 });
    assertPointCloseTo(worldToScreen(camera, { x: 0, y: 0 }), { x: 30, y: 20 }, "origin");
    assertCloseTo(camera.scale, 1, "scale");
});

test("zoomAt は scale を factor 倍にする", () => {
    const camera = zoomAt(createCamera(), { x: 400, y: 300 }, 1.25);
    assertCloseTo(camera.scale, 1.25, "scale");
});

test("zoomAt は anchor 直下の world 点を動かさない", () => {
    const before = panBy(createCamera(), { x: 100, y: 50 });
    const anchor = { x: 400, y: 300 };
    const worldAtAnchor = screenToWorld(before, anchor);
    const after = zoomAt(before, anchor, 1.25);
    assertPointCloseTo(worldToScreen(after, worldAtAnchor), anchor, "anchor");
});

test("zoomAt を往復（1.25倍→0.8倍）するとほぼ等倍に戻る", () => {
    const camera = zoomAt(zoomAt(createCamera(), { x: 400, y: 300 }, 1.25), { x: 400, y: 300 }, 0.8);
    assertCloseTo(camera.scale, 1, "scale");
});
