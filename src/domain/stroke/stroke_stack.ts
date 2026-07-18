/**
 * ストロークの記録スタック。描かれた順に積み、末尾が最新。
 * 順序を保った配列にしておくことで、描画（下から順に重ねる）と
 * 将来の undo（末尾から取り消す）の両方にそのまま使える。
 */

import type { WorldPoint } from "../schema_common/point";
import type { Stroke } from "./stroke";
import { createStroke } from "./stroke";

export type StrokeStack = Stroke[];

export const createStrokeStack = (): StrokeStack => [];

/**
 * 点を 1 つ追記する。stroke_id が末尾ストロークと同じなら続きの点として追加し、
 * 新しい stroke_id なら新規ストロークとして積む。
 * WriteCommand が「1コマンド＝1点」なので、ストロークの区切りは stroke_id の
 * 変化だけで判定できる（開始/終了の専用コマンドを持たない）。
 */
export const appendPoint = (
    stack: StrokeStack,
    stroke_id: string,
    radius: number,
    point: WorldPoint,
): void => {
    const latestStroke = stack.at(-1);
    if (latestStroke !== undefined && latestStroke.stroke_id === stroke_id) {
        latestStroke.push(point);
        return;
    }
    stack.push(createStroke(stroke_id, radius, point));
};
