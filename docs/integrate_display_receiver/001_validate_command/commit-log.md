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

## 検証（最終状態）

- 値域は未定のため型チェックのみ実装。値チェックは TODO 枠で保留
- erase / move / zoom のバリデータは未実装（今後、同じ「Error を返す」パターンで展開）
