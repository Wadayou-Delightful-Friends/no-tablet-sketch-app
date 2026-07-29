import { createStrokeStack, appendPoint } from "../src/domain/stroke/stroke_stack";
import type { Stroke, StrokeStyle } from "../src/domain/stroke/stroke";
import type { WorldPoint } from "../src/domain/schema_common/point";
import { test, assert } from "./harness";

/** 出口は forEachPoint だけなので、テストでは点を配列に集めてから検証する */
const collectPoints = (stroke: Stroke): WorldPoint[] => {
    const points: WorldPoint[] = [];
    stroke.forEachPoint((point) => points.push(point));
    return points;
};

/** テストの意図（点の並び・積み順）を主役にするため、画風はヘルパで組み立てる */
const penStyle = (radius: number): StrokeStyle => ({ kind: "PEN_DEFAULT", radius });
const eraseStyle = (radius: number): StrokeStyle => ({ kind: "ERASE_DEFAULT", radius });

test("新しい stroke_id の点は新規ストロークとして積まれる", () => {
    const stack = createStrokeStack();
    appendPoint(stack, "c1:1", { x: 0, y: 0 }, penStyle(2));
    assert(stack.length === 1, `stack.length: expected 1, got ${stack.length}`);
    assert(collectPoints(stack[0]).length === 1, "points.length should be 1");
    assert(stack[0].style.radius === 2, "radius should be kept");
});

test("同じ stroke_id の点は末尾ストロークに追記される", () => {
    const stack = createStrokeStack();
    appendPoint(stack, "c1:1", { x: 0, y: 0 }, penStyle(2));
    appendPoint(stack, "c1:1", { x: 10, y: 5 }, penStyle(2));
    assert(stack.length === 1, `stack.length: expected 1, got ${stack.length}`);
    const points = collectPoints(stack[0]);
    assert(points.length === 2, `points.length: expected 2, got ${points.length}`);
});

test("stroke_id が変わると別ストロークになり、描いた順に並ぶ", () => {
    const stack = createStrokeStack();
    appendPoint(stack, "c1:1", { x: 0, y: 0 }, penStyle(2));
    appendPoint(stack, "c1:2", { x: 1, y: 1 }, penStyle(4));
    appendPoint(stack, "c1:2", { x: 2, y: 2 }, penStyle(4));
    assert(stack.length === 2, `stack.length: expected 2, got ${stack.length}`);
    assert(stack[0].stroke_id === "c1:1", "first stroke should stay at the bottom");
    assert(stack[1].stroke_id === "c1:2", "latest stroke should be on top");
    assert(collectPoints(stack[1]).length === 2, "latest stroke should collect its own points");
});

test("forEachPoint は追加した順に点を返す", () => {
    const stack = createStrokeStack();
    appendPoint(stack, "c1:1", { x: 0, y: 0 }, penStyle(2));
    appendPoint(stack, "c1:1", { x: 10, y: 5 }, penStyle(2));
    appendPoint(stack, "c1:1", { x: 20, y: 15 }, penStyle(2));
    const points = collectPoints(stack[0]);
    assert(points[0].x === 0 && points[1].x === 10 && points[2].x === 20,
        `points should keep insertion order, got x: ${points.map((p) => p.x).join(",")}`);
});

test("画風は新規ストロークにだけ適用され、続きの点では変わらない", () => {
    const stack = createStrokeStack();
    appendPoint(stack, "c1:1", { x: 0, y: 0 }, penStyle(2));
    // 同じ stroke_id なので続きの点として追記される。ストロークの途中で
    // 種別や太さが入れ替わらないこと（1本の性質が最後まで一定であること）を守る
    appendPoint(stack, "c1:1", { x: 1, y: 1 }, eraseStyle(12));
    assert(stack.length === 1, `stack.length: expected 1, got ${stack.length}`);
    assert(stack[0].style.kind === "PEN_DEFAULT", `kind should stay PEN_DEFAULT, got ${stack[0].style.kind}`);
    assert(stack[0].style.radius === 2, `radius should stay 2, got ${stack[0].style.radius}`);
});

test("消しゴムは描画ストロークと積み順を保って混在する", () => {
    // 消しゴムは「それより前に積まれた絵だけを抜く」ため、
    // 種別が混ざっても積み順（＝描画順）が保たれることが正しさの前提になる
    const stack = createStrokeStack();
    appendPoint(stack, "c1:1", { x: 0, y: 0 }, penStyle(2));
    appendPoint(stack, "c1:2", { x: 1, y: 1 }, eraseStyle(12));
    appendPoint(stack, "c1:3", { x: 2, y: 2 }, penStyle(2));
    assert(stack.length === 3, `stack.length: expected 3, got ${stack.length}`);
    const kinds = stack.map((stroke) => stroke.style.kind).join(",");
    assert(kinds === "PEN_DEFAULT,ERASE_DEFAULT,PEN_DEFAULT", `kinds should keep draw order, got ${kinds}`);
});
