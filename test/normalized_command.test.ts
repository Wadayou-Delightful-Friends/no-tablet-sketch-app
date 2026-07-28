import { toScreenCommand } from "../src/features/sketch/normalized_command";
import type { Viewport } from "../src/features/sketch/normalized_command";
import type {
    WriteCommand,
    EraseCommand,
    MoveCommand,
    ZoomCommand,
} from "../src/domain/command/command";
import { test, assert, assertCloseTo, assertPointCloseTo } from "./harness";

const envelope = { controller_id: "c1", seq: 1, timestamp: 0 };
/** 縦横で倍率が違う値にして、x に高さを掛ける等の取り違えを検出できるようにする */
const VIEWPORT: Viewport = { width: 800, height: 600 };

// 各テストで組み立てる Command は「座標が正規化された（0〜1）」もの。
// 画面 px 版と型は同じなので、0.5 のような値が入っていることで見分ける。

test("write の正規化座標が描画領域のサイズを掛けた画面座標になる", () => {
    const command: WriteCommand = {
        type: "write", ...envelope, stroke_id: "c1:1", radius: 2, point: { x: 0.5, y: 0.5 },
    };

    const screenCommand = toScreenCommand(VIEWPORT, command);

    assert(screenCommand.type === "write", `type: expected write, got ${screenCommand.type}`);
    assertPointCloseTo(screenCommand.point, { x: 400, y: 300 }, "point");
});

test("正規化座標の 0 と 1 が描画領域の左上と右下に対応する", () => {
    const strokeBody = { ...envelope, stroke_id: "c1:1", radius: 2 };
    const topLeft = toScreenCommand(VIEWPORT, {
        type: "write", ...strokeBody, point: { x: 0, y: 0 },
    });
    const bottomRight = toScreenCommand(VIEWPORT, {
        type: "write", ...strokeBody, point: { x: 1, y: 1 },
    });

    assert(topLeft.type === "write" && bottomRight.type === "write", "type should stay write");
    assertPointCloseTo(topLeft.point, { x: 0, y: 0 }, "topLeft");
    assertPointCloseTo(bottomRight.point, { x: 800, y: 600 }, "bottomRight");
});

test("radius は画面 px なので変換されずそのまま渡る", () => {
    const command: EraseCommand = {
        type: "erase", ...envelope, stroke_id: "c1:1", radius: 12, point: { x: 0.25, y: 0.5 },
    };

    const screenCommand = toScreenCommand(VIEWPORT, command);

    assert(screenCommand.type === "erase", `type: expected erase, got ${screenCommand.type}`);
    assertCloseTo(screenCommand.radius, 12, "radius");
    assertPointCloseTo(screenCommand.point, { x: 200, y: 300 }, "point");
});

test("move の delta も同じ倍率で画面 px に変換される（負の値も向きを保つ）", () => {
    const command: MoveCommand = {
        type: "move", ...envelope, delta: { x: 0.1, y: -0.5 },
    };

    const screenCommand = toScreenCommand(VIEWPORT, command);

    assert(screenCommand.type === "move", `type: expected move, got ${screenCommand.type}`);
    assertPointCloseTo(screenCommand.delta, { x: 80, y: -300 }, "delta");
});

test("zoom は anchor だけ変換し、factor は倍率なのでそのまま渡る", () => {
    const command: ZoomCommand = {
        type: "zoom", ...envelope, anchor: { x: 0.5, y: 0.25 }, factor: 1.25,
    };

    const screenCommand = toScreenCommand(VIEWPORT, command);

    assert(screenCommand.type === "zoom", `type: expected zoom, got ${screenCommand.type}`);
    assertPointCloseTo(screenCommand.anchor, { x: 400, y: 150 }, "anchor");
    assertCloseTo(screenCommand.factor, 1.25, "factor");
});

test("envelope（controller_id / seq / timestamp / stroke_id）は変換で失われない", () => {
    const command: WriteCommand = {
        type: "write",
        controller_id: "c9",
        seq: 42,
        timestamp: 1700000000000,
        stroke_id: "c9:7",
        radius: 2,
        point: { x: 0.5, y: 0.5 },
    };

    const screenCommand = toScreenCommand(VIEWPORT, command);

    assert(screenCommand.type === "write", `type: expected write, got ${screenCommand.type}`);
    assert(screenCommand.controller_id === "c9", `controller_id: got ${screenCommand.controller_id}`);
    assert(screenCommand.seq === 42, `seq: got ${screenCommand.seq}`);
    assert(screenCommand.timestamp === 1700000000000, `timestamp: got ${screenCommand.timestamp}`);
    assert(screenCommand.stroke_id === "c9:7", `stroke_id: got ${screenCommand.stroke_id}`);
});
