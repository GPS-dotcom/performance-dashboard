import type { ReactNode } from "react";

export interface CardProps {
  /** Rendered as an <h2> to keep the page's heading hierarchy meaningful for screen readers. */
  title: string;
  children: ReactNode;
}

/**
 * Base layout primitive (COMPONENT_LIBRARY.md's Card: "Header -> Content
 * -> Footer"). Every Daily Brief section renders through this instead of
 * hand-rolling its own <section>/label markup, per DESIGN_SYSTEM.md:
 * "Cards are the primary UI container."
 */
export function Card({ title, children }: CardProps) {
  return (
    <section className="ui-card">
      <h2 className="ui-card-title">{title}</h2>
      {children}
    </section>
  );
}
