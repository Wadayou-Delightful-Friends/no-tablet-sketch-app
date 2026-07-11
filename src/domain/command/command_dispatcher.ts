import type { Command } from "./command";
import type { Scene } from "../scene/scene";
import type { Renderer } from "../ports/renderer";
import { panBy, zoomAt, screenToWorld } from "../camera/camera";
import { appendPoint } from "../stroke/stroke_stack";

/**
 * コマンドを Scene に適用し、port 経由で再描画を依頼するディスパッチャ。
 * 入力側（DOM イベント等）はここに Command を渡すだけでよく、
 * Scene の構造や描画技術を知らずに済む。
 */
export const createCommandDispatcher = (scene: Scene, renderer: Renderer) => {
    const applyCommand = (command: Command): void => {
        switch (command.type) {
            case "write": {
                // 入力は画面座標で届くので、その時点のカメラでワールド座標へ
                // 変換してから記録する。以後カメラが動いても点は動かない。
                // radius も同様に画面 px からワールド単位へ変換する（描いた瞬間の
                // 見た目の太さを保ち、以後はズームに追従させるため）
                const worldPoint = screenToWorld(scene.camera, command.point);
                const worldRadius = command.radius / scene.camera.scale;
                appendPoint(scene.strokes, command.stroke_id, worldRadius, worldPoint);
                break;
            }
            case "move":
                scene.camera = panBy(scene.camera, command.delta);
                break;
            case "zoom":
                scene.camera = zoomAt(scene.camera, command.anchor, command.factor);
                break;
            case "erase":
                // 未実装（今回のスコープ外）
                break;
            default:
                throw new Error(`Unknown command`);
        }
        renderer.render(scene);
    };

    return { applyCommand };
};
