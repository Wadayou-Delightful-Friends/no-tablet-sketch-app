/** コマンドの定義 */

import type { ScreenPoint } from "../schema_common/point";

/**
 * 書く：1コマンド＝1点。描画側が stroke_id ごとに点を集め seq 順に連結して描く。
 * 線分ではなく点なので、1点ロストしても隣どうしを繋ぐだけで線は途切れない。
 *
 * - controller_id: 発行元コントローラの識別子。複数コントローラのコマンドを混ぜないための鍵
 * - seq: コントローラごとの単調増加の通し番号。点の連結順序・欠落検出・重複排除に使う
 * - timestamp: コマンド生成時刻（epoch ms）。コントローラをまたいだ大まかな順序付けに使う
 * - stroke_id: ストロークの識別子。`${controller_id}:${連番}` で生成し、コントローラ間で衝突させない
 */
export type WriteCommand = {
    type: "write";
    controller_id: string;
    seq: number;
    timestamp: number;
    stroke_id: string;
    radius: number;
    point: ScreenPoint;
}

/** 消す：write と対称の点ベース（消しゴム軌跡） */
export type EraseCommand = {
    type: "erase";
    controller_id: string;
    seq: number;
    timestamp: number;
    stroke_id: string;
    radius: number;
    point: ScreenPoint;
}

/**
 * カメラ移動：画面上の移動量（差分）を送る。
 * 絶対位置（LWW）案もあったが、現状はローカル単一ソースで欠落・順序乱れが
 * 起きないため、入力層が状態を持たずに済む差分を採用した。
 * 経緯とトレードオフは docs/feature_canvas/command-model.md を参照。
 */
export type MoveCommand = {
    type: "move";
    controller_id: string;
    seq: number;
    timestamp: number;
    /** 画面上の移動量（px）。指の動きをそのまま送る */
    delta: ScreenPoint;
}

/** 拡大縮小：anchor（画面上の固定点。通常はカーソル位置）を中心に factor 倍する差分を送る */
export type ZoomCommand = {
    type: "zoom";
    controller_id: string;
    seq: number;
    timestamp: number;
    anchor: ScreenPoint;
    /** 現在の scale に掛ける倍率（1 より大で拡大、小で縮小） */
    factor: number;
}

/**
 * リセット：キャンバスの全ストロークを消去する。
 * write/erase と違い点ベースの累積ではなく、状態を一括で空にする操作のため、
 * 固有のペイロードは持たない（共通フィールドのみ）。
 *
 * 現時点では非破壊（append-only）の原則の外側にある操作。
 * このコマンド適用後は、それ以前のストロークを undo で戻すことはできない
 * （undo/redo 実装時に要検討）。
 */
export type ResetCommand = {
    type: "reset";
    controller_id: string;
    seq: number;
    timestamp: number;
}

// /** 取り消し：対象ストロークを明示し、自分のストロークだけを取り消せるようにする */
// export type UndoCommand = {
//     type: "undo";
//     controller_id: string;
//     seq: number;
//     timestamp: number;
//     stroke_id: string;
// }

// /** やり直し */
// export type RedoCommand = {
//     type: "redo";
//     controller_id: string;
//     seq: number;
//     timestamp: number;
//     stroke_id: string;
// }

export type Command =
    | WriteCommand
    | EraseCommand
    | ResetCommand
    | MoveCommand
    | ZoomCommand;
