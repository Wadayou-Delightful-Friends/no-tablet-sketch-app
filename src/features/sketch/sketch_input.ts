/**
 * Author: Claude Opus
 * 【追加・削除予定】PC のマウス／ポインタ入力を Command に変換する暫定の足場。
 *
 * 本来の入力源はスマホ（コントローラ）側であり、このファイルは通信層が
 * 未実装の間だけ PC ブラウザ単体で描画を動作確認するために置いている。
 * 受信アダプタ（domain/ports/receiver.ts の実装）が入ったらこのファイルごと削除し、
 * useSketchCanvas の接続先を受信アダプタへ差し替える。
 *
 * 役割としては「DOM イベント → Command」の変換層（React 非依存）。
 * src/ の他の層は Command を受け取ってからの処理だけを持ち、DOM API に依存しない
 * （境界の理由は docs/feature_canvas/input-and-demo.md）。
 *
 * 操作:
 * - 左ドラッグ: 描く（WriteCommand）
 * - E を押しながら左ドラッグ: 消す（EraseCommand）※トラックパッドでも押しやすいキー割り当て（テスト用暫定）
 * - Space を押しながらドラッグ / 中ボタンドラッグ: 移動（MoveCommand）
 * - ホイール: カーソル位置を中心に拡大縮小（ZoomCommand）
 */

import { DEFAULT_ZOOM_SETTINGS, zoomFactorPerStep } from "../../domain/camera/camera";
import type { Command, MoveCommand, ZoomCommand } from "../../domain/command/command";
import type { ScreenPoint } from "../../domain/schema_common/point";

/** ローカル入力であることを示す発行元 ID。スマホ側が繋がれば別 ID が併存する */
const CONTROLLER_ID = "local";
const PEN_RADIUS_SCREEN_PX = 2;
/** 消しゴムの半径。テストで消し跡が見やすいようペンより太くしている */
const ERASE_RADIUS_SCREEN_PX = 12;
/** ホイール1目盛り＝ズーム1段階。段階数・範囲は DEFAULT_ZOOM_SETTINGS で調整する */
const zoomFactorPerWheelTick = zoomFactorPerStep(DEFAULT_ZOOM_SETTINGS);

/**
 * canvas にローカル入力のリスナーを張り、Command に変換して sendCommand へ渡す。
 *
 * 引数 canvas: 入力を受け取る canvas 要素
 * 引数 sendCommand: 生成した Command の送り先（通常は dispatcher.applyCommand）
 * 戻り値: 張ったリスナーをすべて解除する関数
 */
