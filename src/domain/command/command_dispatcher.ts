import type { Command } from "./command";
import type { Scene } from "../scene/scene";
import type { Renderer } from "../ports/renderer";
import type { ZoomSettings } from "../camera/camera";
import { panBy, zoomAt, screenToWorld } from "../camera/camera";
import { recordPoint, recordReset, undo, redo } from "../history/history";

/**
 * コマンドを Scene に適用し、port 経由で再描画を依頼するディスパッチャ。
 * 入力側（DOM イベント等）はここに Command を渡すだけでよく、
 * Scene の構造や描画技術を知らずに済む。
 * zoomSettings: zoom コマンド適用時のクランプ範囲（呼び出し側が調整できる）。
 */
export const createCommandDispatcher = (
    scene: Scene,
    renderer: Renderer,
    zoomSettings: ZoomSettings,
) => {
    const applyCommand = (command: Command): void => {
        switch (command.type) {
            case "write":
            case "erase": {
                // write と erase は座標変換も記録の仕方も同一で、描画側での
                // 合成モードだけが違う。その違いはストロークの kind として持たせる。
                // 入力は画面座標で届くので、その時点のカメラでワールド座標へ
                // 変換してから記録する。以後カメラが動いても点は動かない。
                // radius も同様に画面 px からワールド単位へ変換する
                const worldPoint = screenToWorld(scene.camera, command.point);
                // const worldRadius = screenLengthToWorld(scene.camera, command.radius);
                const kind = command.type === "write" ? "PEN_DEFAULT" : "ERASE_DEFAULT";
                recordPoint(scene.history, command.stroke_id, worldPoint, { kind, radius: command.radius });
                break;
            }
            case "reset":
                // 削除ではなく「reset の印」を積む。undo 実装時にこの印を
                // pop すれば reset 前の絵が復元できる（append-only の維持）。
                recordReset(scene.history, command.controller_id, command.timestamp);
                break;
            case "undo":
                undo(scene.history);
                break;
            case "redo":
                redo(scene.history);
                break;
            case "move":
                scene.camera = panBy(scene.camera, command.delta);
                break;
            case "zoom":
                scene.camera = zoomAt(scene.camera, command.anchor, command.factor, zoomSettings);
                break;
            default:
                throw new Error(`Unknown command`);
        }
        // コマンド適用後に必ず再描画する。
        renderer.render(scene);
    };

    return { applyCommand };
};
