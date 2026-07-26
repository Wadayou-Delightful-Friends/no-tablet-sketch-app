/**
 * 【追加】React のライフサイクルと描画一式（Scene / Renderer / Dispatcher）の
 * 寿命を橋渡しするフック。ページと domain / infra の唯一の接続点。
 *
 * Scene は可変オブジェクトのため、再レンダーのたびに作り直すと描いた絵が消える。
 * そこで ref に保持し、マウント時に一度だけ組み立てる。
 *
 * 将来スマホからのコマンド受信を繋ぐ際も、dispatcher を持つこの場所が接続先になる
 * （入力源が sketch_input から受信アダプタへ差し替わるだけで、このフックは残る）。
 */

import { useCallback, useEffect, useRef } from "react";
import { createScene } from "../../domain/scene/scene";
import type { Scene } from "../../domain/scene/scene";
import { createCommandDispatcher } from "../../domain/command/command_dispatcher";
import { createCanvas2dRenderer } from "../../infra/render-canvas2d/canvas2d_renderer";
import type { Renderer } from "../../domain/ports/renderer";
import { DEFAULT_ZOOM_SETTINGS } from "../../domain/camera/camera";
import { attachSketchInput } from "./sketch_input";
import { startDisplay } from "../session/display-session";
import { parseCommand } from "../../domain/command/command_validator";

export function useSketchCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  /** マウント後に組み立てる描画一式。リサイズ時の再描画で参照する */
  const sessionRef = useRef<{ scene: Scene; renderer: Renderer } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 子（CanvasSurface）の effect は親より先に実行されるため、この時点で
    // CSS サイズ・バッキングストア・ctx.scale はすでに設定済み。
    // 座標系は CSS px で統一するので、デバイス px の canvas.width ではなく
    // clientWidth / clientHeight を使う
    const scene = createScene({
      x: canvas.clientWidth / 2,
      y: canvas.clientHeight / 2,
    });
    const renderer = createCanvas2dRenderer(canvas);
    const dispatcher = createCommandDispatcher(scene, renderer, DEFAULT_ZOOM_SETTINGS);
    const detachInput = attachSketchInput(canvas, dispatcher.applyCommand);

    startDisplay("test-room", (peerId, msg) => {
      console.log("受信したメッセージ on useSketchCanvas:", peerId, msg);
      // パース
      const command = parseCommand(msg);
      // エラーチェック
      if (command instanceof Error) {
        console.warn("受信コマンドのパースエラー:", command.message);
        return;
      }
      // 正規化座標をスクリーン比率に変換して dispatcher に渡す
      if(command.type === "write" || command.type === "erase") {
        const normalizedX = command.point.x * canvas.clientWidth;
        const normalizedY = command.point.y * canvas.clientHeight;
        const transformedCommand = { ...command, point: { x: normalizedX, y: normalizedY } };
        // 適用
        dispatcher.applyCommand(transformedCommand);
        return;
      }
      // 適用
      dispatcher.applyCommand(command);
    });

    sessionRef.current = { scene, renderer };
    renderer.render(scene);

    return () => {
      detachInput();
      sessionRef.current = null;
    };
  }, []);

  /**
   * canvas.width への再代入でビットマップが消えるため、リサイズ後に描き直す。
   *
   * カメラは初期レイアウト基準のまま維持し、再センタリングはしない。
   * リサイズのたびに原点を動かすと描いた絵がずれるため、
   * 広がった分は「見える範囲が増える」だけにしている。
   */
  const handleResize = useCallback(() => {
    const session = sessionRef.current;
    // マウント時の初回通知は上の effect より先に届くので、その分は無視してよい
    // （初回描画は effect 側で行う）
    if (session === null) return;
    session.renderer.render(session.scene);
  }, []);

  return { canvasRef, handleResize };
}
