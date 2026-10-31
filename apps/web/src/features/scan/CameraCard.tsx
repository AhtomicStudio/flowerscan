// The one camera card (docs/design/flows.md §1): shown once, before the first browser prompt. Continue fires
// getUserMedia; "Type a name instead" is the skip. One primary button, "Continue" not "Allow" (HIG).
import { useRef } from "react";
import { CLASS_ICON, classTone } from "../../ui/ClassPill";
import { Icon } from "../../ui/icons";
import { useFocusOnMount } from "../../ui/use-focus-on-mount";
import { CARD_COPY } from "./copy";
import { ScanIcon } from "./ScanIcon";

export function CameraCard({
  onContinue,
  onTypeInstead,
}: {
  onContinue: () => void;
  onTypeInstead: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useFocusOnMount(heading);
  return (
    <main
      aria-labelledby="camera-card-title"
      className="mx-auto flex min-h-dvh max-w-[640px] flex-col px-6 pt-[calc(env(safe-area-inset-top)+48px)] pb-[calc(env(safe-area-inset-bottom)+20px)]"
      data-testid="camera-card"
    >
      <div className="scan-card-art" aria-hidden="true">
        <i className="scan-corner scan-corner-tl" />
        <i className="scan-corner scan-corner-tr" />
        <i className="scan-corner scan-corner-bl" />
        <i className="scan-corner scan-corner-br" />
        <div className="scan-card-dots">
          {(["indica", "hybrid", "sativa"] as const).map((label) => (
            <span key={label} className={`${classTone(label)} bg-(--cls) text-(--color-on-class)`}>
              <Icon name={CLASS_ICON[label]} strokeWidth={2} />
            </span>
          ))}
        </div>
      </div>
      <h1
        id="camera-card-title"
        ref={heading}
        tabIndex={-1}
        className="display text-[2rem] leading-[1.1]"
      >
        {CARD_COPY.title}
      </h1>
      <p className="mt-3 flex gap-2 text-(--color-text-2) text-footnote">
        <ScanIcon name="camera" size={20} className="mt-0.5" />
        <span>
          {CARD_COPY.body} <b className="text-(--color-text)">{CARD_COPY.bodyStrong}</b>
        </span>
      </p>
      <div className="flex-1" />
      <button
        type="button"
        onClick={onContinue}
        className="pressable mt-8 min-h-[52px] w-full rounded-(--radius-md) bg-(--color-accent) px-5 font-semibold text-(--color-on-accent)"
      >
        {CARD_COPY.continue}
      </button>
      <button
        type="button"
        onClick={onTypeInstead}
        className="mt-2 inline-flex min-h-12 items-center justify-center self-center px-3 font-semibold text-(--color-accent-text)"
      >
        {CARD_COPY.typeInstead}
      </button>
    </main>
  );
}
