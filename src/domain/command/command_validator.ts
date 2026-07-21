import type { Command, WriteCommand } from "./command";

/**
 * value が ScreenPoint（{ x: number; y: number }）かをチェックする。
 * field はエラーメッセージ用のフィールド名（例: "point"）。
 * 問題なければ null、駄目なら理由を持つ Error を返す。
 */
const validateScreenPoint = (value: unknown, field: string): Error | null => {
    if (typeof value !== "object" || value === null) {
        return Error(`${field} must be an object`);
    }
    if (!("x" in value) || typeof value.x !== "number") {
        return Error(`${field}.x must be a number`);
    }
    if (!("y" in value) || typeof value.y !== "number") {
        return Error(`${field}.y must be a number`);
    }
    return null;
};

/**
 * write コマンドのパラメータをチェックする。
 * チェックごとに理由を持つ Error を返し、全て通れば null を返す。
 * （値の範囲チェックは値域が決まり次第、各項目の下に追記する）
 */
const ValidateCommandWrite = (command: unknown): Error | null => {
    // --- 型チェック ---
    if (typeof command !== "object" || command === null) {
        return Error("write: command must be an object");
    }
    if (!("controller_id" in command) || typeof command.controller_id !== "string") {
        return Error("write: controller_id must be a string");
    }
    if (!("seq" in command) || typeof command.seq !== "number") {
        return Error("write: seq must be a number");
    }
    if (!("timestamp" in command) || typeof command.timestamp !== "number") {
        return Error("write: timestamp must be a number");
    }
    if (!("stroke_id" in command) || typeof command.stroke_id !== "string") {
        return Error("write: stroke_id must be a string");
    }
    if (!("radius" in command) || typeof command.radius !== "number") {
        return Error("write: radius must be a number");
    }
    if (!("point" in command)) {
        return Error("write: point is missing");
    }
    const pointError = validateScreenPoint(command.point, "write: point");
    if (pointError) {
        return pointError;
    }

    // --- 値チェック（値域は未定。決まり次第ここに追加する） ---
    // TODO: seq は 0 以上の整数か
    // TODO: timestamp は妥当な範囲か
    // TODO: radius は正の数か

    return null;
};


export const commandEncoderWithValidate = (parsed_json_command: unknown): Command | Error => {
    if (typeof parsed_json_command !== "object" || parsed_json_command === null) {
        return Error("Invalid command format");
    }
    if (!("type" in parsed_json_command)) {
        return Error("Command type is missing");
    }
    if  (parsed_json_command.type === "write") {
        const error = ValidateCommandWrite(parsed_json_command);
        if (error) {
            return error;
        }
        const command = parsed_json_command as WriteCommand;
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

    return Error("Not implemented");
}
