/**
 * ストローク：1回のペン入力（pointerdown〜up）で描かれた点の並び。
 * 点はワールド座標で保持する。カメラをどれだけ動かしても・ズームしても
 * キャンバス上の同じ場所に留まるようにするため（変換は描画時に行う）。
 *
 * 点列は closure 内に隠し、入口 push() / 出口 forEachPoint() だけを公開する。
 * 内部の持ち方（現状は WorldPoint[]。将来 x/y 別配列の SoA など）を、
 * 利用側を変えずに差し替えられるようにするため。点列の配列を直接
 * 返す口は作らないこと（作った瞬間、内部表現が外部に固定される）。
 */

import type { WorldPoint } from "../schema_common/point";

export type Stroke = {
    readonly stroke_id: string;
    /** 線の太さの半径（ワールド単位。ズームすると見た目の太さも変わる） */
    readonly radius: number;
    /** 点を末尾に追加する */
    push(point: WorldPoint): void;
    /** 全点を追加順に読み取る */
    forEachPoint(callback: (point: WorldPoint) => void): void;
}

export const createStroke = (
    stroke_id: string,
    radius: number,
    firstPoint: WorldPoint,
): Stroke => {
    const points: WorldPoint[] = [firstPoint];
    return {
        stroke_id,
        radius,
        push(point: WorldPoint): void {
            points.push(point);
        },
        forEachPoint(callback: (point: WorldPoint) => void): void {
            for (const point of points) {
                callback(point);
            }
        },
    };
};
