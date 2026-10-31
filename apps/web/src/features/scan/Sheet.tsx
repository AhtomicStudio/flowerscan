// The modal bottom sheet (docs/design/screens/_shared-components.md "Bottom sheet"): scrim, close button,
// a grabber that is a real button cycling the detents, Escape, focus moved in and trapped. Browser back
// closes it too (the scanner pushes one history entry per sheet). Lives here until T-004/T-014 move it
// to ui/.
import { type KeyboardEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Icon } from "../../ui/icons";
import { SHEET_COPY } from "./copy";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface SheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Sticky action bar under the scrolling content. */
  actions?: ReactNode;
  testId?: string;
}

export function Sheet({ title, onClose, children, actions, testId }: SheetProps) {
  const headingId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const [large, setLarge] = useState(false);

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab" || dialog.current === null) return;
    const items = [...dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = items[0];
    const last = items[items.length - 1];
    if (first === undefined || last === undefined) return;
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === heading.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="absolute inset-0 z-30">
      <div
        aria-hidden="true"
        className="scan-scrim absolute inset-0 bg-(--color-scrim)"
        onClick={onClose}
        data-testid="sheet-scrim"
      />
      <section
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onKeyDown={onKeyDown}
        data-detent={large ? "large" : "fit"}
        data-testid={testId}
        className="scan-sheet absolute inset-x-0 bottom-0 mx-auto flex max-w-[640px] flex-col overflow-hidden rounded-t-(--radius-lg) bg-(--color-surface-1) text-(--color-text) shadow-[0_-12px_40px_rgba(0,0,0,0.55)]"
      >
        <div className="grid flex-none grid-cols-[48px_1fr_48px] items-center px-2 pt-1">
          <button
            type="button"
            onClick={() => setLarge((value) => !value)}
            aria-label={large ? SHEET_COPY.collapse : SHEET_COPY.expand}
            aria-expanded={large}
            className="col-start-2 grid size-12 place-items-center justify-self-center"
          >
            <span className="block h-[5px] w-9 rounded-[3px] bg-current opacity-55" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={SHEET_COPY.close}
            className="pressable col-start-3 grid size-12 place-items-center rounded-full"
          >
            <Icon name="x" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 [scroll-padding-bottom:24px]">
          <h2 id={headingId} ref={heading} tabIndex={-1} className="mb-1.5 font-bold text-headline">
            {title}
          </h2>
          {children}
        </div>
        {actions !== undefined && (
          <div className="sheet-actions flex flex-none gap-3 border-(--color-border) border-t bg-(--color-surface-1) px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
            {actions}
          </div>
        )}
      </section>
    </div>
  );
}

const BASE =
  "pressable inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-(--radius-md) px-4 text-center font-semibold";

export function PrimaryButton({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${BASE} bg-(--color-accent) text-(--color-on-accent) ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${BASE} border border-(--color-border-strong) bg-(--color-surface-2) text-(--color-text) ${className}`}
    >
      {children}
    </button>
  );
}
