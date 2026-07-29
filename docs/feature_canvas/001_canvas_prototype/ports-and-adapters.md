# Renderer port — domain と Canvas2D の分離

## 決めたこと

- 描画のインタフェースを `domain/ports/renderer.ts` に **Renderer port** として定義

  ```ts
  interface Renderer {
      render(scene: Scene): void;
  }
  ```

- Canvas2D の実装は `infra/render-canvas2d/canvas2d_renderer.ts` に置き、
  この port を実装する
- domain（コマンドディスパッチャ）は port にだけ依存し、コマンド適用後に
  `renderer.render(scene)` を呼ぶ。Canvas2D の存在は知らない

依存の向き：

```
domain/command ──依存──> domain/ports/renderer（interface）
                              ▲
                              │ 実装
infra/render-canvas2d ────────┘
```

## なぜ domain 側が再描画まで呼ぶのか

代替案は「ディスパッチャは Scene を更新するだけにして、呼び出し側（デモ）が
render を呼ぶ」だった。

domain が呼ぶ（採用）:

- メリット: 「コマンドを適用したら画面に反映される」という因果が 1 か所で保証され、
  呼び出し側が render を呼び忘れて画面が古いままになる事故がない。
  利用側は `applyCommand` を呼ぶだけでよい
- デメリット: 連続コマンドで毎回描画が走る（requestAnimationFrame へのまとめ描きを
  したくなったとき、domain ではなく Renderer 実装側で間引く必要がある）

呼び出し側が呼ぶ（不採用）:

- メリット: 描画タイミングを利用側が自由に制御できる
- デメリット: すべての利用側に「適用したら描画する」の規約を課すことになり、
  忘れるとバグる

## render(scene) という粗い API にした理由

`drawLine` / `clear` のような細かい描画命令ではなく、「Scene 全体を渡すから
よろしく描いて」という 1 メソッドにした。

- メリット:
  - domain が「どう描くか」（線の色・キャップ・最適化）を一切知らずに済み、
    描画戦略の変更（rendering.md の全再描画→キャッシュ化など）が infra 内で完結する
  - fake 実装が 1 メソッドで書けるため、domain のテストが軽い
    （`test/command_dispatcher.test.ts` の fake Renderer は 3 行）
- デメリット:
  - Renderer 実装が Scene の構造（camera / strokes）に依存する。Scene の形を
    変えると infra も直すことになる

**判断根拠**: 変わりやすいのは「描画技術・最適化」で、変わりにくいのは
「Scene に何があるか」。変わりやすい側を port の裏に隠した。

## 触らなかったもの

`domain/ports/` の sender / receiver / connection（通信系 port）は空のまま。
今回のスコープ（ローカルで動くキャンバス）に不要なため。将来 Controller/Display を
接続する際に、Command を直列化してこれらの port へ流す構成になる想定。
