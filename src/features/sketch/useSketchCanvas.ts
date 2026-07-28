/**
 * 【追加】React のライフサイクルと描画一式（Scene / Renderer / Dispatcher）の
 * 寿命を橋渡しするフック。ページと domain / infra の唯一の接続点。
 *
 * Scene は可変オブジェクトのため、再レンダーのたびに作り直すと描いた絵が消える。
 * そこで ref に保持し、マウント時に一度だけ組み立てる。
 *
 * 遠隔からのコマンドは、このフックが公開する handleRemoteMessage を
 * 入力口として受け取る。セッションの生成・停止はページ側の責務にして、
 * フック自身は通信手段（WebRTC / signaling）を一切知らない。
 * これにより入力源を実接続 / テスト用フェイク / リプレイに差し替えられる。
 */

import { useCallback, useEffect, useRef } from "react";
import { createScene } from "../../domain/scene/scene";
import type { Scene } from "../../domain/scene/scene";
import { createCommandDispatcher } from "../../domain/command/command_dispatcher";
import { createCanvas2dRenderer } from "../../infra/render-canvas2d/canvas2d_renderer";
import type { Renderer } from "../../domain/ports/renderer";
import { DEFAULT_ZOOM_SETTINGS } from "../../domain/camera/camera";
import { attachSketchInput } from "./sketch_input";
import { parseCommand } from "../../domain/command/command_validator";
import { toScreenCommand } from "./normalized_command";

type Dispatcher = ReturnType<typeof createCommandDispatcher>;

export function useSketchCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  /** マウント後に組み立てる描画一式。リサイズ時の再描画と受信適用で参照する */
  const sessionRef = useRef<{
    scene: Scene;
    renderer: Renderer;
    dispatcher: Dispatcher;
  } | null>(null);

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

    sessionRef.current = { scene, renderer, dispatcher };
    renderer.render(scene);

    return () => {
      detachInput();
      sessionRef.current = null;
    };
  }, []);

  /**
   * 遠隔から届いたメッセージを描画へ流す入力口。
   * 呼び出し側が Receiver（や任意の入力源）に繋ぎ込む前提で、
   * 参照が変わらないよう useCallback で固定している。
   */
  const handleRemoteMessage = useCallback((peerId: string, msg: unknown) => {
    const session = sessionRef.current;
    const canvas = canvasRef.current;
    // 組み立て前に届いた分は捨てる（描画先がまだない）
    if (session === null || canvas === null) return;

    console.log("受信したメッセージ on useSketchCanvas:", peerId, msg);
    // パース（ここで得られるのは正規化座標のコマンド）
    const command = parseCommand(msg);
    // エラーチェック
    if (command instanceof Error) {
      console.warn("受信コマンドのパースエラー:", command.message);
      return;
    }
    // 画面 px へ変換して適用する。基準はリサイズで変わるので、届いた時点の実サイズを使う
    const viewport = { width: canvas.clientWidth, height: canvas.clientHeight };
    session.dispatcher.applyCommand(toScreenCommand(viewport, command));
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

  return { canvasRef, handleResize, handleRemoteMessage };
}
