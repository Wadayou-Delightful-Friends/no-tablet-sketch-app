# feature_canvas 利用ガイド — キャンバスに描く仕組みの使い方

無限キャンバスへの描画は、`domain/command`（何をするか）・`domain/stroke`（何が描かれたか）・
`infra/render-canvas2d`（どう映すか）の 3 つでできている。このドキュメントは
**これらを呼ぶ側**のためのもので、「どう使うか」と「どこで詰まるか」を書く。

なぜその設計にしたかは [001_canvas_prototype](001_canvas_prototype/README.md)（プロトタイプの判断記録）と
[002_inprove_render](002_inprove_render/README.md)（座標設計の見直しと消しゴム）にある。
このガイドはそれらを読まなくても正しく呼べることを目指す。

## 全体の流れ

```
入力（ポインタ／将来はスマホからの受信）
   │  Command を作る（画面座標のまま）
   ▼
dispatcher.applyCommand(command)
   │  画面座標 → ワールド座標に変換して Scene を更新
   ▼
Scene = camera（どこを見ているか） + strokes（何が描かれたか）
   │  適用のたびに毎回
   ▼
renderer.render(scene)   全消し → 全ストローク再描画
```

組み立ては 1 か所でまとめて行う。実例は
[useSketchCanvas.ts](../../src/features/sketch/useSketchCanvas.ts)。

```ts
const scene = createScene({ x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 });
const renderer = createCanvas2dRenderer(canvas);
const dispatcher = createCommandDispatcher(scene, renderer, DEFAULT_ZOOM_SETTINGS);
// あとは dispatcher.applyCommand に Command を流し込むだけ
```

`createScene` に渡すのは「ワールド原点 (0,0) を置く画面位置」。表示エリアの中央を渡すと
「新規キャンバスの中央 = 原点」になる。**CSS px で渡すこと**——`canvas.width` はデバイス px なので、
高 DPI 環境では原点が倍ずれる。

## Command — 送る側

キャンバスへの操作はすべて [Command](../../src/domain/command/command.ts) という
ただのオブジェクトで表す。メソッドを持たないので、そのまま JSON にして通信に載せられる。

| type | やること | 固有のペイロード |
|---|---|---|
| `write` | 描く | `stroke_id` / `radius` / `point` |
| `erase` | 消す | `stroke_id` / `radius` / `point`（write と同じ形） |
| `move` | 表示を平行移動する | `delta`（画面上の移動量 px） |
| `zoom` | 拡大縮小する | `anchor`（動かさない画面上の点）/ `factor`（現 scale に掛ける倍率） |

4 種すべてが共通で持つ封筒（envelope）は次のとおり。

| フィールド | 意味 |
|---|---|
| `controller_id` | 発行元の識別子。複数コントローラのコマンドを混ぜないための鍵 |
| `seq` | コントローラごとの単調増加の通し番号。順序・欠落検出・重複排除に使う |
| `timestamp` | 生成時刻（epoch ms）。コントローラをまたいだ大まかな順序付けに使う |
| `stroke_id` | ストロークの識別子（write / erase のみ）。`` `${controller_id}:${連番}` `` で作り、他コントローラと衝突させない |

**`controller_id` / `seq` / `timestamp` は現状 dispatcher が読んでいない。** 通信層が入るまでは
値が入っていれば動くが、将来 seq で並べ替える前提なので、送る側は今のうちから正しく採番しておくこと。

呼ぶ側が知っておくべきことは 4 つ。

**1 コマンド = 1 点。** 「線を引き始める」「引き終わる」コマンドは存在しない。ストロークの区切りは
`stroke_id` が変わったかどうかだけで決まる。線分ではなく点を送るので、1 点落ちても隣どうしが繋がるだけで
線は途切れない。判断基準は、**欠落が起きても壊れない粒度を選ぶ**こと。

**座標も太さも画面のまま送る。** `point` は画面座標、`radius` は画面 px。ワールド座標への変換は
dispatcher が受け取った瞬間に行う（水際の変換）。送る側がカメラの状態を知る必要はない。

