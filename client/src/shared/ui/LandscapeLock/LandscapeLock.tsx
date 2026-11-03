import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import "./LandscapeLock.css";

type LandscapeLockProps = {
  children: ReactNode;
};

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

  return (
    <div className={isPortrait ? "landscape-lock landscape-lock--rotate" : "landscape-lock"}>
      {children}
    </div>
  );
}