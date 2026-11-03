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

/**
 * ストロークの記録スタック本体。
 *
 * entries が実データ（積み順を保った配列）。activeIndex はその上に乗る
 * 「stroke_id → entries内のインデックス」のキャッシュで、appendPoint の
 * 継続判定（同じ stroke_id への追記か、新規ストロークか）を高速化するためだけに
 * 存在する。複数コントローラの点が到着順に混ざって積まれても、この
 * キャッシュのおかげで同じ stroke_id の点を正しく1本のストロークへ
 * 集約できる（末尾との位置的な一致だけを見ていた旧実装では、他コントローラの
 * 点が間に割り込むとストロークが分裂してしまっていた）。
 *
 * activeIndex は entries の内容と矛盾しないよう、appendPoint/appendReset/
 * truncateStack の内部でのみ更新する。外部から直接 entries を書き換えないこと。
 */
export type StrokeStack = {
    entries: StrokeStackEntry[];
    activeIndex: Map<string, number>;
};

export const createStrokeStack = (): StrokeStack => ({ entries: [], activeIndex: new Map() });

/**
 * 点を 1 つ追記する。
 *
 * まず activeIndex で同じ stroke_id の位置を引き、見つかれば（かつ
 * entries[index] が実際にその stroke_id を持つ StrokeEntry であれば）
 * そこへ直接追記する（O(1)）。
 *
 * キャッシュにない場合だけ、末尾から遡って直近の ResetMarker に当たるまでの
 * 範囲を stroke_id で探す。見つかればそこへ追記し、見つからなければ新規
 * ストロークとして末尾に積む。どちらの場合も結果の位置を activeIndex に
 * 書き戻す。
 *
 * 継続と判定したエントリの位置は動かさない。消しゴム（ERASE_DEFAULT）は
 * destination-out で「自分より前に積まれた絵」を抜くため、位置を動かすと
 * 消去対象が変わってしまう。
 */
export const appendPoint = (
    stack: StrokeStack,
    stroke_id: string,
    point: WorldPoint,
    style: StrokeStyle,
): void => {
    const cachedIndex = stack.activeIndex.get(stroke_id);
    if (cachedIndex !== undefined) {
        const cachedEntry = stack.entries[cachedIndex];
        if (
            cachedEntry !== undefined &&
            cachedEntry.entryType === "stroke" &&
            cachedEntry.stroke.stroke_id === stroke_id
        ) {
            cachedEntry.stroke.push(point);
            return;
        }
    }

    for (let i = stack.entries.length - 1; i >= 0; i--) {
        const entry = stack.entries[i];
        if (entry.entryType === "reset") break;
        if (entry.stroke.stroke_id === stroke_id) {
            entry.stroke.push(point);
            stack.activeIndex.set(stroke_id, i);
            return;
        }
    }

    stack.entries.push({ entryType: "stroke", stroke: createStroke(stroke_id, style, point) });
    stack.activeIndex.set(stroke_id, stack.entries.length - 1);
};

/**
 * reset の印を積む。ストロークそのものは削除しない。
 * 将来 undo を実装する際、この印を pop すれば reset 前の絵が復元できる。
 *
 * activeIndex はここで clear する。reset より前のストロークへ、reset を
 * またいで継続扱いで追記してしまわないようにするため（stroke_id が
 * 再利用されるケースを含む）。
 */
export const appendReset = (
    stack: StrokeStack,
    controller_id: string,
    timestamp: number,
): void => {
    stack.entries.push({ entryType: "reset", controller_id, timestamp });
    stack.activeIndex.clear();
};

/**
 * entries を length に切り詰め、activeIndex も clear する。
 * undo/redo の History 側が「未来の破棄」で配列を切り詰める際に使う。
 * 切り詰めで無効になったインデックスを activeIndex が指し続けないよう、
 * 必ずこの関数を通して切り詰めること（直接 entries.length を書き換えない）。
 */
export const truncateStack = (stack: StrokeStack, length: number): void => {
    stack.entries.length = length;
    stack.activeIndex.clear();
};

/**
 * 描画すべきストロークだけを順番通り列挙する出口。
 * 「末尾から見て直近の ResetMarker より後ろ」だけが対象で、それより前の
 * ストロークは reset 済みとして扱う（配列からは消えていないが描画対象外）。
 * Stroke.forEachPoint と同じく、内部構造を呼び出し側に見せないための
 * 唯一の読み取り口。
 *
 * 引数はプレーンな StrokeStackEntry[]（StrokeStack ではない）。History 側で
 * cursor までを slice した「今アクティブな範囲」のスナップショットを渡す
 * 想定で、activeIndex キャッシュとは無関係な読み取り専用の一覧だから。
 */
export const forEachVisibleStroke = (
    entries: StrokeStackEntry[],
    callback: (stroke: Stroke) => void,
): void => {
    let lastResetIndex = -1;
    for (let i = entries.length - 1; i >= 0; i--) {
        if (entries[i].entryType === "reset") {
            lastResetIndex = i;
            break;
        }
    }
    for (let i = lastResetIndex + 1; i < entries.length; i++) {
        const entry = entries[i];
        if (entry.entryType === "stroke") {
            callback(entry.stroke);
        }
    }
};
