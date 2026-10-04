import { Avatar } from "@/components/ui/Avatar";
import { cx } from "@/lib/cx";
import type { LineageNode } from "@/lib/recipes/genealogy";
import { shortDate } from "@/lib/time-ago";
import { format, t } from "@/messages";

/** Round "fiche 1974" badge for a non-user origin (grandma's card, a book…). */
function OriginBadge({ label, year, size }: { label: string; year: number | null; size: "m" | "l" }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "flex flex-none flex-col items-center justify-center rounded-pill bg-laiton-soft text-center font-bold leading-tight text-laiton-ink",
        size === "l" ? "size-13 text-caption" : "size-10 text-[0.625rem]",
      )}
    >
      {year ? (
        <>
          {t.lineage.origin}
          <br />
          {year}
        </>
      ) : (
        label.charAt(0).toUpperCase()
      )}
    </span>
  );
}

function nodeName(node: LineageNode): string {
  if (node.kind === "origin") return node.label;
  if (node.kind === "you") return t.lineage.youQuestion;
  return node.role === "me" ? t.lineage.you : node.name;
}

/** Public page: compact horizontal chain "Odette — Julie — Fred — Toi ?". */
export function LineageChain({ nodes }: { nodes: LineageNode[] }) {
  return (
    <div className="mt-6 rounded-card border border-trait bg-surface p-4">
      <h2 className="text-h3 text-laiton-ink">{t.lineage.travels}</h2>
      <ol className="mt-3 flex items-start">
        {nodes.map((node, i) => (
          <li key={i} className="flex min-w-0 flex-1 items-start last:flex-none">
            <span className="flex w-15 flex-none flex-col items-center gap-1 text-center text-caption font-semibold text-laiton-ink">
              {node.kind === "origin" && <OriginBadge label={node.label} year={null} size="m" />}
              {node.kind === "person" && <Avatar name={node.name} tone={node.color} photoUrl={node.photoUrl} />}
              {node.kind === "you" && (
                <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-pill border-2 border-dashed border-laiton font-bold">
                  ?
                </span>
              )}
              <span className="line-clamp-2 w-full break-words">{nodeName(node)}</span>
            </span>
            {i < nodes.length - 1 && <span aria-hidden="true" className="mt-5 h-0.5 min-w-3 flex-1 bg-laiton" />}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Recipe sheet: vertical story with dates, from origin to me, then how far I passed it on. */
export function LineageStory({ nodes, onward }: { nodes: LineageNode[]; onward: number }) {
  return (
    <section aria-labelledby="lineage-title">
      <h2 id="lineage-title" className="mt-8 mb-2 text-h2">
        {t.lineage.title}
      </h2>
      <ol className="relative rounded-block border border-trait bg-surface px-4.5 py-5">
        <span aria-hidden="true" className="absolute top-10 bottom-10 left-[2.75rem] w-0.5 bg-laiton" />
        {nodes.map((node, i) => {
          const prev = nodes[i - 1];
          const prevName = prev?.kind === "person" ? prev.name : null;
          let detail = "";
          if (node.kind === "origin") detail = node.year ? `${node.label}, ${node.year}` : node.label;
          if (node.kind === "person") {
            if (node.role === "author") detail = t.lineage.authorLine;
            else if (node.role === "me" && !prevName) detail = t.lineage.wroteIt;
            else if (prevName)
              detail = node.receivedAt
                ? format(t.lineage.receivedOn, { name: prevName, date: shortDate(node.receivedAt) })
                : format(t.lineage.receivedFrom, { name: prevName });
          }
          return (
            <li key={i} className="relative grid grid-cols-[3.25rem_1fr] items-center gap-3.5 py-2">
              <span className="flex justify-center">
                {node.kind === "origin" && <OriginBadge label={node.label} year={node.year} size="l" />}
                {node.kind === "person" && <Avatar name={node.name} tone={node.color} size="l" photoUrl={node.photoUrl} />}
              </span>
              <span>
                <span className={cx("block text-h3 font-bold tracking-[-0.01em]", node.kind === "person" && node.role === "me" && "text-tomate-dark")}>
                  {node.kind === "origin" ? node.label : nodeName(node)}
                </span>
                {detail && node.kind !== "origin" && <span className="text-small text-encre-3">{detail}</span>}
              </span>
            </li>
          );
        })}
        {onward > 0 && (
          <li className="relative grid grid-cols-[3.25rem_1fr] items-center gap-3.5 py-2">
            <span aria-hidden="true" className="flex size-13 items-center justify-center justify-self-center rounded-pill bg-laiton-soft font-bold text-laiton-ink">
              +{onward}
            </span>
            <span className="text-h3 font-bold">
              {onward === 1 ? t.lineage.onwardOne : format(t.lineage.onward, { n: onward })}
            </span>
          </li>
        )}
      </ol>
    </section>
  );
}
