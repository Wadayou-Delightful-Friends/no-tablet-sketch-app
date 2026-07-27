/**
 * スクリーン/キャンバス座標系の点（ポインタ入力を送信する時点の座標）。
 * カメラ変換後のワールド座標など、別の座標系を扱う場合はこの型を流用せず
 * 別名の型（例: WorldPoint）を用意すること。x, y の構造が同じでも座標系が
 * 違えば意味が異なるため、混同を防ぐ目的で型を分ける。
 */
export type ScreenPoint = {
    x: number;
    y: number;
}

/**
 * 正規化座標系の点（描画領域の左上が 0.0、右下が 1.0）。
 * コントローラ（スマホ）から送る通信用の座標系で、送信側・受信側どちらの
 * 画面サイズにも依存しない。受信側で描画領域のサイズを掛けて ScreenPoint へ
 * 変換してから使う（変換は features/sketch/normalized_command.ts に集約）。
 *
 * 位置は 0〜1 に収まるが、差分（MoveCommand の delta）は向きを持つため
 * -1〜1 を取りうる。
 */
export type NormalizedPoint = {
    x: number;
    y: number;
}

/**
 * ワールド座標系の点（無限キャンバス上の固定位置）。
 * ストロークはこの座標系で保持し、カメラ変換（camera/camera.ts）を通して
 * ScreenPoint と相互変換する。構造は ScreenPoint と同じだが、座標系の
 * 取り違えを防ぐため別型にしている。
 */
export type WorldPoint = {
    x: number;
    y: number;
}
