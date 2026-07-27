# コマンドのバリデーション — パース済み JSON を Command に詰め込む

## 背景

Display 受信側は、ネットワーク越しに届いた JSON をパースした「素性の分からない
オブジェクト」を受け取る。これを `domain/command/command.ts` の **Command** 型に
安全に変換する入口が `domain/command/command_validator.ts` の
`commandEncoderWithValidate` である。

まずは `write` コマンドだけを対象に実装した（erase / move / zoom は今後、同じ
パターンで展開する）。

## 決めたこと

### 1. 入力は `unknown` として受け取り、内側で絞り込む

`commandEncoderWithValidate(parsed_json_command: unknown): Command | Error` とし、
JSON.parse の結果（型が信用できない）をそのまま渡せるようにした。まず object か、
`type` フィールドがあるかを確認し、`type` の値で各コマンドのバリデータに分岐する。

### 2. 戻り値は `Command | Error`（例外を投げない）

不正な入力は throw せず `Error` を戻り値で返す。呼び出し側が「正常な Command か、
どこが不正だったか」を型として扱えるようにするため。

### 3. バリデータは「チェックごとに Error を返す」方式にした

`ValidateCommandWrite(command: unknown): Error | null` とし、項目ごとに個別の
エラーメッセージを返す。全項目を通過したら `null`。

- 当初は型ガード（`command is WriteCommand` を返す boolean）で実装したが、
  **値チェックまで行いたい**という要件が出たため方針変更した。
- boolean のままだと「どのフィールドが、なぜ駄目だったか」を呼び出し側に
  伝えられない。項目ごとに `Error("write: seq must be a number")` のような
  理由付きメッセージを返すことで、デバッグ・ログ・受信側のエラー応答に使える。
- 型ガードを外したため、全チェック通過後に一度だけ `as WriteCommand` でキャスト
  してから Command オブジェクトを構築している。

### 4. 型チェックと値チェックを段階に分ける

`ValidateCommandWrite` の中を 2 段階で構成した：

1. **型チェック** — 各フィールドの存在と型（string / number、`point` は
   ScreenPoint）を項目ごとに検査する。
2. **値チェック** — 値域の検査。**値域はまだ未定**のため、現状は TODO の
   枠だけ用意している（例: `seq >= 0`、`radius > 0`、`timestamp` の妥当性）。
   値域が決まり次第、型チェックの直後にこの箇所へ追記していく。

### 5. `point` は専用ヘルパで検査する

`validateScreenPoint(value, field): Error | null` を切り出した。`field` 引数に
`"write: point"` のようなプレフィックスを渡すことで、`write: point.x must be a
number` のように**どのフィールドの何が不正か**が分かるメッセージを出せる。

## 追記 — erase / move / zoom への展開

`write` だけだったバリデータを残り 3 種へ広げた。展開して初めて分かった
「どこが共通で、どこが違うか」に沿って切り分けている。

### 6. 共通フィールドは `validateCommonFields` に切り出す

`controller_id` / `seq` / `timestamp` は 4 種すべてが同じ形で持つ。4 箇所に
同じ検査を書き写すと、値チェック（値域が決まった後）を足すときに 4 箇所を
直すことになるため、先に 1 箇所へ集約した。

引数は `command: object` にしてある（`unknown` ではなく）。呼び出し側で
object へ絞り込んでから渡す前提にすることで、`in` による絞り込みが
キャストなしで効く。

### 7. write と erase は 1 つのバリデータを共用する

両者は `stroke_id` / `radius` / `point` まで**構造が完全に同一**で、違うのは
`type` の値だけ。バリデータを 2 本に分けても差分がエラーメッセージの文字列
だけになるため、`validateStrokeCommand(command, type: "write" | "erase")` と
して名前を引数で受け取る形にした。

move（`delta`）と zoom（`anchor` + `factor`）は構造が違うので個別に書いた。

### 8. 未知の type は「未実装」ではなく「未知」として扱う

`parseCommand` の最後の戻り値を `Error("Not implemented")` から
`Error(\`Unknown command type: ${...}\`)` に変えた。4 種すべてが実装済みに
なった時点で、ここに到達するのは想定外の type だけになるため。
受信側のログにどの type が来たかが残る。

### 9. 細かい値チェックはコメントで枠だけ残す

値域が未定の項目（`radius > 0` / `factor > 0` / `seq >= 0` など）は、
実装せず TODO コメントで置き場所だけ確保した。決まっていない基準を仮に
実装すると、正しい入力を弾く事故のほうが起きやすいと判断した。

なお座標（`point` / `anchor` / `delta`）の値域はその後
[002_normalize_coordinates](../002_normalize_coordinates/coordinate-normalization.md)
で確定したため、そちらで実装済み。

## 未決事項 / 今後

- **値域の具体値**のうち `radius` / `factor` / `seq` / `timestamp` は未決のまま。
  決まり次第、各バリデータの「値チェック」節に追記する。
- 座標の値域は 002 で確定・実装済み（`point` / `anchor` は 0〜1、`delta` は -1〜1）。
- `parseCommand` に対する自動テストがまだない（`test/` にテスト実行スクリプトが
  無く、`test/unit.html` をブラウザで開く運用のため、追加するなら既存の
  `harness.ts` に合わせて書く）。
