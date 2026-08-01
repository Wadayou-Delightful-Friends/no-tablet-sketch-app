import { createStrokeStack, appendPoint, appendReset, truncateStack } from "../src/domain/stroke/stroke_stack";
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
    assert(stack.entries.length === 1, `entries.length: expected 1, got ${stack.entries.length}`);
    const entry = stack.entries[0];
    assert(entry.entryType === "stroke", "entry should be a stroke");
    assert(collectPoints(entry.stroke).length === 1, "points.length should be 1");
    assert(entry.stroke.style.radius === 2, "radius should be kept");
});

test("同じ stroke_id の点は対応するストロークに追記される", () => {
    const stack = createStrokeStack();
    appendPoint(stack, "c1:1", { x: 0, y: 0 }, penStyle(2));
    appendPoint(stack, "c1:1", { x: 10, y: 5 }, penStyle(2));
    assert(stack.entries.length === 1, `entries.length: expected 1, got ${stack.entries.length}`);
    const entry = stack.entries[0];
    assert(entry.entryType === "stroke", "entry should be a stroke");
    const points = collectPoints(entry.stroke);
    assert(points.length === 2, `points.length: expected 2, got ${points.length}`);
});

test("stroke_id が変わると別ストロークになり、描いた順に並ぶ", () => {
    const stack = createStrokeStack();
    appendPoint(stack, "c1:1", { x: 0, y: 0 }, penStyle(2));
    appendPoint(stack, "c1:2", { x: 1, y: 1 }, penStyle(4));
    appendPoint(stack, "c1:2", { x: 2, y: 2 }, penStyle(4));
    assert(stack.entries.length === 2, `entries.length: expected 2, got ${stack.entries.length}`);
    const [first, second] = stack.entries;
    assert(first.entryType === "stroke" && first.stroke.stroke_id === "c1:1", "first stroke should stay at the bottom");
    assert(second.entryType === "stroke" && second.stroke.stroke_id === "c1:2", "latest stroke should be on top");
    assert(second.entryType === "stroke" && collectPoints(second.stroke).length === 2, "latest stroke should collect its own points");
});

test("forEachPoint は追加した順に点を返す", () => {
    const stack = createStrokeStack();
    appendPoint(stack, "c1:1", { x: 0, y: 0 }, penStyle(2));
    appendPoint(stack, "c1:1", { x: 10, y: 5 }, penStyle(2));
    appendPoint(stack, "c1:1", { x: 20, y: 15 }, penStyle(2));
    const entry = stack.entries[0];
    assert(entry.entryType === "stroke", "entry should be a stroke");
    const points = collectPoints(entry.stroke);
    assert(points[0].x === 0 && points[1].x === 10 && points[2].x === 20,
        `points should keep insertion order, got x: ${points.map((p) => p.x).join(",")}`);
});

test("画風は新規ストロークにだけ適用され、続きの点では変わらない", () => {
    const stack = createStrokeStack();
    appendPoint(stack, "c1:1", { x: 0, y: 0 }, penStyle(2));
    // 同じ stroke_id なので続きの点として追記される。ストロークの途中で
    // 種別や太さが入れ替わらないこと（1本の性質が最後まで一定であること）を守る
    appendPoint(stack, "c1:1", { x: 1, y: 1 }, eraseStyle(12));
    assert(stack.entries.length === 1, `entries.length: expected 1, got ${stack.entries.length}`);
    const entry = stack.entries[0];
    assert(entry.entryType === "stroke", "entry should be a stroke");
    assert(entry.stroke.style.kind === "PEN_DEFAULT", `kind should stay PEN_DEFAULT, got ${entry.stroke.style.kind}`);
    assert(entry.stroke.style.radius === 2, `radius should stay 2, got ${entry.stroke.style.radius}`);
});

test("消しゴムは描画ストロークと積み順を保って混在する", () => {
    // 消しゴムは「それより前に積まれた絵だけを抜く」ため、
    // 種別が混ざっても積み順（＝描画順）が保たれることが正しさの前提になる
    const stack = createStrokeStack();
    appendPoint(stack, "c1:1", { x: 0, y: 0 }, penStyle(2));
    appendPoint(stack, "c1:2", { x: 1, y: 1 }, eraseStyle(12));
    appendPoint(stack, "c1:3", { x: 2, y: 2 }, penStyle(2));
    assert(stack.entries.length === 3, `entries.length: expected 3, got ${stack.entries.length}`);
    const kinds = stack.entries
        .map((entry) => (entry.entryType === "stroke" ? entry.stroke.style.kind : "reset"))
        .join(",");
    assert(kinds === "PEN_DEFAULT,ERASE_DEFAULT,PEN_DEFAULT", `kinds should keep draw order, got ${kinds}`);
});

