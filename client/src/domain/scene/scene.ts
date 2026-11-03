/**
 * シーン：キャンバスに映すすべての状態。
 * 「何が描かれているか（strokes）」と「どこを見ているか（camera）」の 2 つで
 * 無限キャンバスを表現する。描画側はこの Scene だけを受け取れば全体を描ける。
 */

import type { Camera } from "../camera/camera";
import { createCamera } from "../camera/camera";
import type { ScreenPoint } from "../schema_common/point";
//import type { StrokeStack } from "../stroke/stroke_stack";
//import { createStrokeStack } from "../stroke/stroke_stack";
import type { History } from "../history/history";
import { createHistory } from "../history/history";


export type Scene = {
    camera: Camera;
    history: History;
}

/**
 * 空のシーンを作る。
 * worldOriginOnScreen: ワールド原点 (0,0) を置く画面位置。表示エリアの中央を
 * 渡すことで「新規キャンバスの初期表示中央 = 原点」にする（画面端を原点に
 * すると、左・上へ描くだけで座標が偏り、原点の位置に意味がなくなるため）。
 */
export const createScene = (worldOriginOnScreen: ScreenPoint): Scene => ({
    camera: createCamera(worldOriginOnScreen),
    history: createHistory(),
});
