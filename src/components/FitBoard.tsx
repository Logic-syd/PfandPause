import { useLayoutEffect, useRef, type ReactNode } from "react";

// Keep the entire round visible even inside a short game-portal frame.
// Expand the layout width before scaling so the columns still fill the screen.
export default function FitBoard({ children }: { children: ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const fit = () => {
    const space = viewport.current;
    const board = content.current;
    if (!space || !board || !space.clientWidth || !space.clientHeight) return;
    const naturalWidth = Math.max(296, space.clientWidth);
    // Leave room for the crate shadows and rounding of transformed pixels.
    const availableHeight = Math.max(1, space.clientHeight - 5);
    let scale = Math.min(1, space.clientWidth / naturalWidth);
    board.style.width = `${space.clientWidth / scale}px`;
    if (board.offsetHeight * scale > availableHeight) {
      // Reflowing wider often shortens text. Find the largest fitting scale
      // rather than leaving text unnecessarily small after its lines reflow.
      let low = 0;
      let high = scale;
      for (let pass = 0; pass < 10; pass++) {
        const candidate = (low + high) / 2;
        board.style.width = `${space.clientWidth / candidate}px`;
        if (board.offsetHeight * candidate <= availableHeight) low = candidate;
        else high = candidate;
      }
      scale = Math.max(low, 0.001);
    }
    board.style.width = `${space.clientWidth / scale}px`;
    board.style.transform = `translateX(-50%) scale(${scale})`;
    space.dataset.scale = String(scale);
    space.style.setProperty("--fit-scale", String(scale));
  };
  useLayoutEffect(() => { fit(); });
  useLayoutEffect(() => {
    const observer = new ResizeObserver(fit);
    if (viewport.current) observer.observe(viewport.current);
    window.visualViewport?.addEventListener("resize", fit);
    return () => {
      observer.disconnect();
      window.visualViewport?.removeEventListener("resize", fit);
    };
  }, []);
  return <div className="board-viewport" ref={viewport}>
    <div className="fit-board-content" ref={content}>{children}</div>
  </div>;
}
