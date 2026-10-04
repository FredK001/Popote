"use client";

import { useImperativeHandle, useRef, useState, type CSSProperties, type Ref } from "react";

export type ConfettiHandle = { burst: () => void };

type Piece = { id: number; style: CSSProperties };

const COLORS = ["var(--tomate)", "var(--laiton)", "var(--sauge)", "var(--prune)", "var(--abricot-ink)", "var(--bleu-nuit)"];
const COUNT = 22;
const DURATION_MS = 1000;

function makePieces(seed: number): Piece[] {
  return Array.from({ length: COUNT }, (_, k) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 90 + Math.random() * 120;
    const isDot = k % 3 === 0;
    const isStrip = k % 4 === 1;
    return {
      id: seed * COUNT + k,
      style: {
        background: COLORS[k % COLORS.length],
        width: isStrip ? 14 : 10,
        height: isStrip ? 6 : 10,
        borderRadius: isDot ? "50%" : 2,
        "--x": `${Math.cos(angle) * distance}px`,
        "--y": `${Math.sin(angle) * distance - 60}px`,
        "--r": `${Math.random() * 540 - 270}deg`,
      } as CSSProperties,
    };
  });
}

/**
 * Flat confetti burst (< 1 s), triggered by a user action only.
 * Place inside a relatively positioned element; pieces start from its centre.
 */
export function Confetti({ ref }: { ref: Ref<ConfettiHandle> }) {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const bursts = useRef(0);

  useImperativeHandle(ref, () => ({
    burst() {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      bursts.current += 1;
      setPieces(makePieces(bursts.current));
      window.setTimeout(() => setPieces([]), DURATION_MS);
    },
  }));

  if (pieces.length === 0) return null;

  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-45 overflow-visible">
      {pieces.map((piece) => (
        <i key={piece.id} className="absolute left-1/2 top-1/2 block animate-burst" style={piece.style} />
      ))}
    </span>
  );
}
