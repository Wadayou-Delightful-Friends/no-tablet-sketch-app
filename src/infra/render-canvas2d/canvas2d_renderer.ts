/**
 * Renderer port の Canvas2D 実装。
 * render() のたびに全消し→全ストローク再描画する immediate mode。
 * パン・ズームで画面全体が変わる無限キャンバスでは差分描画の管理が
 * 複雑になるため、まずは単純さを優先した（docs/feature_canvas/rendering.md）。
 */

import type { Renderer } from "../../domain/ports/renderer";
import type { Scene } from "../../domain/scene/scene";
import type { Stroke } from "../../domain/stroke/stroke";
import type { ScreenPoint } from "../../domain/schema_common/point";
import { worldToScreen, worldLengthToScreen } from "../../domain/camera/camera";

const STROKE_COLOR = "#222222";

export const createCanvas2dRenderer = (canvas: HTMLCanvasElement): Renderer => {
    const context = canvas.getContext("2d");
    if (context === null) {
        throw new Error("Canvas2D context is not available");
    }

    const drawStroke = (scene: Scene, stroke: Stroke): void => {
        const screenPoints: ScreenPoint[] = [];
        stroke.forEachPoint((point) => screenPoints.push(worldToScreen(scene.camera, point)));
        const screenLineWidth = worldLengthToScreen(scene.camera, stroke.radius * 2);

        // 1 点だけのストローク（クリックのみ）は線にならないためドットとして描く
        if (screenPoints.length === 1) {
            context.beginPath();
            context.arc(screenPoints[0].x, screenPoints[0].y, screenLineWidth / 2, 0, Math.PI * 2);
            context.fillStyle = STROKE_COLOR;
            context.fill();
            return;
        }

        context.beginPath();
        context.moveTo(screenPoints[0].x, screenPoints[0].y);
        for (const screenPoint of screenPoints.slice(1)) {
            context.lineTo(screenPoint.x, screenPoint.y);
        }
        context.strokeStyle = STROKE_COLOR;
        context.lineWidth = screenLineWidth;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.stroke();
    };

    return {
        render(scene: Scene): void {
            context.clearRect(0, 0, canvas.width, canvas.height);
            for (const stroke of scene.strokes) {
                drawStroke(scene, stroke);
            }
        },
    };
};
