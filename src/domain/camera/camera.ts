/**
 * カメラ：無限キャンバス（ワールド座標）のどこを・どの倍率で画面に映すかを表す。
 * 変換式は screen = world * scale + translation（translation は画面 px）。
 *
 * 各関数は引数の Camera を変更せず新しい Camera を返す。描画中のカメラを
 * 参照している箇所へ変更途中の状態が漏れないようにするためと、テストで
 * 入出力だけを見れば済むようにするため。
 */

import type { ScreenPoint, WorldPoint } from "../common/point";

export type Camera = {
    scale: number;
    translation: ScreenPoint;
}

/** 初期カメラ：ワールド原点が画面左上、等倍 */
export const createCamera = (): Camera => ({
    scale: 1,
    translation: { x: 0, y: 0 },
});

export const worldToScreen = (camera: Camera, world: WorldPoint): ScreenPoint => ({
    x: world.x * camera.scale + camera.translation.x,
    y: world.y * camera.scale + camera.translation.y,
});

export const screenToWorld = (camera: Camera, screen: ScreenPoint): WorldPoint => ({
    x: (screen.x - camera.translation.x) / camera.scale,
    y: (screen.y - camera.translation.y) / camera.scale,
});

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
 */
export const zoomAt = (camera: Camera, anchor: ScreenPoint, factor: number): Camera => {
    const worldAtAnchor = screenToWorld(camera, anchor);
    const newScale = camera.scale * factor;
    return {
        scale: newScale,
        translation: {
            x: anchor.x - worldAtAnchor.x * newScale,
            y: anchor.y - worldAtAnchor.y * newScale,
        },
    };
};
