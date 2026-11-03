/**
 * 概要: undo/redo のための行動ログ（History）。
 *
 * 目的: 完了したストローク/resetの実体を持つ唯一の場所を
 * StrokeStack から History へ移す。「今どこまで見せるか」を cursor で表現し、
 * 描画には cursor までの部分配列だけを渡すことで undo/redo を実現する。
 *
 * StrokeStack 自体の関数（appendPoint / appendReset / truncateStack /
 * forEachVisibleStroke）が何をするかは知らず、呼ぶだけに留める。継続判定の
 * キャッシュなど、ストロークの格納方法に関する詳細は stroke_stack.ts 側に
 * 閉じ込め、History はその上に「範囲」の概念を足すだけの薄い層に留める。
 */

import type { WorldPoint } from "../schema_common/point";
import type { StrokeStyle } from "../stroke/stroke";
import type { StrokeStack, StrokeStackEntry } from "../stroke/stroke_stack";
import { appendPoint, appendReset, createStrokeStack, truncateStack } from "../stroke/stroke_stack";

export type History = {
    /** 完了したアクションの実体。append-only の唯一の実体はここに置く */
    actions: StrokeStack;
    /** アクティブなアクション数。0〜actions.entries.length。undo/redo で前後する */
    cursor: number;
};

export const createHistory = (): History => ({ actions: createStrokeStack(), cursor: 0 });

/**
 * cursor より後ろに「やり直し可能な未来」が残っている状態で新しい記録が
 * 始まったら、その未来を破棄する。分岐を持たない線形 undo/redo を
 * 採用しているため（判断基準は undo-redo-design.md を参照）。
 */
const discardFuture = (history: History): void => {
    if (history.cursor < history.actions.entries.length) {
        truncateStack(history.actions, history.cursor);
    }
};

/**
 * 点を 1 つ記録する。write/erase の到着ごとに呼ぶ。
 * 内部は既存の appendPoint（stroke_id ごとに続き/新規を判定）をそのまま利用する。
 */
export const recordPoint = (
    history: History,
    stroke_id: string,
    point: WorldPoint,
    style: StrokeStyle,
): void => {
    discardFuture(history);
    appendPoint(history.actions, stroke_id, point, style);
    history.cursor = history.actions.entries.length;
};

/**
 * reset の印を記録する。reset も他のアクションと同じ 1 エントリなので、
 * undo すればこの印より前を指すようになり、隠れていたストロークが
 * 自動的に再表示される（reset 専用の復元処理は持たない）。
 */
export const recordReset = (
    history: History,
    controller_id: string,
    timestamp: number,
): void => {
    discardFuture(history);
    appendReset(history.actions, controller_id, timestamp);
    history.cursor = history.actions.entries.length;
};

/** 1 つ前のアクションへ戻す。すでに先頭なら何もしない */
export const undo = (history: History): void => {
    if (history.cursor > 0) {
        history.cursor -= 1;
    }
};

/** 1 つ先のアクションへ進める。すでに末尾なら何もしない */
export const redo = (history: History): void => {
    if (history.cursor < history.actions.entries.length) {
        history.cursor += 1;
    }
};

/**
 * renderer に渡す「今アクティブな範囲」を切り出す出口。
 * slice した結果はキャッシュを持たないプレーンな配列になるため、
 * forEachVisibleStroke（StrokeStackEntry[] を受け取る）にそのまま渡せる。
 */
export const visibleStack = (history: History): StrokeStackEntry[] =>
    history.actions.entries.slice(0, history.cursor);