test("別コントローラの点が間に割り込んでも、同じ stroke_id の点は1本のストロークにまとまる（分裂バグの回帰防止）", () => {
    const stack = createStrokeStack();
    // 端末Aとコントローラ間で到着順が A → B → A → B のように混ざるケースを再現する
    appendPoint(stack, "A:1", { x: 0, y: 0 }, penStyle(2));
    appendPoint(stack, "B:1", { x: 100, y: 100 }, penStyle(2));
    appendPoint(stack, "A:1", { x: 1, y: 1 }, penStyle(2));
    appendPoint(stack, "B:1", { x: 101, y: 101 }, penStyle(2));
    appendPoint(stack, "A:1", { x: 2, y: 2 }, penStyle(2));

    assert(stack.entries.length === 2, `entries.length: expected 2 (A, B), got ${stack.entries.length}`);
    const [aEntry, bEntry] = stack.entries;
    assert(aEntry.entryType === "stroke" && aEntry.stroke.stroke_id === "A:1", "first entry should be A's stroke");
    assert(bEntry.entryType === "stroke" && bEntry.stroke.stroke_id === "B:1", "second entry should be B's stroke");

    assert(aEntry.entryType === "stroke", "A entry should be a stroke");
    const aPoints = collectPoints(aEntry.stroke);
    assert(aPoints.length === 3, `A should collect all 3 of its points despite interleaving, got ${aPoints.length}`);
    assert(aPoints[0].x === 0 && aPoints[1].x === 1 && aPoints[2].x === 2,
        `A's points should keep insertion order, got x: ${aPoints.map((p) => p.x).join(",")}`);

    assert(bEntry.entryType === "stroke", "B entry should be a stroke");
    const bPoints = collectPoints(bEntry.stroke);
    assert(bPoints.length === 2, `B should collect both of its points, got ${bPoints.length}`);
});

test("継続判定は ResetMarker をまたがない（reset 後に同じ stroke_id が再利用されても新規ストロークになる）", () => {
    const stack = createStrokeStack();
    appendPoint(stack, "A:1", { x: 0, y: 0 }, penStyle(2));
    appendReset(stack, "A", 1000);
    appendPoint(stack, "A:1", { x: 5, y: 5 }, penStyle(2));

    assert(stack.entries.length === 3, `entries.length: expected 3 (stroke, reset, stroke), got ${stack.entries.length}`);
    const [first, marker, third] = stack.entries;
    assert(first.entryType === "stroke", "first entry should be a stroke");
    assert(marker.entryType === "reset", "second entry should be the reset marker");
    assert(third.entryType === "stroke", "third entry should be a new stroke, not a continuation of the pre-reset one");
    assert(third.entryType === "stroke" && third.stroke !== first.stroke,
        "post-reset stroke must be a different object from the pre-reset stroke");
});

test("truncateStack でキャッシュも無効化され、切り詰められた位置を誤って使わない", () => {
    const stack = createStrokeStack();
    appendPoint(stack, "A:1", { x: 0, y: 0 }, penStyle(2));
    appendPoint(stack, "B:1", { x: 100, y: 100 }, penStyle(2));

    // A:1 を切り詰めて消す（undo で「A:1 を書く前」まで戻したケースを模す）
    truncateStack(stack, 1);
    assert(stack.entries.length === 1, `entries.length after truncate: expected 1, got ${stack.entries.length}`);

    // 同じ stroke_id で新しい点が来ても、切り詰め前のキャッシュを使って
    // 誤ったインデックスに書き込んだりしない
    appendPoint(stack, "B:1", { x: 200, y: 200 }, penStyle(2));
    assert(stack.entries.length === 2, `entries.length: expected 2, got ${stack.entries.length}`);
    const entry = stack.entries[1];
    assert(entry.entryType === "stroke" && entry.stroke.stroke_id === "B:1", "new B:1 entry should be created fresh");
    assert(entry.entryType === "stroke" && collectPoints(entry.stroke).length === 1,
        "new B:1 entry should only contain the point appended after truncate");
});
