import { createStrokeStack, appendPoint } from "../src/domain/stroke/stroke_stack";
import type { Stroke } from "../src/domain/stroke/stroke";
import type { WorldPoint } from "../src/domain/schema_common/point";
import { test, assert } from "./harness";

/** 出口は forEachPoint だけなので、テストでは点を配列に集めてから検証する */
const collectPoints = (stroke: Stroke): WorldPoint[] => {
    const points: WorldPoint[] = [];
    stroke.forEachPoint((point) => points.push(point));
    return points;
};

test("新しい stroke_id の点は新規ストロークとして積まれる", () => {
    const stack = createStrokeStack();
    appendPoint(stack, "c1:1", 2, { x: 0, y: 0 });
    assert(stack.length === 1, `stack.length: expected 1, got ${stack.length}`);
    assert(collectPoints(stack[0]).length === 1, "points.length should be 1");
    assert(stack[0].radius === 2, "radius should be kept");
});

test("同じ stroke_id の点は末尾ストロークに追記される", () => {
    const stack = createStrokeStack();
    appendPoint(stack, "c1:1", 2, { x: 0, y: 0 });
    appendPoint(stack, "c1:1", 2, { x: 10, y: 5 });
    assert(stack.length === 1, `stack.length: expected 1, got ${stack.length}`);
    const points = collectPoints(stack[0]);
    assert(points.length === 2, `points.length: expected 2, got ${points.length}`);
});

test("stroke_id が変わると別ストロークになり、描いた順に並ぶ", () => {
    const stack = createStrokeStack();
    appendPoint(stack, "c1:1", 2, { x: 0, y: 0 });
    appendPoint(stack, "c1:2", 4, { x: 1, y: 1 });
    appendPoint(stack, "c1:2", 4, { x: 2, y: 2 });
    assert(stack.length === 2, `stack.length: expected 2, got ${stack.length}`);
    assert(stack[0].stroke_id === "c1:1", "first stroke should stay at the bottom");
    assert(stack[1].stroke_id === "c1:2", "latest stroke should be on top");
    assert(collectPoints(stack[1]).length === 2, "latest stroke should collect its own points");
});

test("forEachPoint は追加した順に点を返す", () => {
    const stack = createStrokeStack();
    appendPoint(stack, "c1:1", 2, { x: 0, y: 0 });
    appendPoint(stack, "c1:1", 2, { x: 10, y: 5 });
    appendPoint(stack, "c1:1", 2, { x: 20, y: 15 });
    const points = collectPoints(stack[0]);
    assert(points[0].x === 0 && points[1].x === 10 && points[2].x === 20,
        `points should keep insertion order, got x: ${points.map((p) => p.x).join(",")}`);
});
