//データをブラウザ間で送る方
export interface Sender<T = unknown> {
  send(msg: T): void;
}