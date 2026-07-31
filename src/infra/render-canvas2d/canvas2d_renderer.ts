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
import type { Stroke, KindOfTool } from "../../domain/stroke/stroke";
import type { ScreenPoint } from "../../domain/schema_common/point";
import { worldToScreen, worldLengthToScreen } from "../../domain/camera/camera";

import eraserImage from "../../shared/assets/icons/eraser.png";
import penImage from "../../shared/assets/icons/pen.png";

import { forEachVisibleStroke } from "../../domain/stroke/stroke_stack";
import { visibleStack } from "../../domain/history/history";


/** ペンの色。色選択の機能がまだないため、全ストローク共通の固定値 */
const STROKE_COLOR = "#222222";
const CURSOR_SIZE_PX = 20;

const penCursorImage = new Image(); // ペン画像
penCursorImage.src = penImage;

const eraserCursorImage = new Image(); // 消しゴム画像
eraserCursorImage.src = eraserImage;

/**
 * ストローク種別ごとの描画方針（Strategy）。
 *
 * 種別で変わるのは「合成モードと色の設定」だけで、点列をドット/折れ線にする
 * 幾何は共通。その差分だけを prepare に閉じ込め、drawStroke は種別で分岐せず
 * 「方針を適用 → 共通の幾何描画」で済ませる。将来ツールが増えても、この
 * Record に 1 項目足すだけで drawStroke 本体は変えずに済む。
 */
type StrokeRenderStrategy = {
    /** 幾何を描く前に、合成モードと色を context へ設定する */
    prepare(context: CanvasRenderingContext2D): void;
}

const STROKE_RENDER_STRATEGIES: Record<KindOfTool, StrokeRenderStrategy> = {
    // 通常合成（source-over）でそのまま上に重ねて描く
    PEN_DEFAULT: {
        prepare(context) {
            context.globalCompositeOperation = "source-over";
            context.fillStyle = STROKE_COLOR;
            context.strokeStyle = STROKE_COLOR;
        },
    },
    // destination-out で「形のぶんだけ下（＝先に積まれた）の絵を抜く」。
    // 色は無視されるが、アンチエイリアス縁まで確実に不透明で抜くため色も設定する
    ERASE_DEFAULT: {
        prepare(context) {
            context.globalCompositeOperation = "destination-out";
            context.fillStyle = STROKE_COLOR;
            context.strokeStyle = STROKE_COLOR;
        },
    },
};

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
     * 3. save し、種別ごとの描画方針（Strategy）で合成モード・色を設定する
     * 4. 点が 1 つだけならドット、2 つ以上なら折れ線として描く（幾何は種別共通）
     * 5. restore で状態を戻す（合成モードを次のストロークへ持ち越さない）
     *
     * 引数 scene: カメラの参照元 / 引数 stroke: 描くストローク
     * 戻り値: なし（canvas への描画という副作用のみ）
     */
    const drawStroke = (scene: Scene, stroke: Stroke): void => {
        const screenPoints: ScreenPoint[] = [];
        stroke.forEachPoint((point) => screenPoints.push(worldToScreen(scene.camera, point)));
        // 線幅は radius（ワールド単位）から毎回計算する。ズームに合わせて
        // 見た目の太さも変わる＝「紙に描いた絵を拡大する」直感に合わせるため
        const screenLineWidth = worldLengthToScreen(scene.camera, stroke.style.radius * 2);

        // 状態を退避 → 種別ごとの方針で合成モード・色を設定 → 共通の幾何を描く。
        // 末尾で必ず restore し、方針が変えた合成モードを次のストロークへ持ち越さない
        // （分岐は早期 return せず、必ず末尾の restore へ合流させる）。
        context.save();
        STROKE_RENDER_STRATEGIES[stroke.style.kind].prepare(context);

        if (screenPoints.length === 1) {
            // 1 点だけのストローク（クリックのみ）は線分にならず stroke() では
            // 何も出ないため、ドット（円の塗り）として描く
            context.beginPath();
            context.arc(screenPoints[0].x, screenPoints[0].y, screenLineWidth / 2, 0, Math.PI * 2);
            context.fill();
        } else {
            context.beginPath();
            context.moveTo(screenPoints[0].x, screenPoints[0].y);
            for (const screenPoint of screenPoints.slice(1)) {
                context.lineTo(screenPoint.x, screenPoint.y);
            }
            context.lineWidth = screenLineWidth;
            // 点列を折れ線で繋ぐため、角と端を丸めて手描きの見た目に近づける
            context.lineCap = "round";
            context.lineJoin = "round";
            context.stroke();
        }

        context.restore();
    };






    /**
     * 概要: 直近に描かれた点（＝ペン先）に目印を描く。
     *
     * 目的: 遠隔のスマホがいまどこを指しているかを Display 側で示す。
     * ストロークと同じ worldToScreen を通すため、線と必ず同じ位置になる。
     */
   const drawPenTip = (scene: Scene): void => {
        // 最後に積まれたストロークを取り出す（Scene が配列以外でも動くよう走査する）
        let lastStroke: Stroke | undefined;
        forEachVisibleStroke(visibleStack(scene.history), (stroke) => { lastStroke = stroke; });
        if (lastStroke === undefined) return;

        // Stroke は点列を直接公開しないため、走査して最後の点を得る
        let lastWorldPoint: Parameters<Parameters<Stroke["forEachPoint"]>[0]>[0] | undefined;
        lastStroke.forEachPoint((point) => { lastWorldPoint = point; });
        if (lastWorldPoint === undefined) return;

        const cursorImage = lastStroke.style.kind === "ERASE_DEFAULT" ? eraserCursorImage : penCursorImage;


        if (!cursorImage.complete || cursorImage.naturalWidth === 0) return;


        const screenPoint = worldToScreen(scene.camera, lastWorldPoint);

        context.save();
        // 直前のストロークが destination-out（消しゴム）でも確実に上描きする
        context.globalCompositeOperation = "source-over";
        context.drawImage(
            cursorImage,
            screenPoint.x - CURSOR_SIZE_PX / 2,   // 中心を合わせるため半分ずらす
            screenPoint.y - CURSOR_SIZE_PX / 2,
            CURSOR_SIZE_PX,
            CURSOR_SIZE_PX,
        );
        context.restore();
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
      
        forEachVisibleStroke(visibleStack(scene.history), (stroke) => {
            drawStroke(scene, stroke);
        });
        drawPenTip(scene);

    };

    return {
        render: renderWholeScene
    };
};
