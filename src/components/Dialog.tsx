import { useLayoutEffect, useRef, type ReactNode } from "react";
import Icon from "./Icon";
export default function Dialog({
  title,
  closeLabel,
  onClose,
  children,
  className = "",
  hideTitle = false,
}: {
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  hideTitle?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current!;
    dialog.showModal();
    return () => {
      dialog.close();
      previous?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${className}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="dialog-title"
    >
      <button
        className="icon-button dialog-close"
        aria-label={closeLabel}
        onClick={onClose}
      >
        <Icon name="close" />
      </button>
      <h2 id="dialog-title" className={hideTitle ? "sr-only" : undefined}>{title}</h2>
      {children}
    </dialog>
  );
}