**move は差分、zoom は倍率。** 絶対位置ではないので、入力層は前回位置を除いて状態を持たなくてよい。
`factor` は現在の scale に掛ける値で、1 より大きければ拡大。1 段階ぶんの倍率が欲しければ
`zoomFactorPerStep(settings)`（等比）を使う。等差で刻むと縮小側が異常に速く感じられる。

**未知の type は例外になる。** `applyCommand` は知らない type を受けると
`Error("Unknown command")` を投げる。通信越しに素性の怪しいコマンドを流すなら、
呼ぶ側で握るか、事前に検証すること。

## dispatcher — 適用する側

```ts
const dispatcher = createCommandDispatcher(scene, renderer, zoomSettings);
dispatcher.applyCommand(command);   // 戻り値なし
```

契約として押さえるべき点。

**scene はその場で書き換わる。** `scene.strokes` は破壊的に追記され、`scene.camera` は
新しいオブジェクトに再代入される（Camera 側は不変で、変換関数はすべて新しい Camera を返す）。
つまり**セッション中は同じ Scene オブジェクトを持ち続ける**必要がある。React で
`useState` に入れて作り直すと描いた絵が消えるので、[useSketchCanvas.ts](../../src/features/sketch/useSketchCanvas.ts)
では ref に置いている。

**1 コマンドごとに必ず全再描画が走る。** バッチも requestAnimationFrame の合流もない。
「Scene を渡せば必ず正しい絵になる」を隠れた状態なしで成立させるための割り切りで、
性能が問題になったら Renderer は port で分離されているため infra 側だけを差し替えればよい。

**変換は適用した瞬間のカメラで行う。** ズームやパンの途中で描いた点も、その瞬間に指の下にあった
ワールド位置として記録され、以後カメラをどう動かしても動かない。

**ズームの範囲は注入で決まる。** 既定の `DEFAULT_ZOOM_SETTINGS` は 1/8〜8 倍を 20 段階。
範囲や段階数を変えたいときはロジックではなくこの値（または渡す `ZoomSettings`）を差し替える。

## Stroke / StrokeStack — 記録される側

[stroke.ts](../../src/domain/stroke/stroke.ts) /
[stroke_stack.ts](../../src/domain/stroke/stroke_stack.ts)。

`StrokeStack` は `Stroke[]` で、**配列の順番がそのまま塗り順**（先頭が下、末尾が最新で一番上）。
ペンと消しゴムは同じスタックに混在するので、積み順が結果を左右する。

ストロークの見た目は `StrokeStyle { kind, radius }` にまとまっている。`kind` は
`"PEN_DEFAULT" | "ERASE_DEFAULT"`、`radius` は **ワールド単位**（画面 px ではない）。
色や不透明度が増えてもこの型に足すだけで済むよう、生成・記録側のシグネチャを固定する役目を持つ。

読み書きの入口は 2 つだけ。

```ts
stroke.push(worldPoint);                      // 末尾に点を足す
stroke.forEachPoint((worldPoint) => { ... }); // 追加順に全点を読む
```

**点列の配列を返す口は作らないこと。** 内部の持ち方（現状は `WorldPoint[]`、将来は x/y 別配列の SoA など）を
利用側に固定させないための設計で、口を 1 つ作った瞬間にこの利点は消える。配列が必要なら
`forEachPoint` で自分の配列に貯める——レンダラの `drawStroke` がその実例。
判断基準は、**性能都合で差し替えたい実装ほど、外から見える形を狭く保つ**こと。

点の追記は `appendPoint(stack, stroke_id, point, style)` に集約されている。挙動には
引っかかりやすい点が 2 つある。

- **比較するのは末尾だけ。** 同じ `stroke_id` でも、間に別のストロークが積まれた後に来たら
  続きではなく新しいストロークになる。ローカル単一ソースなら順序が乱れないので成立しているが、
  複数コントローラのコマンドを交互に流すと破れる制約
- **style は新規作成時にしか使われない。** 続きの点は末尾ストロークの style を引き継ぐ。
  途中でツールを切り替えると `stroke_id` も変わるので、自然に別ストロークとして分かれる

なお `createStroke` は第 1 点を必須で受け取るので、**空のストロークは存在しない**。

## Renderer — 映す側

