import type { LineageParent, StrainRecord } from "@flowerscan/core";
import { useId, useState } from "react";
import { Link, strainPath } from "../../app/router";
import type { StrainData } from "../../data/load-data";
import { ClassPill } from "../../ui/ClassPill";
import { floodFrom } from "../../ui/flood-origin";
import { Icon } from "../../ui/icons";
import { RESULT_COPY } from "./copy";
import { originsUnknown, resolveParent, TREE_GENERATIONS, type TreeNode } from "./result-model";

/** Nested-list family tree: class pills only (no numbers), disputed badges, unknown parents. */
export function FamilyTree({ record, byId }: { record: StrainRecord; byId: StrainData["byId"] }) {
  return (
    <ul className="tree m-0 list-none p-0" aria-label={RESULT_COPY.familyTree}>
      <Item node={{ kind: "record", record }} depth={0} byId={byId} />
    </ul>
  );
}

function Item({ node, depth, byId }: { node: TreeNode; depth: number; byId: StrainData["byId"] }) {
  if (node.kind === "unknown") {
    return (
      <li>
        <div className="flex min-h-12 items-center gap-1.5 py-1.5 font-medium text-(--color-text-2)">
          <Icon name="help" size={18} />
          {RESULT_COPY.unknownParent}
        </div>
      </li>
    );
  }
  const isRoot = depth === 0;
  const info =
    node.kind === "record"
      ? {
          id: node.record.id,
          name: node.record.name,
          kindLabel: node.record.kind === "landrace" ? RESULT_COPY.landrace : null,
          label: node.record.lineage.label,
          disputed: node.record.verification === "disputed",
          parents: node.record.parents,
          landrace: node.record.kind === "landrace",
          linkable: !isRoot,
        }
      : {
          id: node.cross.id,
          name: node.cross.name,
          kindLabel: RESULT_COPY.cross,
          label: node.cross.lineage.label,
          disputed: node.cross.verification === "disputed",
          parents: node.cross.parents,
          landrace: false,
          // Crosses are tree nodes, not search entries, so they have no page.
          linkable: false,
        };
  const ends = originsUnknown(info.parents);
  const showParents = depth < TREE_GENERATIONS && info.parents.length > 0 && !ends;

  return (
    <li>
      <div className="flex min-h-12 flex-wrap items-center gap-2 py-1.5">
        {info.linkable ? (
          <Link
            href={strainPath(info.id)}
            navState={floodFrom}
            className="inline-flex min-h-12 items-center font-semibold text-(--color-text) underline decoration-(--color-border-strong) underline-offset-[3px]"
          >
            {info.name}
          </Link>
        ) : (
          <span className="inline-flex min-h-10 items-center font-semibold text-(--color-text)">
            {info.name}
          </span>
        )}
        {info.kindLabel !== null && (
          <span className="font-medium text-caption text-(--color-text-3)">{info.kindLabel}</span>
        )}
        <ClassPill label={info.label} />
        {info.disputed && <DisputedBadge />}
      </div>
      {ends && !info.landrace && (
        <p className="pb-2 text-footnote text-(--color-text-2) italic">
          {RESULT_COPY.originsUnknown(info.name)}
        </p>
      )}
      {showParents && (
        <ul className="list-none">
          {info.parents.map((parent: LineageParent, i) => (
            <Item
              // Parents can repeat (backcrosses), so the position is part of the key.
              key={`${typeof parent === "string" ? parent : parent.id}-${i}`}
              node={resolveParent(parent, byId)}
              depth={depth + 1}
              byId={byId}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Outlined badge; tapping it shows the one-sentence explanation inline (P9). */
function DisputedBadge() {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex min-h-12 items-center gap-1.5 rounded-(--radius-pill) px-2.5 font-semibold text-caption text-(--color-text) before:absolute before:inset-x-0 before:inset-y-2 before:rounded-(--radius-pill) before:shadow-[inset_0_0_0_1px_var(--color-border-strong)] before:content-['']"
      >
        <Icon name="fork" size={16} />
        {RESULT_COPY.disputed}
      </button>
      <p
        id={id}
        hidden={!open}
        className="mt-1 mb-2 w-full rounded-[12px] bg-(--color-surface-2) px-3.5 py-3 text-footnote text-(--color-text)"
      >
        {RESULT_COPY.disputedExplain}
      </p>
    </>
  );
}
