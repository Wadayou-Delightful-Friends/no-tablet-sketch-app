// src/shared/utils/controller-label.ts
//const labels = new Map<string, Number>();

/** controller_id に接続順の番号を割り当てて返す（1人目、2人目…） */
export function labelForController(controllerId: string): string {

  return `${controllerId}`;
}

export function colorForController(controllerId: string): string {
  let hash = 0;
  for (const char of controllerId) {
    hash = (hash * 31 + char.charCodeAt(0)) % 360;
  }
  return `hsl(${hash}, 70%, 45%)`;
}