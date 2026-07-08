import type { Command } from "./command";

export const applyCommand = (command: Command) => {
    switch (command.type) {
        case "write":
            // Handle write command
            break;
        case "erase":
            // Handle erase command
            break;
        // case "move":
        //     // Handle camera move command
        //     break;
        // case "zoom":
        //     // Handle zoom command
        //     break;
        // case "undo":
        //     // Handle undo command
        //     break;
        // case "redo":
        //     // Handle redo command
        //     break;
        default:
            throw new Error(`Unknown command`);
    }
}
