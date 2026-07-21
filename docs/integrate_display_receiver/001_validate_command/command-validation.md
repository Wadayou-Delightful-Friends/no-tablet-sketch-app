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

## 未決事項 / 今後

- **値域の具体値**（seq / timestamp / radius などの範囲・整数制約）は未決。
  決まり次第、各バリデータの「値チェック」節に追記する。
- erase / move / zoom のバリデータを同じ「Error を返す」パターンで追加する。
- エラーメッセージのプレフィックス（現状 `write:`）を、コマンド種別展開時に
  共通化するか（種別を引数で受け取る等）は展開時に判断する。
