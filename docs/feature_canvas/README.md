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
