// Some mobile browsers suppress native panning inside scrolling="no" frames.
// Handle vertical drags within our own scroll areas without changing frame size.
export function installEmbeddedScroll(root: HTMLElement): () => void {
  if (window.self === window.top) return () => {};
  root.dataset.embeddedTouchScroll = "true";

  type Gesture = {
    area: HTMLElement;
    x: number;
    y: number;
    lastY: number;
    lastTime: number;
    velocity: number;
    dragging: boolean;
  };
  let gesture: Gesture | undefined;
  let animation = 0;
  let suppressClickUntil = 0;
  const stop = () => {
    cancelAnimationFrame(animation);
    animation = 0;
  };
  const areaFor = (target: EventTarget | null): HTMLElement | undefined => {
    if (!(target instanceof Element)) return;
    if (target.closest("input, textarea, select, [contenteditable]")) return;
    const dialog = root.querySelector("dialog[open]");
    if (dialog && !dialog.contains(target)) return;
    for (let element: Element | null = target; element; element = element.parentElement) {
      if (element instanceof HTMLElement
        && /auto|scroll/.test(getComputedStyle(element).overflowY)
        && element.scrollHeight > element.clientHeight + 1) return element;
      // A short dialog must not pass a swipe through to the board behind it.
      if (element === dialog || element === root) return element as HTMLElement;
    }
  };
  const start = (event: TouchEvent) => {
    stop();
    gesture = undefined;
    suppressClickUntil = 0;
    if (event.touches.length !== 1) return;
    const area = areaFor(event.target);
    if (!area) return;
    const touch = event.touches[0];
    gesture = { area, x: touch.clientX, y: touch.clientY, lastY: touch.clientY,
      lastTime: performance.now(), velocity: 0, dragging: false };
  };
  const move = (event: TouchEvent) => {
    if (!gesture) return;
    if (event.touches.length !== 1) {
      gesture = undefined;
      return; // Preserve two-finger zoom.
    }
    const touch = event.touches[0];
    const dx = touch.clientX - gesture.x;
    const dy = touch.clientY - gesture.y;
    if (!gesture.dragging) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 10) return;
      if (Math.abs(dx) >= Math.abs(dy)) {
        gesture = undefined;
        return;
      }
      gesture.dragging = true;
    }
    // If the browser has already taken ownership, let its native pan finish.
    if (!event.cancelable) {
      gesture = undefined;
      return;
    }
    event.preventDefault();
    const now = performance.now();
    const delta = gesture.lastY - touch.clientY;
    gesture.velocity = Math.max(-2.5, Math.min(2.5,
      delta / Math.max(8, now - gesture.lastTime)));
    gesture.area.scrollTop += delta;
    gesture.lastY = touch.clientY;
    gesture.lastTime = now;
  };
  const end = () => {
    const finished = gesture;
    gesture = undefined;
    if (!finished?.dragging) return;
    suppressClickUntil = performance.now() + 400;
    // Retain a small inertial tail for flicks, stopping at either scroll edge.
    let velocity = performance.now() - finished.lastTime > 80 ? 0 : finished.velocity;
    let previous = performance.now();
    const tick = (now: number) => {
      if (!finished.area.isConnected || Math.abs(velocity) < 0.04) return;
      const elapsed = Math.min(32, now - previous);
      previous = now;
      const before = finished.area.scrollTop;
      finished.area.scrollTop += velocity * elapsed;
      velocity *= Math.pow(0.9, elapsed / 16);
      if (Math.abs(finished.area.scrollTop - before) < 0.5) return;
      animation = requestAnimationFrame(tick);
    };
    animation = requestAnimationFrame(tick);
  };
  const cancel = () => {
    suppressClickUntil = gesture?.dragging ? performance.now() + 400 : 0;
    gesture = undefined;
    stop();
  };
  const click = (event: MouseEvent) => {
    stop();
    if (performance.now() >= suppressClickUntil || event.detail === 0) return;
    suppressClickUntil = 0;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  root.addEventListener("touchstart", start, { passive: true });
  root.addEventListener("touchmove", move, { passive: false });
  root.addEventListener("touchend", end, { passive: true });
  root.addEventListener("touchcancel", cancel, { passive: true });
  root.addEventListener("click", click, true);
  root.addEventListener("wheel", stop, { passive: true });
  window.addEventListener("resize", cancel);
  return () => {
    cancel();
    delete root.dataset.embeddedTouchScroll;
    root.removeEventListener("touchstart", start);
    root.removeEventListener("touchmove", move);
    root.removeEventListener("touchend", end);
    root.removeEventListener("touchcancel", cancel);
    root.removeEventListener("click", click, true);
    root.removeEventListener("wheel", stop);
    window.removeEventListener("resize", cancel);
  };
}
