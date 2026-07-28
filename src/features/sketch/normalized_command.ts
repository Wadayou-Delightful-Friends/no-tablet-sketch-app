/**
 * 受信アダプタ：通信で届いたコマンド（座標が 0〜1 の正規化座標）を、
 * 描画側が扱うコマンド（座標が画面 px）へ変換する。
 *
 * 正規化座標はコントローラ側の画面サイズに依存しない形で座標を送るための表現なので、
 * 描画するには受信側の描画領域サイズを掛けて画面 px に戻す必要がある。
 * その掛け算をこのモジュールだけに閉じ込める。domain/camera/camera.ts が
 * 画面 ↔ ワールドの変換式を集約しているのと同じ役割を、1つ手前の座標系で担う。
 *
 * 入力も出力も型としては同じ Command である点に注意。ScreenPoint と NormalizedPoint は
 * 構造が同じなので、TypeScript は座標系の取り違えを検出できない。
 * 変換せずに dispatcher へ渡すと、0〜1 の値がそのまま画面 px として解釈され、
 * 画面左上のごく狭い範囲に描かれる。受信経路では必ずこの関数を通すこと。
 *
 * React にも DOM にも依存しない純関数なので、そのまま単体テストできる
 * （test/normalized_command.test.ts）。
 */

import type { Command } from "../../domain/command/command";
import type { NormalizedPoint, ScreenPoint } from "../../domain/schema_common/point";

/** 変換の基準になる描画領域のサイズ（CSS px）。canvas の clientWidth / clientHeight を渡す */
export type Viewport = {
    width: number;
    height: number;
}

/**
 * 正規化座標を画面座標へ戻す。x は幅、y は高さを基準にする。
 * 位置にも差分（delta）にも同じ式が使える（どちらも領域サイズに対する比のため）。
 */
const normalizedToScreen = (viewport: Viewport, point: NormalizedPoint): ScreenPoint => ({
    x: point.x * viewport.width,
    y: point.y * viewport.height,
});

/**
 * 引数 command: 座標が正規化されたコマンド（point / delta / anchor が 0〜1）
 * 戻り値: 座標が画面 px のコマンド
 *
 * 座標を持つフィールドだけを差し替え、それ以外（radius / factor / envelope）は素通しする。
 * radius は太さであって画面サイズに対する比ではないため、元から画面 px で送られる。
 */
export const toScreenCommand = (viewport: Viewport, command: Command): Command => {
    switch (command.type) {
        case "write":
        case "erase":
            return { ...command, point: normalizedToScreen(viewport, command.point) };
        case "move":
            return { ...command, delta: normalizedToScreen(viewport, command.delta) };
        case "zoom":
            return { ...command, anchor: normalizedToScreen(viewport, command.anchor) };
        // コマンドを追加したのに変換を書き忘れた場合に気づけるようにする
        // （command_dispatcher.ts の applyCommand と同じ扱い）
        default:
            throw new Error(`Unknown command`);
    }
};
