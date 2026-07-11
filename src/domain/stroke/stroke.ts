/**
 * ストローク：1回のペン入力（pointerdown〜up）で描かれた点の並び。
 * 点はワールド座標で保持する。カメラをどれだけ動かしても・ズームしても
 * キャンバス上の同じ場所に留まるようにするため（変換は描画時に行う）。
 */

import type { WorldPoint } from "../common/point";

export type Stroke = {
    stroke_id: string;
    /** 線の太さの半径（ワールド単位。ズームすると見た目の太さも変わる） */
    radius: number;
    points: WorldPoint[];
}
