/**
 * シーン：キャンバスに映すすべての状態。
 * 「何が描かれているか（strokes）」と「どこを見ているか（camera）」の 2 つで
 * 無限キャンバスを表現する。描画側はこの Scene だけを受け取れば全体を描ける。
 */

import type { Camera } from "../camera/camera";
import { createCamera } from "../camera/camera";
import type { StrokeStack } from "../stroke/stroke_stack";
import { createStrokeStack } from "../stroke/stroke_stack";

export type Scene = {
    camera: Camera;
    strokes: StrokeStack;
}

export const createScene = (): Scene => ({
    camera: createCamera(),
    strokes: createStrokeStack(),
});
