import type { Command, WriteCommand, EraseCommand, MoveCommand, ZoomCommand } from "./command";

/**
 * 問題なければ null、駄目なら理由を持つ Error を返す。
 * value が NormalizedPoint（{ x: number; y: number }）かをチェックする。
 * field はエラーメッセージ用のフィールド名（例: "point"）。
 *
 * 位置（point / anchor）は 0〜1、差分（delta）は向きを持つので -1〜1 と
 * 範囲が違うため、min / max を呼び出し側から渡す。
 * 範囲外を弾くのは、描画領域の外へ飛んだ座標がそのままカメラ変換に入ると
 * 見えない場所にストロークが積まれるため。
 */
const validateNormalizedPoint = (
    value: unknown,
    field: string,
    min: number,
    max: number,
): Error | null => {
    if (typeof value !== "object" || value === null) {
        return Error(`${field} must be an object`);
    }
    if (!("x" in value) || typeof value.x !== "number") {
        return Error(`${field}.x must be a number`);
    }
    if (!("y" in value) || typeof value.y !== "number") {
        return Error(`${field}.y must be a number`);
    }
    // NaN は比較が常に false になるため、この形で書けば同時に弾ける
    if (!(value.x >= min && value.x <= max)) {
        return Error(`${field}.x must be between ${min} and ${max}`);
    }
    if (!(value.y >= min && value.y <= max)) {
        return Error(`${field}.y must be between ${min} and ${max}`);
    }
    return null;
};

/**
 * 全コマンドが共通で持つパラメータ（controller_id / seq / timestamp）をチェックする。
 * type はエラーメッセージ用のコマンド名（例: "write"）。
 * 呼び出し側で object へ絞り込んでから渡す。
 */
const validateCommonFields = (command: object, type: string): Error | null => {
    if (!("controller_id" in command) || typeof command.controller_id !== "string") {
        return Error(`${type}: controller_id must be a string`);
    }
    if (!("seq" in command) || typeof command.seq !== "number") {
        return Error(`${type}: seq must be a number`);
    }
    if (!("timestamp" in command) || typeof command.timestamp !== "number") {
        return Error(`${type}: timestamp must be a number`);
    }

    // --- 値チェック（値域は未定。決まり次第ここに追加する） ---
    // TODO: seq は 0 以上の整数か
    // TODO: timestamp は妥当な範囲か

    return null;
};

/**
 * 全て通れば null、駄目なら理由を持つ Error を返す。
 * write / erase コマンドのパラメータをチェックする。
 * 両者は点ベースで構造が同一なので、エラーメッセージ用の名前だけ変えて共用する。
 * （値の範囲チェックは値域が決まり次第、各項目の下に追記する）
 */
const validateStrokeCommand = (command: unknown, type: "write" | "erase"): Error | null => {
    // --- 型チェック ---
    if (typeof command !== "object" || command === null) {
        return Error(`${type}: command must be an object`);
    }
    const commonError = validateCommonFields(command, type);
    if (commonError) {
        return commonError;
    }
    if (!("stroke_id" in command) || typeof command.stroke_id !== "string") {
        return Error(`${type}: stroke_id must be a string`);
    }
    if (!("radius" in command) || typeof command.radius !== "number") {
        return Error(`${type}: radius must be a number`);
    }
    if (!("point" in command)) {
        return Error(`${type}: point is missing`);
    }
    // 位置なので 0〜1（描画領域の左上〜右下）
    const pointError = validateNormalizedPoint(command.point, `${type}: point`, 0, 1);
    if (pointError) {
        return pointError;
    }

    // --- 値チェック（値域は未定。決まり次第ここに追加する） ---
    // TODO: radius は正の数か

    return null;
};

/**
 * 全て通れば null、駄目なら理由を持つ Error を返す。
 * move コマンドのパラメータをチェックする。
 * （値の範囲チェックは値域が決まり次第、各項目の下に追記する）
 */
