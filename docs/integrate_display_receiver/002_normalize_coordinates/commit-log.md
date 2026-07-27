# 002 コミット詳細

通信で届く 0〜1 の正規化座標を画面座標へ戻す場所を決めた作業
（[coordinate-normalization.md](coordinate-normalization.md)）の実装を、
1コミット=1目的で分割した記録。上から順に積んである。

---

## 1ef96bc — feat: 正規化座標を画面座標へ変換する受信アダプタを追加

**変更ファイル**: `src/features/sketch/normalized_command.ts`（新規） /
`src/domain/schema_common/point.ts` / `src/features/sketch/useSketchCanvas.ts`

**内容**:
- `features/sketch/normalized_command.ts` に `Viewport` 型と
  `toScreenCommand(viewport, command)` を新設。`point` / `delta` / `anchor` だけを
  差し替え、`radius` と `factor` は素通しする。正規化 → 画面 px の掛け算は
  このモジュールにしか存在しない
- 内部の `normalizedToScreen(viewport, point)` は位置にも差分にも同じ式が使える
  （どちらも領域サイズに対する比のため）
- `switch` の `default` で例外を投げる。コマンドを追加したのに変換を書き忘れた場合に
  気づけるようにするため（`command_dispatcher.ts` の `applyCommand` と同じ扱い）
- `schema_common/point.ts` に `NormalizedPoint` を追加。位置は 0〜1、差分は向きを
  持つため -1〜1 を取りうることを型コメントに明記
- `useSketchCanvas.ts` の `handleRemoteMessage` から write / erase の分岐を削除し、
  「パース → 変換 → 適用」の 3 ステップにした。viewport は届いた時点の
  `clientWidth` / `clientHeight` から作る（リサイズで基準が変わるため）

**理由**: 応急処置が「受信メッセージを描画へ流す入力口」に座標変換を持ち込んでおり、
move / zoom が届き始めると同じ場所に分岐が増え続ける状態だった。変換層をどこに
置くかの判断基準は [coordinate-normalization.md](coordinate-normalization.md) の
「決めたこと 1」を参照。

---

## d5540f9 — feat: 受信コマンドの座標に正規化座標の範囲チェックを追加

**変更ファイル**: `src/domain/command/command_validator.ts`

**内容**:
- `validateScreenPoint` を `validateNormalizedPoint(value, field, min, max)` へ
  リネームし、形チェックの後に範囲チェックを実装
- 位置（`point` / `anchor`）は 0〜1、差分（`delta`）は -1〜1 と使い分ける。
  範囲が違うため min / max を呼び出し側から渡す形にした
- 比較を `!(v >= min && v <= max)` の形にすることで NaN も同時に弾く
- 実装した項目の TODO コメントを削除。`radius` / `factor` / `seq` / `timestamp` は
  値域未定のため TODO 枠のまま残す

**理由**: 001 で「値域が未定」として枠だけ残していた項目のうち、座標だけ今回の
正規化仕様の確定で値域が決まったため。範囲外を弾くのは、描画領域の外へ飛んだ座標が
そのままカメラ変換に入ると見えない場所にストロークが積まれるため。

---

## 77e1019 — refactor: コントローラの正規化座標を共通型 NormalizedPoint へ統合

**変更ファイル**: `src/features/controller-input/useControllerInput.ts`

**内容**:
- ファイル内でローカル定義していた `NormalizedPoint` を削除し、
  `schema_common/point.ts` の共通型を import する
- `point: normalizedPoint` の上にあった「Command 側の座標型名は今後見直す予定」の
  コメントを削除
- `PEN_RADIUS` / `ERASER_RADIUS` に「座標と違い正規化せず画面 px で送る」旨を追記

**理由**: 正規化座標の定義が送信側と受信アダプタの 2 箇所に散らばるのを防ぐ。
「今後見直す予定」の宿題は今回の作業そのものであり、検討の結果 `Command` の型は
変えない結論になった（経緯は [coordinate-normalization.md](coordinate-normalization.md)
の「方針変更の経緯」）。

---

## 7766f53 — test: 正規化座標から画面座標への変換のテストを追加

**変更ファイル**: `test/normalized_command.test.ts`（新規） / `test/unit.html` /
`test/harness.ts`

**内容**:
- `toScreenCommand` の単体テストを 6 件追加。viewport は 800x600 と縦横で倍率を
  変えてあり、x に高さを掛ける等の取り違えを検出できる
  - 0.5 が中央に、0 と 1 が描画領域の左上・右下に対応すること
  - `radius` / `factor` が変換されず素通しされること
  - move の `delta` が負の値でも向きを保つこと
  - envelope（`controller_id` / `seq` / `timestamp` / `stroke_id`）が失われないこと
- `test/unit.html` に import 行を 1 行追加
- `harness.ts` の `assert` を `asserts condition` 付きの型注釈に変更。通過後に
  union が絞り込めるため、テスト側で同じ条件を二度書く必要がなくなる。
  実行時の挙動は「偽なら投げる」だけで従来と変わらない

**理由**: `toScreenCommand` は React にも DOM にも依存しない純関数なので、
描画を動かさずに座標変換の正しさだけを検証できる。`command_dispatcher.test.ts` は
dispatcher が画面 px のままなので変更不要だった。

---

## 検証（最終状態）

- `pnpm build`（`tsc -b && vite build`）成功 — 102 modules transformed
- `pnpm lint` 警告なし
- ユニットテストは `test/unit.html` をブラウザで開いて確認する運用のため、
  **ブラウザでの ALL PASS 確認は未実施**（人間による確認依頼）
- スマホ実機での描画位置の一致確認も未実施（同上）

### 保留事項

- **アスペクト比の歪み**: スマホの描画領域と PC の canvas の縦横比が違うと、
  正規化座標は領域全体を引き伸ばして写すため円が楕円になる
- move / zoom はコントローラ側が未送信（型・変換・バリデータのみ用意済み）
- `sketch_input.ts`（PC ローカル入力）は画面 px のまま。今回は変更していない
- `parseCommand` に対する自動テストは未作成
