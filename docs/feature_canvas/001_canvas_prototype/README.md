# feature_canvas — 無限イラストキャンバス

縦横に無限に続くキャンバスに、コマンド（書く・移動・拡大縮小）で描き込む機能の
設計ドキュメント置き場。1 ファイル 1 テーマで、選択した理由とメリット・デメリットを残す。

## モジュール地図

```
test/demo.ts            DOM イベント → Command 変換（src には置かない）
────────────────────── ここから src（DOM 非依存） ──────────────────────
domain/command/         Command 型とディスパッチャ（Scene へ適用し再描画を依頼）
domain/scene/           Scene = camera + strokes（キャンバスに映すすべての状態）
domain/camera/          カメラ変換（world↔screen、pan、zoom）
domain/stroke/          ストロークと記録スタック
domain/ports/renderer   描画の port（interface）
infra/render-canvas2d/  Renderer の Canvas2D 実装
```

## 各ドキュメント

| ファイル | テーマ |
| --- | --- |
| [coordinate-system.md](coordinate-system.md) | 座標系（Screen/World）とカメラ変換、無限キャンバスの表現 |
| [command-model.md](command-model.md) | コマンドベース操作と Move/Zoom の差分ベース採用 |
| [stroke-stack.md](stroke-stack.md) | ストロークをスタックで記録する設計 |
| [rendering.md](rendering.md) | Canvas2D 全再描画（immediate mode）の採用 |
| [ports-and-adapters.md](ports-and-adapters.md) | Renderer port による domain と infra の分離 |
| [input-and-demo.md](input-and-demo.md) | 入力変換層を test に置く境界と、ブラウザ内テストハーネス |

## 動かし方

```bash
pnpm dev
# デモ:          http://localhost:5173/test/demo.html
# ユニットテスト: http://localhost:5173/test/unit.html
```

デモの操作：ドラッグ=描く ／ Space+ドラッグ or 中ボタンドラッグ=移動 ／ ホイール=拡大縮小

## この機能で変更・追加したファイル（docs 以外）

### src/domain（新規）

| ファイル | 内容 |
| --- | --- |
| `src/domain/camera/camera.ts` | カメラ変換（world↔screen、panBy、zoomAt） |
| `src/domain/stroke/stroke.ts` | ストローク型（ワールド座標の点列） |
| `src/domain/stroke/stroke_stack.ts` | ストロークの記録スタック（appendPoint） |
| `src/domain/scene/scene.ts` | Scene 型（camera + strokes） |

### src/domain（修正）

| ファイル | 内容 |
| --- | --- |
| `src/domain/common/point.ts` | WorldPoint 型を追加 |
| `src/domain/command/command.ts` | コメント雛形だった Move/Zoom コマンドを差分ベースで実装 |
| `src/domain/command/command_dispatcher.ts` | createCommandDispatcher にファクトリ化し、Scene 適用＋再描画を実装 |
| `src/domain/ports/renderer.ts` | 空ファイルに Renderer port（interface）を記入 |

### src/infra（新規）

| ファイル | 内容 |
| --- | --- |
| `src/infra/render-canvas2d/canvas2d_renderer.ts` | Renderer port の Canvas2D 実装（全消し→全再描画） |

### test（新規）

| ファイル | 内容 |
| --- | --- |
| `test/harness.ts` | ブラウザ内テストハーネス（test / assert / 結果表示） |
| `test/unit.html` | ユニットテストの実行ページ |
| `test/camera.test.ts` | カメラ変換のテスト |
| `test/stroke_stack.test.ts` | ストロークスタックのテスト |
| `test/command_dispatcher.test.ts` | ディスパッチャのテスト（fake Renderer 使用） |
| `test/demo.html` / `test/demo.ts` | 動作デモ。DOM イベント → Command 変換はここに置く |
