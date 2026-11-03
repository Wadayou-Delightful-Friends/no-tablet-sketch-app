//データをブラウザ間で受信する方
export interface Receiver<T = unknown> {
  onMessage(cb: (peerId: string, msg: T) => void): void;
}