// Camera unavailable (docs/design/flows.md §5): denied, no camera, busy, or a browser that can't open it.
// One layout and one primary path, Search by name, so a failed camera never strands anyone.
import { useRef, useState } from "react";
import { Link, SEARCH_PATH } from "../../app/router";
import type { CameraFailure } from "../../platform/camera/camera-service";
import { Icon } from "../../ui/icons";
import { useFocusOnMount } from "../../ui/use-focus-on-mount";
import { CAMERA_ACTIONS, CAMERA_OFF_COPY, HOWTO } from "./copy";
import { howToKind } from "./environment";
import { ScanIcon } from "./ScanIcon";

const PRIMARY =
  "pressable inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-(--radius-md) bg-(--color-accent) px-5 font-semibold text-(--color-on-accent) no-underline";
const SECONDARY =
  "pressable inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-(--radius-md) border border-(--color-border-strong) bg-(--color-surface-2) px-5 font-semibold text-(--color-text)";

export interface CameraOffPanelProps {
  failure: CameraFailure;
  stillOff: boolean;
  userAgent: string;
  standalone: boolean;
  onTryAgain: () => void;
  onCopyLink: () => Promise<void>;
}

export function CameraOffPanel({
  failure,
  stillOff,
  userAgent,
  standalone,
  onTryAgain,
  onCopyLink,
}: CameraOffPanelProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  useFocusOnMount(heading, failure);
  const [note, setNote] = useState("");
  const copy = CAMERA_OFF_COPY[failure];
  const howto = HOWTO[howToKind(userAgent, standalone)];

  const search = (
    <Link href={SEARCH_PATH} className={failure === "busy" ? SECONDARY : PRIMARY}>
      {failure !== "busy" && <Icon name="search" size={20} />}
      {CAMERA_ACTIONS.searchByName}
    </Link>
  );
  const tryAgain = (
    <button type="button" onClick={onTryAgain} className={failure === "busy" ? PRIMARY : SECONDARY}>
      {CAMERA_ACTIONS.tryAgain}
    </button>
  );

  return (
    <section
      aria-labelledby="camera-off-title"
      className="absolute inset-0 overflow-y-auto bg-(--color-surface-1) px-6 pt-[calc(env(safe-area-inset-top)+72px)] pb-[calc(env(safe-area-inset-bottom)+24px)] text-(--color-text)"
      data-testid="camera-off"
      data-failure={failure}
    >
      <div className="mx-auto max-w-[560px]">
        <span className="mb-4 inline-block text-(--color-text-2)">
          <ScanIcon name="cameraOff" size={48} strokeWidth={1.5} />
        </span>
        <h1 id="camera-off-title" ref={heading} tabIndex={-1} className="mb-2 font-bold text-title">
          {copy.title}
        </h1>
        <p className="text-(--color-text-2) text-footnote">{copy.body}</p>
        {failure === "denied" ? (
          <div className="my-4 rounded-(--radius-md) bg-(--color-surface-2) px-4 pt-3.5 pb-1">
            <p className="font-bold text-footnote">{howto.heading}</p>
            <ol className="mt-2 mb-3 pl-5 text-(--color-text-2) text-footnote">
              {howto.steps.map((step) => (
                <li key={step} className="mb-1.5">
                  {step}
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div className="h-6" />
        )}
        <div className="flex flex-col gap-3">
          {failure === "busy" ? (
            <>
              {tryAgain}
              {search}
            </>
          ) : (
            <>
              {search}
              {failure === "denied" && tryAgain}
              {failure === "unsupported" && (
                <button
                  type="button"
                  className={SECONDARY}
                  onClick={() => {
                    onCopyLink().then(
                      () => setNote(CAMERA_ACTIONS.linkCopied),
                      () => setNote(""),
                    );
                  }}
                >
                  <ScanIcon name="copy" size={20} />
                  {CAMERA_ACTIONS.copyLink}
                </button>
              )}
            </>
          )}
        </div>
        <p
          role="status"
          className="mt-3 text-(--color-text-2) text-footnote"
          data-testid="camera-note"
        >
          {stillOff ? CAMERA_ACTIONS.stillOff : note}
        </p>
      </div>
    </section>
  );
}
