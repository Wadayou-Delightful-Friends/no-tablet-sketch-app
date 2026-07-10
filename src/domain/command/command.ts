/** コマンドの定義 */

import type { ScreenPoint } from "../common/point";

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

// /**
//  * カメラ移動：差分ではなく絶対位置を送り、last-write-wins で順序の乱れに耐える。
//  * position はワールド座標系になりうるため ScreenPoint を流用せず、実装時に
//  * 座標系を確認してから型を決めること。
//  */
// export type MoveCommand = {
//     type: "move";
//     controller_id: string;
//     seq: number;
//     timestamp: number;
//     position: unknown;
// }

// /** 拡大縮小：絶対スケールを送る */
// export type ZoomCommand = {
//     type: "zoom";
//     controller_id: string;
//     seq: number;
//     timestamp: number;
//     scale: number;
// }

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
    | EraseCommand;
