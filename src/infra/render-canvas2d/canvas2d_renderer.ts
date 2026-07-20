/**
 * 概要: Renderer port の Canvas2D 実装。
 *
 * 目的: 描画技術（Canvas2D API）への依存をこのファイルに閉じ込め、
 * domain 側が Scene の内容だけを考えられるようにする。
 *
 * 方式は render() のたびに全消し→全ストローク再描画する immediate mode。
 * パン・ズームで画面全体が変わる無限キャンバスでは差分描画の管理が
 * 複雑になるため、まずは単純さを優先した。「Scene を渡せば必ず正しい絵になる」
 * という保証を隠れた状態なしで成立させている
 * （採用理由の詳細は docs/feature_canvas/001_canvas_prototype/rendering.md）。
 */

import type { Renderer } from "../../domain/ports/renderer";
import type { Scene } from "../../domain/scene/scene";
import type { Stroke } from "../../domain/stroke/stroke";
import type { ScreenPoint } from "../../domain/schema_common/point";
import { worldToScreen, worldLengthToScreen } from "../../domain/camera/camera";

/** ペンの色。色選択の機能がまだないため、全ストローク共通の固定値 */
const STROKE_COLOR = "#222222";

/**
 * 概要: 指定した canvas に描画する Renderer を作るファクトリ。
 *
 * 目的: domain には Renderer interface だけを見せ、canvas と 2D コンテキストを
 * closure に隠す（domain へ Canvas2D の型を漏らさないため）。
 *
 * 処理フロー:
 * 1. canvas から 2D コンテキストを取得する（取得できない環境なら即座に throw。
 *    描けないまま黙って動き続けるより、起動時点で失敗を知らせるため）
 * 2. render() を持つ Renderer を返す
 *
 * 引数 canvas: 描画先の canvas 要素
 * 戻り値: Renderer port の実装
 */
export const createCanvas2dRenderer = (canvas: HTMLCanvasElement): Renderer => {
    const context = canvas.getContext("2d");
    if (context === null) {
        throw new Error("Canvas2D context is not available");
    }

    /**
     * 概要: ストローク 1 本を現在のカメラで画面に描く。
     *
     * 目的: ワールド座標で保持されている点列を、描画の瞬間だけ画面座標へ
     * 変換して描く（点データ自体は変換しない。カメラが動いても絵がキャンバス上の
     * 同じ場所に留まるのは、この「保持はワールド・描画時に変換」による）。
     *
     * 処理フロー:
     * 1. 全点を world→screen 変換して配列に集める
     *    （Stroke は点列を直接公開せず出口が forEachPoint だけのため、一旦集める）
     * 2. 線幅をワールド単位から画面 px へ変換する
     * 3. 点が 1 つだけならドット、2 つ以上なら折れ線として描く
     *
     * 引数 scene: カメラの参照元 / 引数 stroke: 描くストローク
     * 戻り値: なし（canvas への描画という副作用のみ）
     */
    const drawStroke = (scene: Scene, stroke: Stroke): void => {
        const screenPoints: ScreenPoint[] = [];
        stroke.forEachPoint((point) => screenPoints.push(worldToScreen(scene.camera, point)));
        // 線幅は radius（ワールド単位）から毎回計算する。ズームに合わせて
        // 見た目の太さも変わる＝「紙に描いた絵を拡大する」直感に合わせるため
        const screenLineWidth = worldLengthToScreen(scene.camera, stroke.radius * 2);

        // 1 点だけのストローク（クリックのみ）は線分にならず stroke() では
        // 何も出ないため、ドット（円の塗り）として描く
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
        // 点列を折れ線で繋ぐため、角と端を丸めて手描きの見た目に近づける
        context.lineCap = "round";
        context.lineJoin = "round";
        context.stroke();
    };

    /**
     * 概要: Scene 全体を描き直す。
     *
     * 処理フロー: 全消し → ストロークを積まれた順（下から上）に全部描く。
     * 前回の絵を残さないのは、差分描画の「描き漏れ・二重描き」のバグを
     * 構造的に不可能にするため。
     *
     * 引数 scene: 描く対象（カメラ + 全ストローク）/ 戻り値: なし
     */
    const renderWholeScene = (scene: Scene): void => {
        // 表示層が高DPI対応で ctx.scale(dpr, dpr) を設定していても、バッキング
        // ストア全体を確実に消すため、消去の間だけ変換を単位行列に戻す
        // （canvas.width/height はデバイス px。スケール済みの座標系のまま解釈すると
        //   dpr < 1 のときに右下が消し残る）
        context.save();
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.restore();
        for (const stroke of scene.strokes) {
            drawStroke(scene, stroke);
        }
    };

    return {
        render: renderWholeScene
    };
};
