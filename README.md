# no-tablet-sketch-app

手元の端末（Controller）と描画用の画面（Display）を接続して絵を描くスケッチアプリ。

## 画面構成

| パス | 役割 |
| --- | --- |
| `/select` | 役割を選ぶ入口 |
| `/display` | 描画結果を映す画面 |
| `/controller` | 手元で入力する画面 |

## 開発コマンド

```bash
pnpm install
pnpm dev      # 開発サーバ起動
pnpm build    # 型チェック + ビルド
pnpm lint
```

## ディレクトリ構成

```
src/
  main.tsx        # エントリ。ルータを立てるだけ
  app/
    router.tsx    # ルート定義
  pages/          # 各画面の組み立て（select / display / controller）
  features/       # 画面の段取り（接続〜入力〜反映の一連の流れ）
  domain/         # 型と純粋ロジック（command / document / stroke / ports）
  infra/          # 外部技術に触れる実装（webrtc / signaling / render-canvas2d）
  shared/
    ui/           # 画面をまたいで使う UI 部品
```

## どこに置くか迷ったら

- 画面の見た目・組み立て → `pages/`
- 複数の画面で使い回す UI 部品 → `shared/ui/`
- 一連の処理の流れ（接続する→入力を送る→反映する など） → `features/`
- UI にも通信にも依存しない型・ロジック → `domain/`
- 通信や描画 API など外部技術に触れるコード → `infra/`（`domain/ports/` の interface を実装する形で）

上記に収まらないもの・新しい分類が必要なものは、遠慮なくフォルダを増やして構いません。
