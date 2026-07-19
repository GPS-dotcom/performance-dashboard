import type { ReactNode } from "react";

export type BadgeVariant = "info" | "success" | "warning" | "danger" | "neutral";

export interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
}

/** COMPONENT_LIBRARY.md's Badge: "Variants: Success, Warning, Error, Info, Neutral." */
export function Badge({ variant = "neutral", children }: BadgeProps) {
  return <span className={`ui-badge ui-badge-${variant}`}>{children}</span>;
}
