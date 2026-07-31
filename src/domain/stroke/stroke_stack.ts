/**
 * ストロークの記録スタック。描かれた順に積み、末尾が最新。
 * 順序を保った配列にしておくことで、描画（下から順に重ねる）と
 * 将来の undo（末尾から取り消す）の両方にそのまま使える。
 *
 * reset は「削除」ではなく「印（ResetMarker）を積む」ことで表現する。
 * こうすることで reset 以前のストロークもデータとしては残り続け、
 * 将来 undo を実装した際に、この印を pop するだけで reset 前の絵が
 * そのまま復元できる（append-only の原則を reset にも適用するため）。
 */

import type { WorldPoint } from "../schema_common/point";
import type { Stroke, StrokeStyle } from "./stroke";
import { createStroke } from "./stroke";

/** ストローク本体を包むエントリ。entryType で ResetMarker と判別する */
export type StrokeEntry = {
    entryType: "stroke";
    stroke: Stroke;
};

/**
 * reset イベントの印。ペイロードは持たず、いつ・誰が reset したかだけを残す。
 * この印より前のストロークは「無かったこと」として描画されるが、
 * 配列からは取り除かれない。
 */
export type ResetMarker = {
    entryType: "reset";
    controller_id: string;
    timestamp: number;
};

/** スタックに積まれる要素。ストローク本体か reset の印のどちらか */
export type StrokeStackEntry = StrokeEntry | ResetMarker;

export type StrokeStack = StrokeStackEntry[];

export const createStrokeStack = (): StrokeStack => [];

/**
 * 点を 1 つ追記する。末尾が同じ stroke_id のストロークエントリなら続きの点として
 * 追加し、そうでなければ（新しい stroke_id、あるいは末尾が ResetMarker）新規
 * ストロークエントリとして積む。
 * ResetMarker の直後の1点目でも、この分岐だけで自然に新規ストロークになる
 * （末尾が entryType: "stroke" かつ同じ stroke_id、という条件を満たさないため）。
 */
export const appendPoint = (
    stack: StrokeStack,
    stroke_id: string,
    point: WorldPoint,
    style: StrokeStyle,
): void => {
    const latestEntry = stack.at(-1);
    if (
        latestEntry !== undefined &&
        latestEntry.entryType === "stroke" &&
        latestEntry.stroke.stroke_id === stroke_id
    ) {
        latestEntry.stroke.push(point);
        return;
    }
    stack.push({ entryType: "stroke", stroke: createStroke(stroke_id, style, point) });
};

/**
 * reset の印を積む。ストロークそのものは削除しない。
 * 将来 undo を実装する際、この印を pop すれば reset 前の絵が復元できる。
 */
export const appendReset = (
    stack: StrokeStack,
    controller_id: string,
    timestamp: number,
): void => {
    stack.push({ entryType: "reset", controller_id, timestamp });
};

/**
 * 描画すべきストロークだけを順番通り列挙する出口。
 * 「末尾から見て直近の ResetMarker より後ろ」だけが対象で、それより前の
 * ストロークは reset 済みとして扱う（配列からは消えていないが描画対象外）。
 * Stroke.forEachPoint と同じく、スタックの内部構造を呼び出し側に見せない
 * ための唯一の読み取り口。
 */
export const forEachVisibleStroke = (
    stack: StrokeStack,
    callback: (stroke: Stroke) => void,
): void => {
    let lastResetIndex = -1;
    for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].entryType === "reset") {
            lastResetIndex = i;
            break;
        }
    }
    for (let i = lastResetIndex + 1; i < stack.length; i++) {
        const entry = stack[i];
        if (entry.entryType === "stroke") {
            callback(entry.stroke);
        }
    }
};