const validateMoveCommand = (command: unknown): Error | null => {
    // --- 型チェック ---
    if (typeof command !== "object" || command === null) {
        return Error("move: command must be an object");
    }
    const commonError = validateCommonFields(command, "move");
    if (commonError) {
        return commonError;
    }
    if (!("delta" in command)) {
        return Error("move: delta is missing");
    }
    // 差分なので向きを持つ。1コマンドで動かせるのは最大でも描画領域1枚ぶん
    const deltaError = validateNormalizedPoint(command.delta, "move: delta", -1, 1);
    if (deltaError) {
        return deltaError;
    }

    return null;
};

/**
 * 全て通れば null、駄目なら理由を持つ Error を返す。
 * zoom コマンドのパラメータをチェックする。
 * （値の範囲チェックは値域が決まり次第、各項目の下に追記する）
 */
const validateZoomCommand = (command: unknown): Error | null => {
    // --- 型チェック ---
    if (typeof command !== "object" || command === null) {
        return Error("zoom: command must be an object");
    }
    const commonError = validateCommonFields(command, "zoom");
    if (commonError) {
        return commonError;
    }
    if (!("anchor" in command)) {
        return Error("zoom: anchor is missing");
    }
    // ズームの中心は表示領域内の位置なので 0〜1
    const anchorError = validateNormalizedPoint(command.anchor, "zoom: anchor", 0, 1);
    if (anchorError) {
        return anchorError;
    }
    if (!("factor" in command) || typeof command.factor !== "number") {
        return Error("zoom: factor must be a number");
    }

    // --- 値チェック（値域は未定。決まり次第ここに追加する） ---
    // TODO: factor は正の有限値か（0 以下だと scale が壊れる）
    // TODO: 1コマンドあたりの倍率に上限・下限を設けるか

    return null;
};


/**
 * 受信した JSON.parse 済みの値を Command へ変換する。
 * 変換できれば Command、駄目なら理由を持つ Error を返す。
 * 余計なフィールドを持ち込まないよう、検証後に必要な項目だけ組み直す。
 *
 * 座標は正規化されたままなので、描画に使う前に受信アダプタ
 * （features/sketch/normalized_command.ts の toScreenCommand）で画面 px へ変換する。
 */
export const parseCommand = (parsedJson: unknown): Command | Error => {
    if (typeof parsedJson !== "object" || parsedJson === null) {
        return Error("Invalid command format");
    }
    if (!("type" in parsedJson)) {
        return Error("Command type is missing");
    }
    if  (parsedJson.type === "write") {
        const error = validateStrokeCommand(parsedJson, "write");
        if (error) {
            return error;
        }
        const command = parsedJson as WriteCommand;
        return {
            type: "write",
            controller_id: command.controller_id,
            seq: command.seq,
            timestamp: command.timestamp,
            stroke_id: command.stroke_id,
            radius: command.radius,
            point: command.point,
        };
    }
    if (parsedJson.type === "erase") {
        const error = validateStrokeCommand(parsedJson, "erase");
        if (error) {
            return error;
        }
        const command = parsedJson as EraseCommand;
        return {
            type: "erase",
            controller_id: command.controller_id,
            seq: command.seq,
            timestamp: command.timestamp,
            stroke_id: command.stroke_id,
            radius: command.radius,
            point: command.point,
        };
    }
    if (parsedJson.type === "move") {
        const error = validateMoveCommand(parsedJson);
        if (error) {
            return error;
        }
        const command = parsedJson as MoveCommand;
        return {
            type: "move",
            controller_id: command.controller_id,
            seq: command.seq,
            timestamp: command.timestamp,
            delta: command.delta,
        };
    }
    if (parsedJson.type === "zoom") {
        const error = validateZoomCommand(parsedJson);
        if (error) {
            return error;
        }
        const command = parsedJson as ZoomCommand;
        return {
            type: "zoom",
            controller_id: command.controller_id,
            seq: command.seq,
            timestamp: command.timestamp,
            anchor: command.anchor,
            factor: command.factor,
        };
    }

    return Error(`Unknown command type: ${String(parsedJson.type)}`);
}
