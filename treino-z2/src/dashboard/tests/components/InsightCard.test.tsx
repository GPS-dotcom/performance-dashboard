import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InsightCard } from "../../components/InsightCard";
import type { Insight } from "../../../intelligence";

function makeInsight(overrides: Partial<Insight> = {}): Insight {
  return {
    id: "i1",
    category: "fitness",
    priority: 6,
    title: "Fitness trending up",
    description: "CTL has increased steadily over the last 4 weeks.",
    evidence: ["CTL rose from 40 to 48"],
    confidence: 0.82,
    confidenceLevel: "high",
    relatedMetrics: ["ctl"],
    date: "2026-07-18",
    severity: "positive",
    relatedRecommendations: [],
    ...overrides,
  };
}

describe("InsightCard", () => {
  it("renders the description, evidence and confidence", () => {
    render(
      <ul>
        <InsightCard insight={makeInsight()} />
      </ul>,
    );
    expect(screen.getByText("CTL has increased steadily over the last 4 weeks.")).toBeInTheDocument();
    expect(screen.getByText("CTL rose from 40 to 48")).toBeInTheDocument();
    expect(screen.getByText("82% confidence")).toBeInTheDocument();
  });

  it("applies the severity as a CSS class", () => {
    const { container } = render(
      <ul>
        <InsightCard insight={makeInsight({ severity: "critical" })} />
      </ul>,
    );
    expect(container.querySelector(".insight-critical")).not.toBeNull();
  });

  it("renders no evidence list when there's no evidence", () => {
    const { container } = render(
      <ul>
        <InsightCard insight={makeInsight({ evidence: [] })} />
      </ul>,
    );
    expect(container.querySelector(".evidence-list")).toBeNull();
  });
});
