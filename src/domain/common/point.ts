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
 * ワールド座標系の点（無限キャンバス上の固定位置）。
 * ストロークはこの座標系で保持し、カメラ変換（camera/camera.ts）を通して
 * ScreenPoint と相互変換する。構造は ScreenPoint と同じだが、座標系の
 * 取り違えを防ぐため別型にしている。
 */
export type WorldPoint = {
    x: number;
    y: number;
}
