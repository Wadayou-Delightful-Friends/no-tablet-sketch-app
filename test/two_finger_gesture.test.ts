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
