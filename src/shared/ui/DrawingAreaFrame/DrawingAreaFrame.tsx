import "./DrawingAreaFrame.css";
import {
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { PointerEventHandler } from "react";

const DESKTOP_ASPECT_RATIO = 16 / 9;

type DrawingAreaFrameProps = {
  onPointerDown?: PointerEventHandler<HTMLDivElement>;
  onPointerMove?: PointerEventHandler<HTMLDivElement>;
  onPointerUp?: PointerEventHandler<HTMLDivElement>;
  onPointerCancel?: PointerEventHandler<HTMLDivElement>;
};

export function DrawingAreaFrame({
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: DrawingAreaFrameProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [frameSize, setFrameSize] = useState({
    width: 0,
    height: 0,
  });

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const update = () => {
      const parentWidth = wrapper.clientWidth;
      const parentHeight = wrapper.clientHeight;

      let width = parentWidth;
      let height = width / DESKTOP_ASPECT_RATIO;

      if (height > parentHeight) {
        height = parentHeight;
        width = height * DESKTOP_ASPECT_RATIO;
      }

      setFrameSize({ width, height });
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(wrapper);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapperRef} className="drawing-area-frame-wrapper">
      <div
        className="drawing-area-frame"
        style={{
          width: `${frameSize.width}px`,
          height: `${frameSize.height}px`,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <span className="drawing-area-frame__corner drawing-area-frame__corner--tl" />
        <span className="drawing-area-frame__corner drawing-area-frame__corner--tr" />
        <span className="drawing-area-frame__corner drawing-area-frame__corner--bl" />
        <span className="drawing-area-frame__corner drawing-area-frame__corner--br" />
      </div>
    </div>
  );
}