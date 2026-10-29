import type { ClassificationLabel } from "@flowerscan/core";
import { CLASS_PILL_WORD } from "./copy";
import { Icon, type IconName } from "./icons";

/** Icon per class (never color alone: icon + word everywhere). */
export const CLASS_ICON: Record<ClassificationLabel, IconName> = {
  indica: "moon",
  hybrid: "half",
  sativa: "sun",
  unknown: "help",
};

/** The CSS class that sets `--cls` / `--cls-ink` for a label (styles/index.css). */
export function classTone(label: ClassificationLabel): string {
  return `cls-${label}`;
}

/** Class fill, ink text, icon + the class word only (D14). Display only. */
export function ClassPill({ label }: { label: ClassificationLabel }) {
  return (
    <span
      className={`${classTone(label)} inline-flex min-h-[26px] items-center gap-1 rounded-(--radius-sm) bg-(--cls) py-0.5 pr-[9px] pl-[7px] font-bold text-caption text-(--color-on-class) leading-[1.2]`}
    >
      <Icon name={CLASS_ICON[label]} size={15} strokeWidth={2.2} />
      {CLASS_PILL_WORD[label]}
    </span>
  );
}