domain が知っているのは [renderer.ts](../../src/domain/ports/renderer.ts) の
`Renderer { render(scene): void }` だけで、Canvas2D の型は domain に漏れない。
実装は [canvas2d_renderer.ts](../../src/infra/render-canvas2d/canvas2d_renderer.ts) の
`createCanvas2dRenderer(canvas)`。

使う側が知っておくこと。

- **2D コンテキストが取れないと構築時に throw する**（`Canvas2D context is not available`）。
  描けないまま黙って動き続けるより起動時に落とす方針
- **毎回全消し → 全部描き直す**（immediate mode）。前回の絵は残らないので、
  レンダラの外で canvas に描き込んでも次の `render` で消える
- **canvas をリサイズしたら再描画が必要。** `canvas.width` への再代入でビットマップが消えるため、
  リサイズ後に `renderer.render(scene)` を呼ぶこと（フックの `handleResize` がやっている）
- **線の太さはズームに追従する。** 画面上の線幅は `radius * 2 * scale`。
  「紙に描いた絵を拡大する」直感に合わせている
- 点が 1 つだけのストローク（クリックのみ）は線ではなくドットとして描かれる。
  0 長のパスは `stroke()` では何も出ないため

### ツールを増やすとき

`ERASE_DEFAULT` が `destination-out`（下に積まれた絵を形のぶん抜く）で実現されているように、
**種別ごとに違うのは合成モードと色の設定だけ**で、点列をドット／折れ線にする幾何は共通。
そのため新しいツールを足す手順は 2 か所で済む。

1. [stroke.ts](../../src/domain/stroke/stroke.ts) の `KindOfTool` にリテラルを 1 つ足す
2. [canvas2d_renderer.ts](../../src/infra/render-canvas2d/canvas2d_renderer.ts) の
   `STROKE_RENDER_STRATEGIES` に対応する `prepare` を 1 エントリ足す

`drawStroke` 本体は触らない。`KindOfTool` が `Record` のキーになっているので、
1 を足して 2 を忘れると型エラーで気づける。合成モードは `save()` / `restore()` で
1 ストロークごとに閉じているため、次のストロークへ漏れる心配もない
（詳細は [erase-design.md](002_inprove_render/erase-design.md)）。

---

## テスト用：直接描画できる仕組み（暫定・削除予定）

ここから下は**本来の仕様ではない**。本番の入力源はスマホ（コントローラ）側であり、
[sketch_input.ts](../../src/features/sketch/sketch_input.ts) は通信層が未実装の間だけ
**PC ブラウザ単体で描画を確認するために置いている足場**。
受信アダプタ（[receiver.ts](../../src/domain/ports/receiver.ts) の実装）が入ったら
**このファイルごと、この節ごと削除する**。上の仕様に依存を作らないこと。

```ts
const detach = attachSketchInput(canvas, dispatcher.applyCommand);
// detach() で張ったリスナーをすべて解除する
```

役割は「DOM イベント → Command」の変換だけ（React 非依存）。
`pnpm dev` で起動して、キャンバス上で次の操作ができる。

| 操作 | 結果 |
|---|---|
| 左ドラッグ | 描く（`write`） |
| **E を押しながら**左ドラッグ | 消す（`erase`） |
| Space を押しながらドラッグ／中ボタンドラッグ | 移動（`move`） |
| ホイール | カーソル位置を中心に拡大縮小（`zoom`、1 目盛り = 1 段階） |

テスト用ゆえの割り切りが入っているので、本番の挙動と混同しないこと。

- `controller_id` は `"local"` 固定。複数コントローラの検証はできない
- ペンの半径は 2px、**消しゴムは 12px**。消し跡が見やすいよう意図的に太くしてある
- `E` キーという割り当ては「トラックパッドでも押しやすい」以上の理由がない仮のもの
- 描く／消すの種別は pointerdown で確定し、**途中で E を離しても最後まで同じ種別で描き切る**
  （style は新規ストローク作成時にしか効かないため、1 ストロークの途中で切り替えても反映されない）
- 修飾キーは canvas がフォーカスを持たないため `window` で拾っている。
  ページ内に他のキー操作を足すと衝突しうる
