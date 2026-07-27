# 001 コミット詳細

パース済み JSON を Command に詰め込むバリデータ（[command-validation.md](command-validation.md)）
の実装を、1コミット=1目的で分割した記録。上から順に積んである。

---

## 3ed88cf — feat: write コマンドのバリデータと意思決定ドキュメントを追加

**変更ファイル**: `src/domain/command/command_validator.ts`（新規） /
`docs/integrate_display_receiver/001_validate_command/command-validation.md`（新規）

**内容**:
- パース済み JSON（`unknown`）を Command に変換する入口
  `commandEncoderWithValidate(parsed_json_command): Command | Error` を追加。
  object か・`type` があるかを確認し、`type` の値でコマンドごとのバリデータへ分岐する。
  まず `write` のみ対応（erase / move / zoom は今後同じパターンで展開）
- `ValidateCommandWrite(command): Error | null` を実装。当初は型ガード
  （`command is WriteCommand` の boolean）だったが、**値チェックまで行いたい**要件を
  受けて「チェックごとに理由付き Error を返す」方式へ変更。全項目通過で `null`
- 中身を 2 段階に分割：**型チェック**（各フィールドの存在と型を項目ごとに検査）と
  **値チェック**（値域は未定のため TODO 枠だけ用意。`seq >= 0` / `radius > 0` /
  `timestamp` の妥当性などは決まり次第ここに追記）
- `point` 用に `validateScreenPoint(value, field): Error | null` を切り出し。`field`
  引数で `write: point.x must be a number` のようにどのフィールドが不正か分かる
  メッセージを出す
- 型ガードを外したため、全チェック通過後に一度だけ `as WriteCommand` でキャストして
  から Command オブジェクトを構築する

**理由**: Display 受信側は素性の分からないパース結果を受け取るため、水際で型と値を
検証してから Command に変換する。例外を投げず `Command | Error` を返すのは、
「正常な Command か、どこが不正だったか」を呼び出し側が型として扱えるようにするため。

---

## 9ef6e98 — feat: erase / move / zoom コマンドのバリデータを追加

**変更ファイル**: `src/domain/command/command_validator.ts`

**内容**:
- 全コマンド共通の `controller_id` / `seq` / `timestamp` を
  `validateCommonFields(command: object, type: string)` に集約。引数を `unknown` では
  なく `object` にして、呼び出し側で絞り込んでから渡す前提にすることで `in` による
  絞り込みがキャストなしで効く
- `validateWriteCommand` を `validateStrokeCommand(command, type: "write" | "erase")`
  に一般化。write と erase は `stroke_id` / `radius` / `point` まで構造が完全に同一で、
  違いはエラーメッセージ用の名前だけのため共用する
- `validateMoveCommand`（`delta`）と `validateZoomCommand`（`anchor` + `factor`）は
  構造が違うので個別に追加
- `parseCommand` に 4 分岐を実装。各分岐で検証後にフィールドを 1 つずつ組み直す
  （余計なフィールドを持ち込まないホワイトリスト方式）は write と同じ
- fallback を `Error("Not implemented")` から
  `Error(\`Unknown command type: ${...}\`)` へ変更。4 種すべて実装済みになり、
  ここに到達するのは想定外の type だけになったため
- 細かい値チェックは値域が未定のため TODO コメントで枠だけ残す

**理由**: 設計判断は [command-validation.md](command-validation.md) の
「追記 — erase / move / zoom への展開」を参照。

---

## 検証（最終状態）

- `pnpm build`（`tsc -b && vite build`）成功 / `pnpm lint` 警告なし
- 4 コマンドすべての型チェックを実装。値チェックのうち **座標の範囲**は
  [002_normalize_coordinates](../002_normalize_coordinates/commit-log.md) で実装済み
- `radius` / `factor` / `seq` / `timestamp` の値域は未定のため TODO 枠で保留
- `parseCommand` に対する自動テストは未作成
