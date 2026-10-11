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
    board.style.width = `${naturalWidth}px`;
    // Leave room for the crate shadows and rounding of transformed pixels.
    const availableHeight = Math.max(1, space.clientHeight - 5);
    let scale = Math.min(1, space.clientWidth / naturalWidth,
      availableHeight / Math.max(1, board.offsetHeight));
    for (let pass = 0; pass < 3; pass++) {
      board.style.width = `${space.clientWidth / scale}px`;
      const fittedHeight = board.offsetHeight * scale;
      if (fittedHeight <= availableHeight) break;
      scale *= availableHeight / fittedHeight;
    }
    board.style.width = `${space.clientWidth / scale}px`;
    board.style.transform = `translateX(-50%) scale(${scale})`;
    space.dataset.scale = String(scale);
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
