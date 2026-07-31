import {
    calculatePinchZoomFactor,
    getTwoFingerGestureSnapshot,
} from "../src/features/controller-input/twoFingerGesture";
import type { ControllerPointerPosition } from "../src/features/controller-input/twoFingerGesture";
import { assert, assertCloseTo, assertPointCloseTo, test } from "./harness";

const createPointerPosition = (
    normalizedX: number,
    normalizedY: number,
    clientX: number,
    clientY: number,
): ControllerPointerPosition => ({
    normalizedPoint: { x: normalizedX, y: normalizedY },
    clientPoint: { x: clientX, y: clientY },
});

test("二本指の中点は正規化座標、指間距離はCSS pxで計算する", () => {
    const firstPointer = createPointerPosition(0.1, 0.2, 20, 50);
    const secondPointer = createPointerPosition(0.7, 0.8, 80, 130);

    const snapshot = getTwoFingerGestureSnapshot(firstPointer, secondPointer);

    assertPointCloseTo(snapshot.center, { x: 0.4, y: 0.5 }, "center");
    assertCloseTo(snapshot.distancePx, 100, "distancePx");
});

test("二本指の距離が広がると1より大きい拡大倍率になる", () => {
    const factor = calculatePinchZoomFactor(100, 125);

    assert(factor !== null, "factor should be calculated");
    assertCloseTo(factor, 1.25, "factor");
});

test("二本指の距離が狭まると1より小さい縮小倍率になる", () => {
    const factor = calculatePinchZoomFactor(125, 100);

    assert(factor !== null, "factor should be calculated");
    assertCloseTo(factor, 0.8, "factor");
});

test("最後に送った距離からの変化がZoom閾値未満なら倍率を生成しない", () => {
    const factor = calculatePinchZoomFactor(100, 109);

    assert(factor === null, `factor: expected null, got ${String(factor)}`);
});

test("小さな距離変化が累積してZoom閾値に到達すると倍率を生成する", () => {
    const lastSentZoomDistancePx = 100;

    assert(
        calculatePinchZoomFactor(lastSentZoomDistancePx, 104) === null,
        "4px change should not create zoom",
    );
    assert(
        calculatePinchZoomFactor(lastSentZoomDistancePx, 109) === null,
        "9px accumulated change should not create zoom",
    );

    const factor = calculatePinchZoomFactor(lastSentZoomDistancePx, 110);
    assert(factor !== null, "10px accumulated change should create zoom");
    assertCloseTo(factor, 1.1, "factor");
});

test("縮小方向でもZoom閾値に到達すると倍率を生成する", () => {
    const factor = calculatePinchZoomFactor(100, 90);

    assert(factor !== null, "10px shrink should create zoom");
    assertCloseTo(factor, 0.9, "factor");
});

test("距離が変わらない場合と不安定な距離では倍率を生成しない", () => {
    assert(
        calculatePinchZoomFactor(100, 100) === null,
        "unchanged distance should not create zoom",
    );
    assert(
        calculatePinchZoomFactor(0, 100) === null,
        "zero previous distance should not create zoom",
    );
    assert(
        calculatePinchZoomFactor(100, 0) === null,
        "zero current distance should not create zoom",
    );
    assert(
        calculatePinchZoomFactor(Number.NaN, 100) === null,
        "NaN distance should not create zoom",
    );
    assert(
        calculatePinchZoomFactor(100, Number.POSITIVE_INFINITY) === null,
        "infinite distance should not create zoom",
    );
});
