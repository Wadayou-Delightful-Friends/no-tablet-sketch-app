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

/**
 * ストロークが描画時にキャンバスへ何をするか（＝どのツールで引かれたか）。
 * この種別で合成モードを切り替える。将来プリセットが増える想定で _DEFAULT を付す。
 */
export type KindOfTool = "PEN_DEFAULT" | "ERASE_DEFAULT";

/**
 * ストロークの画風（見た目に関わる属性）をまとめた値オブジェクト。
 * 識別子(stroke_id)・点列（幾何）とは分け、描画パラメータだけをここに集約する。
 * 将来 color / opacity などが増えてもこの型に足すだけで済み、生成・記録側の
 * シグネチャは変えずにいられる（引数の数を安定させるためのまとめ役）。
 * すべてドメインの語彙・ワールド単位で持つ。screen 座標や転送メタデータ
 * (seq/timestamp/controller_id) は含めない（それらは入力層で扱う）。
 */
export type StrokeStyle = {
    /** 種別（描く/消す）。描画側が合成モードの切り替えに使う */
    kind: KindOfTool;
    /** 線の太さの半径（ワールド単位。ズームすると見た目の太さも変わる） */
    radius: number;
}

export type Stroke = {
    readonly stroke_id: string;
    /** 画風（種別・太さ…）。生成後は不変 */
    readonly style: StrokeStyle;
    /** 点を末尾に追加する */
    push(point: WorldPoint): void;
    /** 全点を追加順に読み取る */
    forEachPoint(callback: (point: WorldPoint) => void): void;
}

export const createStroke = (
    stroke_id: string,
    style: StrokeStyle,
    firstPoint: WorldPoint,
): Stroke => {
    const points: WorldPoint[] = [firstPoint];
    return {
        stroke_id,
        style,
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
