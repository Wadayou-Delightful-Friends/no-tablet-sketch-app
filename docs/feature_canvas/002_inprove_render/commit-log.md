# 002 コミット詳細

座標設計見直し（[README.md](README.md)）の実装を、1コミット=1目的で分割した記録。
上から順に積んである（`7dfe9a4` が最初）。

---

## 7dfe9a4 — fix: point の import パスを schema_common リネームへ追従

**変更ファイル**: `src/domain/camera/camera.ts` / `src/domain/stroke/stroke.ts` /
`src/domain/stroke/stroke_stack.ts` / `test/demo.ts`（各 import 1行のみ）

**内容**: develop 側の「common → schema_common ディレクトリリネーム」（`87ff2ea`）が
feature/canvas へマージされた際（`35230ba`）、`command.ts` 以外の import が
旧パス `../common/point` のまま取り残され、`tsc -b` が TS2307 で失敗していた。
該当 4 ファイルの import を `schema_common/point` へ修正し、ビルドを修復した。

---

## 179d3ab — refactor: ストロークの点列を push/forEachPoint にカプセル化

**変更ファイル**: `src/domain/stroke/stroke.ts` / `src/domain/stroke/stroke_stack.ts` /
`src/infra/render-canvas2d/canvas2d_renderer.ts` /
`test/stroke_stack.test.ts` / `test/command_dispatcher.test.ts`

**内容**:
- `Stroke` の `points: WorldPoint[]` の直接公開をやめ、closure に隠して
  入口 `push()`・出口 `forEachPoint()` だけにした（`createStroke` ファクトリを新設）
- `stroke_stack.appendPoint` は外部シグネチャ不変のまま、内部を
  `latestStroke.push(point)` / `createStroke(...)` に変更
- renderer は `points.map(...)` をやめ、`forEachPoint` で screen 座標の配列に
  集めてから従来どおり描画
- テストは点の検証を `collectPoints`（forEachPoint で配列に集めるヘルパ）経由に変更し、
  「forEachPoint は追加した順に点を返す」テストを追加

**理由**: 内部の持ち方を利用側に固定させないため。大量の点で性能問題が出たら、
SoA（x/y 別の `Float64Array`）へ **Stroke の内部だけで** 差し替えられる。
新設計の不変条件「点列の配列を直接返す口を作らない」を成立させる、
このリファクタリングの最重要ポイント。

---

## fcc3149 — feat: ズーム範囲を ZoomSettings でパラメータ化し、原点を初期表示中央へ

**変更ファイル**: `src/domain/camera/camera.ts` / `src/domain/scene/scene.ts` /
`src/domain/command/command_dispatcher.ts` / `src/infra/render-canvas2d/canvas2d_renderer.ts` /
`test/camera.test.ts` / `test/command_dispatcher.test.ts` / `test/demo.ts`

**内容**:
1. **ズームクランプのパラメータ化**: `ZoomSettings { minScale, maxScale, stepCount }` を
   新設し、`zoomAt(camera, anchor, factor, settings)` が scale をクランプする。
   数値はロジックにハードコードせず `DEFAULT_ZOOM_SETTINGS`（1/8〜8倍・20段階）に
   一元化。1段階の倍率は `zoomFactorPerStep(settings)` が等比
   `(maxScale/minScale)^(1/stepCount)` で導出し、demo のホイール1目盛り
   （旧 `ZOOM_FACTOR_PER_WHEEL_TICK = 1.1` のハードコード）を置き換えた
2. **原点 = 初期表示の中央**: `createCamera(worldOriginOnScreen)` /
   `createScene(worldOriginOnScreen)` に原点を置く画面位置を渡す形にし、
   demo はキャンバス中央を渡す（新規キャンバスの中央 = world (0,0)）
3. **長さ変換の集約**: `screenLengthToWorld` / `worldLengthToScreen` を camera.ts に
   追加し、dispatcher の `radius / scale`・renderer の `radius * 2 * scale` の
   ベタ書き変換式を置き換えた（「変換式を camera.ts の外に書かない」不変条件）
4. `createCommandDispatcher(scene, renderer, zoomSettings)` に第3引数を追加

**テスト追加**: クランプ上限・下限 / クランプ到達後の translation 不変 /
原点の配置位置 / `zoomFactorPerStep` を stepCount 回掛けると maxScale に届く /
長さ変換の相互逆変換 / zoom コマンド連打でも範囲を超えない（計21件 ALL PASS）

---

## 9d3c065 — docs: 座標設計見直し(002)の判断と新設計の採否を記録

**変更ファイル**: `docs/feature_canvas/002_inprove_render/README.md`（新規）

**内容**: 新設計（Architect/coordinate-design.md）との比較・採否一覧と、
各判断の理由を記録。ブランド型不採用（コントローラ担当が既存 point 型で開発中）、
001 ドキュメントの「取り違えはコンパイルエラーとして現れる」が構造的型付けの
ため実際には成立していないことの訂正、コマンド座標は ScreenPoint を維持し
将来の通信層で「水際の変換」を行う方針を含む。

---

## 36de6d0 — docs: ブラウザ動作確認はユーザーに依頼するルールを完了条件へ追記

**変更ファイル**: `AGENTS.md`

**内容**: 「完了の条件」に、ブラウザでの動作確認（デモ画面・test/unit.html・
ヘッドレスブラウザでのチェック）はエージェントが自分で行わず、確認する URL と
見るべきポイントを添えてユーザーに依頼すること、および動作確認のために
サーバを建てないことを明文化した。

---

## 検証（最終状態）

- `pnpm build` ✅ / `pnpm lint` ✅
- `test/unit.html`: **ALL PASS (21 tests)** ✅
- `test/demo.html`: エラーなし（ユーザー確認済み）。起動直後の translation が
  キャンバス中央 (600, 400)、ホイールで scale が 8.00 / 0.13(=1/8) で停止することを確認
