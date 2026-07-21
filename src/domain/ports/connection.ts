// domain/ports/connection.ts
export type Role = "display" | "controller";

export interface Connection {
  // 能動的アクション（emit する側なので on を付けない）
  start(roomId: string, role: Role): void;

  // 自分の参加成功（controllerなら displayId が来る＝offerの相手）
  onJoined(cb: (info: { roomId: string; displayId?: string }) => void): void;

  // 他のピアが入ってきた（Display側で使う）
  onPeerJoined(cb: (peerId: string) => void): void;

  // 他のピアが去った / セッション終了
  onLeft(cb: (info: { peerId: string; role: Role }) => void): void;

  // 参加時のエラー（重複・不正など）
  onJoinError(cb: (reason: string) => void): void;
/**
  // 接続先の Display が居ない
  onNoDisplay(cb: (roomId: string) => void): void;
  */
}