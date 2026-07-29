import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import "./LandscapeLock.css";

type ScreenOrientationWithLock = ScreenOrientation & {
  lock?: (orientation: string) => Promise<void>;
};

type LandscapeLockProps = {
  children: ReactNode;
};

/**
 * 常に横画面のレイアウトで表示させるためのラッパー。
 *
 * 端末やブラウザによって挙動を分けている:
 * - Screen Orientation API に対応している環境（主にAndroid Chrome）では
 *   実際の画面回転ロックを試みる。フルスクリーンでない場合など
 *   失敗する条件があるためベストエフォートとし、失敗は無視する。
 * - iOS Safari など Orientation Lock 自体に対応していないブラウザ向けに、
 *   端末が縦向きのときは中身を CSS で 90度回転させることで、
 *   物理的な向きに関わらず常に横画面のレイアウトに見えるようにしている。
 */
export function LandscapeLock({ children }: LandscapeLockProps) {
  const [isPortrait, setIsPortrait] = useState(
    () => window.matchMedia("(orientation: portrait)").matches
  );

  useEffect(() => {
    const mql = window.matchMedia("(orientation: portrait)");
    const handleChange = () => setIsPortrait(mql.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const orientation = screen.orientation as
      | ScreenOrientationWithLock
      | undefined;

    orientation?.lock?.("landscape").catch(() => {
      // 未対応環境（Safari等）ではここで失敗する。
      // その場合は下の CSS 回転による疑似横画面化で代替するため、エラーは無視してよい。
    });
  }, []);

  return (
    <div className={isPortrait ? "landscape-lock landscape-lock--rotate" : "landscape-lock"}>
      {children}
    </div>
  );
}
