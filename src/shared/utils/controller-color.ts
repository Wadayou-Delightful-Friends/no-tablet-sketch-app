// src/shared/utils/controller-label.ts
//const labels = new Map<string, Number>();
/** いま接続中の controller_id。切断したら renderer もカーソルを描かない */
const activeControllers = new Set<string>();

export function markControllerActive(controllerId: string): void {
  activeControllers.add(controllerId);
}

export function markControllerInactive(controllerId: string): void {
  activeControllers.delete(controllerId);
}

export function isControllerActive(controllerId: string): boolean {
  return activeControllers.has(controllerId);
}

const LABEL_MAX_LENGTH = 6;

/** controller_id に接続順の番号を割り当てて返す（1人目、2人目…） */
export function labelForController(controllerId: string): string {
  return controllerId.slice(0, LABEL_MAX_LENGTH);
}

export function colorForController(controllerId: string): string {
  let hash = 0;
  for (const char of controllerId) {
    hash = (hash * 31 + char.charCodeAt(0)) % 360;
  }
  return `hsl(${hash}, 70%, 45%)`;
}