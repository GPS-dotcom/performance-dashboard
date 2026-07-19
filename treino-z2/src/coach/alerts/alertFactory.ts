import type { Alert, AlertCategory, AlertSeverity } from "../types/alert";

// Factory Pattern, mirroring recommendations/recommendationFactory.ts:
// the only place an Alert object is assembled.

export interface CreateAlertParams {
  category: AlertCategory;
  /** Stable, human-readable slug identifying which rule produced this (e.g. "overreaching"). Combined with `generatedAt` and `idSuffix` to form `id`. */
  kind: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  actionRequired: string | null;
  generatedAt: string;
  /** Extra id component so two different subjects of the same kind/date don't collide. */
  idSuffix?: string;
}

export class AlertFactory {
  static create(params: CreateAlertParams): Alert {
    const id = ["alert", params.kind, params.generatedAt.slice(0, 10), params.idSuffix].filter(Boolean).join(":");

    return {
      id,
      severity: params.severity,
      category: params.category,
      title: params.title,
      description: params.description,
      actionRequired: params.actionRequired,
      generatedAt: params.generatedAt,
    };
  }
}
