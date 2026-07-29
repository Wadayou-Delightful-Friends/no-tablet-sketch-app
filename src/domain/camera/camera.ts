/**
 * カメラ：無限キャンバス（ワールド座標）のどこを・どの倍率で画面に映すかを表す。
 * 変換式は screen = world * scale + translation（translation は画面 px）。
 *
 * 座標・長さの変換式はすべてこのモジュールに集約する。他の場所に
 * `(x - translation) / scale` のような式を書かないこと（変換式が散らばると
 * 符号ミス・かけ忘れ・二重変換のバグの温床になるため）。
 *
 * 各関数は引数の Camera を変更せず新しい Camera を返す。描画中のカメラを
 * 参照している箇所へ変更途中の状態が漏れないようにするためと、テストで
 * 入出力だけを見れば済むようにするため。
 */

import type { ScreenPoint, WorldPoint } from "../schema_common/point";

export type Camera = {
    scale: number;
    translation: ScreenPoint;
}

/**
 * ズームの調整パラメータ。数値をロジックに埋め込まず、ここを書き換える
 * （または呼び出し側が別の値を渡す）だけで範囲・段階数を変えられるようにする。
 */
export type ZoomSettings = {
    /** scale の下限（これ以上縮小できない） */
    minScale: number;
    /** scale の上限（これ以上拡大できない） */
    maxScale: number;
    /** minScale から maxScale までを等比で刻む段階数 */
    stepCount: number;
}

/** 既定値：1/8〜8倍を20段階（1段階あたり約1.26倍）。使い勝手のための制限で、精度保護ではない */
export const DEFAULT_ZOOM_SETTINGS: ZoomSettings = {
    minScale: 1 / 8,
    maxScale: 8,
    stepCount: 20,
};

/**
 * 1段階あたりのズーム倍率を等比で導出する: (maxScale / minScale)^(1 / stepCount)。
 * 足し算ではなく掛け算で刻むのは、等差だと縮小側が速く・拡大側が遅く感じられるため。
 * 入力層（ホイール1目盛り・ピンチ等）はこの値を ZoomCommand の factor に使う。
 */
export const zoomFactorPerStep = (settings: ZoomSettings): number =>
    (settings.maxScale / settings.minScale) ** (1 / settings.stepCount);

/**
 * 初期カメラ：等倍で、ワールド原点 (0,0) を指定した画面位置に置く。
 * 初期表示の中央を渡せば「新規キャンバスの中央が原点」になる。
 * 無限キャンバスでは負のワールド座標も正常な値として扱う。
 */
export const createCamera = (worldOriginOnScreen: ScreenPoint): Camera => ({
    scale: 1,
    translation: { x: worldOriginOnScreen.x, y: worldOriginOnScreen.y },
});

export const worldToScreen = (camera: Camera, world: WorldPoint): ScreenPoint => ({
    x: world.x * camera.scale + camera.translation.x,
    y: world.y * camera.scale + camera.translation.y,
});

export const screenToWorld = (camera: Camera, screen: ScreenPoint): WorldPoint => ({
    x: (screen.x - camera.translation.x) / camera.scale,
    y: (screen.y - camera.translation.y) / camera.scale,
});

/**
 * 画面上の長さ（px）をワールド上の長さへ変換する。
 * ペンの太さ（画面 px 指定）をワールド単位で保存する時などに使う。
 * 位置と違い translation は関係せず、scale だけで決まる。
 */
export const screenLengthToWorld = (camera: Camera, screenLength: number): number =>
    screenLength / camera.scale;

/**
 * ワールド上の長さを画面上の長さ（px）へ変換する。screenLengthToWorld の逆。
 * ワールド単位で保存した線の太さを、描画時に画面 px へ戻す時などに使う。
 */
export const worldLengthToScreen = (camera: Camera, worldLength: number): number =>
    worldLength * camera.scale;

/** 画面上の移動量（px）ぶんだけ表示を平行移動する */
export const panBy = (camera: Camera, delta: ScreenPoint): Camera => ({
    scale: camera.scale,
    translation: {
        x: camera.translation.x + delta.x,
        y: camera.translation.y + delta.y,
    },
});

/**
 * anchor（画面上の点。通常はカーソル位置）を動かさずに factor 倍ズームする。
 * anchor 直下にあるワールド点がズーム後も同じ画面位置に来るよう translation を再計算する。
 *
 * 新しい scale は settings の [minScale, maxScale] にクランプする。無制限に
 * ズームできるとユーザーが自分の位置を見失うため。クランプで scale が変わらない
 * 場合、translation の再計算結果も元の値と一致する（anchor 不変条件は保たれる）。
 */
export const zoomAt = (
    camera: Camera,
    anchor: ScreenPoint,
    factor: number,
    settings: ZoomSettings,
): Camera => {
    const worldAtAnchor = screenToWorld(camera, anchor);
    const newScale = Math.min(settings.maxScale, Math.max(settings.minScale, camera.scale * factor));
    return {
        scale: newScale,
        translation: {
            x: anchor.x - worldAtAnchor.x * newScale,
            y: anchor.y - worldAtAnchor.y * newScale,
        },
    };
};
