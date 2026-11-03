# 入力変換層とテスト・デモの実行方法

## 決めたこと

- **DOM イベント → Command の変換コードは `test/demo.ts` に置き、`src/` には置かない**。
  `src/` は「Command が渡された後」の処理だけを持ち、`pointerdown` / `wheel` などの
  DOM API に依存しない
- テストは新しいパッケージを追加せず、**ブラウザ内で動く自作の軽量ハーネス**
  （`test/harness.ts` + `test/unit.html`）で実行する

## 入力変換層を test 側に置く理由

- メリット:
  - `src/`（domain / infra）が特定の入力デバイス・UI から完全に切り離され、
    将来 React ページやリモートコントローラなど別の入力元を足しても
    `src/` は変更不要
  - 「エンジンの入口は Command だけ」という境界が、ディレクトリ構成として見える
- デメリット:
  - 本番画面を作る際は、入力→Command の変換を（test/demo.ts を参考に）
    あらためて実装する必要がある

## 標準リスナーイベント → Command の対応

`test/demo.ts` は `addEventListener` の標準イベントだけを使い、以下のように変換する：

| DOM イベント | 条件 | Command |
| --- | --- | --- |
| `pointerdown` → `pointermove` | 左ボタンドラッグ | `write`（移動のたびに 1 点） |
| `pointerdown` → `pointermove` | Space 押下中 or 中ボタン | `move`（前回位置との差分を delta に） |
| `wheel` | — | `zoom`（anchor=カーソル位置、deltaY の符号で 1.1 倍 / 1/1.1 倍） |

変換層が持つ状態は「描画中の stroke_id」「パン中の前回位置」「Space 押下中か」
「コマンド連番」の 4 つだけ。カメラや Scene の状態は一切参照しない
（差分ベースのコマンドにしたことで成立している。command-model.md を参照）。

## テストランナーを追加しなかった理由

Vitest 等の導入案もあったが、ブラウザ内ハーネスにした。

ブラウザ内ハーネス（採用）:

- メリット:
  - 新規依存ゼロ（このリポジトリはパッケージ追加を事前相談制にしている）
  - デモと同じ実行系（Vite dev + ブラウザ）で完結し、環境差が出ない
  - DOM や Canvas が最初から使える
- デメリット:
  - CLI で完結しない（CI に組み込むにはヘッドレスブラウザの起動が必要）
  - watch モードやカバレッジなど、テストランナーの便利機能がない

Vitest（不採用）:

- メリット: `pnpm test` で完結、watch・カバレッジあり、事実上の標準
- デメリット: 依存が増える。jsdom/happy-dom を足すか browser mode の設定が要る

**判断根拠**: 現段階のテスト対象は純粋ロジック中心で数も少なく、
ハーネスに求めるのは assert と結果表示だけ。テストが増えて CLI 実行が
欲しくなった時点で Vitest への移行を相談する。

## 実行方法

```bash
pnpm dev
```

- ユニットテスト: `http://localhost:5173/test/unit.html` を開く（ALL PASS 表示を確認）
- デモ: `http://localhost:5173/test/demo.html` を開く
  - ドラッグ: 描く
  - Space+ドラッグ or 中ボタンドラッグ: 移動
  - ホイール: カーソル位置を中心に拡大縮小
  - ツールバー右側にストローク数・scale・translation が表示される
