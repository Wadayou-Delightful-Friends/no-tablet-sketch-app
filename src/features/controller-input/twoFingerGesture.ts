import type { NormalizedPoint } from "../../domain/schema_common/point";

/** ピンチ倍率の計算が不安定になる、二本指間の最小距離 */
const MIN_PINCH_DISTANCE_PX = 8;
/** 指間距離の小さな揺れをZoomCommandとして送らないための変化量 */
const ZOOM_SEND_DISTANCE_THRESHOLD_PX = 10;

export type ClientPoint = {
  x: number;
  y: number;
};

export type ControllerPointerPosition = {
  normalizedPoint: NormalizedPoint;
  clientPoint: ClientPoint;
};

export type TwoFingerGestureSnapshot = {
  center: NormalizedPoint;
  distancePx: number;
};

/**
 * 二本指ジェスチャーの中点と指間距離を、その時点のPointer位置から求める。
 *
 * 中点はCommandに使うため0〜1の正規化座標で計算する。指間距離は、
 * Controllerの縦横比でズーム感度が変わらないようにCSS pxで計算する。
 *
 * @param firstPointerPosition 一本目の指の正規化座標と画面座標
 * @param secondPointerPosition 二本目の指の正規化座標と画面座標
 * @returns 正規化された中点とCSS px単位の指間距離
 */
export function getTwoFingerGestureSnapshot(
  firstPointerPosition: ControllerPointerPosition,
  secondPointerPosition: ControllerPointerPosition,
): TwoFingerGestureSnapshot {
  return {
    center: {
      x:
        (firstPointerPosition.normalizedPoint.x +
          secondPointerPosition.normalizedPoint.x) /
        2,
      y:
        (firstPointerPosition.normalizedPoint.y +
          secondPointerPosition.normalizedPoint.y) /
        2,
    },
    distancePx: Math.hypot(
      secondPointerPosition.clientPoint.x -
        firstPointerPosition.clientPoint.x,
      secondPointerPosition.clientPoint.y -
        firstPointerPosition.clientPoint.y,
    ),
  };
}

/**
 * 最後にZoomを送った時点と現在の指間距離から、scaleへ掛ける倍率を求める。
 *
 * 指が重なる付近では距離の比が極端になるため倍率を返さない。
 * 最後にZoomCommandを送った距離からの変化が閾値未満の場合も、指の
 * 小さな揺れを拡大縮小として扱わないためnullを返す。
 *
 * @param previousDistancePx 最後にZoomCommandを送った時点の指間距離
 * @param currentDistancePx 現在の二本指間の距離
 * @returns 有効な拡大縮小倍率。送信すべきでない場合はnull
 */
export function calculatePinchZoomFactor(
  previousDistancePx: number,
  currentDistancePx: number,
): number | null {
  const distancesAreFinite =
    Number.isFinite(previousDistancePx) &&
    Number.isFinite(currentDistancePx);
  if (
    !distancesAreFinite ||
    previousDistancePx < MIN_PINCH_DISTANCE_PX ||
    currentDistancePx < MIN_PINCH_DISTANCE_PX
  ) {
    return null;
  }

  const distanceChangePx = Math.abs(currentDistancePx - previousDistancePx);
  if (distanceChangePx < ZOOM_SEND_DISTANCE_THRESHOLD_PX) {
    return null;
  }

  const factor = currentDistancePx / previousDistancePx;
  if (!Number.isFinite(factor) || factor <= 0 || factor === 1) {
    return null;
  }
  return factor;
}
