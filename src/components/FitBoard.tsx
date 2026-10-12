import { useLayoutEffect, useRef, type ReactNode } from "react";

// Keep the entire round visible even inside a short game-portal frame.
// Reflow before scaling; game boards can grow, with unscaled controls kept outside.
export default function FitBoard({ children, grow = false, compact = false }: { children: ReactNode; grow?: boolean; compact?: boolean }) {
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const fit = () => {
    const space = viewport.current;
    const board = content.current;
    if (!space || !board || !space.clientWidth || (!compact && !space.clientHeight)) return;
    let maximumHeight = space.clientHeight;
    if (compact && space.parentElement) {
      const parent = space.parentElement;
      const style = getComputedStyle(parent);
      const siblings = [...parent.children].filter(element => element !== space &&
        !["absolute", "fixed"].includes(getComputedStyle(element).position) && element.getClientRects().length);
      const occupied = siblings.reduce((height, element) => {
        const css = getComputedStyle(element);
        return height + element.getBoundingClientRect().height + parseFloat(css.marginTop) + parseFloat(css.marginBottom);
      }, 0);
      maximumHeight = Math.max(1, parent.clientHeight - occupied - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
        - (parseFloat(style.rowGap) || 0) * siblings.length);
    }
    const wide = window.matchMedia("(min-width: 700px) and (max-height: 700px)").matches;
    const minimumWidth = grow && wide ? 560 : 296;
    const naturalWidth = Math.max(minimumWidth, space.clientWidth);
    // Leave room for the crate shadows and rounding of transformed pixels.
    const availableHeight = Math.max(1, maximumHeight - 5);
    let scale = grow ? Math.min(1.75, space.clientWidth / minimumWidth) : Math.min(1, space.clientWidth / naturalWidth);
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
    if (compact) space.style.height = `${Math.min(maximumHeight, board.offsetHeight * scale + 5)}px`;
  };
  useLayoutEffect(() => { fit(); });
  useLayoutEffect(() => {
    const observer = new ResizeObserver(fit);
    if (viewport.current) observer.observe(viewport.current);
    if (compact && viewport.current?.parentElement) observer.observe(viewport.current.parentElement);
    window.visualViewport?.addEventListener("resize", fit);
    return () => {
      observer.disconnect();
      window.visualViewport?.removeEventListener("resize", fit);
    };
  }, [compact]);
  return <div className={`board-viewport ${compact ? "fit-board-compact" : ""}`} ref={viewport}>
    <div className="fit-board-content" ref={content}>{children}</div>
  </div>;
}
