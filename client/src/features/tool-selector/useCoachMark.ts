import { useCallback, useEffect, useState } from "react";

/** コーチマークを自動で消すまでの時間 (ms) */
const AUTO_DISMISS_MS = 5000;

/**
 * 初回だけ表示するコーチマーク（吹き出し）の表示状態を管理するフック。
 *
 * 「初回」の判定はセッション内（このページを開いている間）だけで、
 * ページをリロードすれば再度表示される簡易な方式にしている。
 * 本アプリは基本的に開きっぱなしで使う運用のため、これで実用上は足りる。
 * 端末をまたいで恒久的に「見たことがある」を覚えたい場合は、
 * localStorage 等への保存が別途必要になる（現時点では不要と判断）。
 *
 * @returns 表示するかどうかと、閉じるための関数
 */
export function useCoachMark() {
  const [visible, setVisible] = useState(true);

  const dismiss = useCallback(() => {
    setVisible(false);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timerId = window.setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timerId);
  }, [visible, dismiss]);

  return { visible, dismiss };
}