import { BETA_NOTICE } from "./copy";
import { Icon } from "./icons";

/** Shown whenever the loaded data_version ends with "-dev" (D19). `onClass` styles it in ink for the flood. */
export function BetaNotice({
  onClass = false,
  className = "",
}: {
  onClass?: boolean;
  className?: string;
}) {
  if (onClass) {
    return (
      <p className={`text-center font-semibold text-caption text-(--color-on-class) ${className}`}>
        {/* Inline with the text, so it stays next to the first word when the line wraps. */}
        <span className="mr-1.5 inline-block align-[-0.2em]">
          <Icon name="info" size={16} strokeWidth={2} />
        </span>
        {BETA_NOTICE}
      </p>
    );
  }
  return (
    <p
      className={`flex items-start gap-2 rounded-(--radius-md) bg-(--color-accent-tint) px-3.5 py-2.5 text-footnote text-(--color-text) ${className}`}
    >
      <Icon name="info" size={18} className="mt-0.5 text-(--color-accent-text)" />
      <span>{BETA_NOTICE}</span>
    </p>
  );
}