export const attachSketchInput = (
    canvas: HTMLCanvasElement,
    sendCommand: (command: Command) => void,
): (() => void) => {
    /** コマンド envelope（controller_id / seq / timestamp）の採番。変換層が持つ唯一の連番状態 */
    let commandSeq = 0;
    const nextEnvelope = () => ({
        controller_id: CONTROLLER_ID,
        seq: ++commandSeq,
        timestamp: Date.now(),
    });

    // 座標は CSS px で扱う。canvas のバッキングストアは devicePixelRatio 倍だが、
    // 2D コンテキスト側が同じ倍率でスケール済みのため、変換は不要
    const toCanvasPoint = (event: PointerEvent | WheelEvent): ScreenPoint => {
        const bounds = canvas.getBoundingClientRect();
        return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    };

    // 描く/消すは envelope・stroke_id・point が同じで type と radius だけ違う。
    // 分岐ごとに type を確定させて Command のいずれかの型に合流させる
    const buildStrokeCommand = (
        isErase: boolean,
        stroke_id: string,
        point: ScreenPoint,
    ): Command => {
        const body = {
            ...nextEnvelope(),
            stroke_id,
            radius: isErase ? ERASE_RADIUS_SCREEN_PX : PEN_RADIUS_SCREEN_PX,
            point,
        };
        return isErase ? { type: "erase", ...body } : { type: "write", ...body };
    };

    // ---- 入力状態（ドラッグ中の判定に必要な最小限だけ持つ） ----

    let strokeCount = 0;
    /** 描画ドラッグ中のストローク ID。null なら描いていない */
    let activeStrokeId: string | null = null;
    /** 進行中ストロークが消しゴムか。pointerdown で確定し move へ引き継ぐ */
    let activeStrokeIsErase = false;
    /** パンドラッグ中の前回ポインタ位置。null ならパンしていない */
    let lastPanPoint: ScreenPoint | null = null;
    let isSpacePressed = false;
    /** E 押下中か。左ドラッグを消しゴムにする修飾キー */
    let isErasePressed = false;

    // ---- 標準リスナーイベント → Command ----

    const handlePointerDown = (event: PointerEvent): void => {
        // キャプチャしておくと、canvas の外へ出てもドラッグを追い続けられる
        canvas.setPointerCapture(event.pointerId);
        const isPanGesture = isSpacePressed || event.button === 1;
        if (isPanGesture) {
            lastPanPoint = toCanvasPoint(event);
            return;
        }
        // E 押下中は消しゴム、そうでなければ描画。ストローク開始時に確定し、
        // 途中で E を離しても最後まで同じ種別で描き切る
        activeStrokeIsErase = isErasePressed;
        activeStrokeId = `${CONTROLLER_ID}:${++strokeCount}`;
        sendCommand(buildStrokeCommand(activeStrokeIsErase, activeStrokeId, toCanvasPoint(event)));
    };

    const handlePointerMove = (event: PointerEvent): void => {
        if (lastPanPoint !== null) {
            const currentPoint = toCanvasPoint(event);
            const command: MoveCommand = {
                type: "move",
                ...nextEnvelope(),
                delta: { x: currentPoint.x - lastPanPoint.x, y: currentPoint.y - lastPanPoint.y },
            };
            lastPanPoint = currentPoint;
            sendCommand(command);
            return;
        }
        if (activeStrokeId !== null) {
            sendCommand(buildStrokeCommand(activeStrokeIsErase, activeStrokeId, toCanvasPoint(event)));
        }
    };

    /** ドラッグ終了。pointerup と pointercancel（OS 割り込み等）で共通 */
    const handlePointerEnd = (): void => {
        activeStrokeId = null;
        lastPanPoint = null;
    };

    const handleWheel = (event: WheelEvent): void => {
        // ブラウザのページズーム・スクロールを抑止してキャンバスのズームに割り当てる
        event.preventDefault();
        const zoomIn = event.deltaY < 0;
        const command: ZoomCommand = {
            type: "zoom",
            ...nextEnvelope(),
            anchor: toCanvasPoint(event),
            factor: zoomIn ? zoomFactorPerWheelTick : 1 / zoomFactorPerWheelTick,
        };
        sendCommand(command);
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
        if (event.code === "Space") {
            // Space スクロールを抑止してパン用の修飾キーにする
            event.preventDefault();
            isSpacePressed = true;
        }
        if (event.code === "KeyE") {
            isErasePressed = true;
        }
    };

    const handleKeyUp = (event: KeyboardEvent): void => {
        if (event.code === "Space") {
            isSpacePressed = false;
        }
        if (event.code === "KeyE") {
            isErasePressed = false;
        }
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerEnd);
    canvas.addEventListener("pointercancel", handlePointerEnd);
    // preventDefault するため passive: false が必須
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    // 修飾キーは canvas がフォーカスを持たないため window で拾う
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
        canvas.removeEventListener("pointerdown", handlePointerDown);
        canvas.removeEventListener("pointermove", handlePointerMove);
        canvas.removeEventListener("pointerup", handlePointerEnd);
        canvas.removeEventListener("pointercancel", handlePointerEnd);
        canvas.removeEventListener("wheel", handleWheel);
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
    };
};
