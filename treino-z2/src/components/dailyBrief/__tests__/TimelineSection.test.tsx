import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { TimelineSection } from "../TimelineSection";

it("shows an empty-state message when there are no events", () => {
  render(<TimelineSection events={[]} />);
  expect(screen.getByText("No activities synced yet.")).toBeInTheDocument();
});

it("lists each event's date, title and description", () => {
  render(
    <TimelineSection
      events={[
        { date: "2026-07-17", title: "Easy Run", description: "8.0 km", kind: "activity" },
        { date: "2026-07-15", title: "5K Time Trial", description: "New best effort", kind: "personal_record" },
      ]}
    />,
  );
  expect(screen.getByText("Easy Run")).toBeInTheDocument();
  expect(screen.getByText("8.0 km")).toBeInTheDocument();
  expect(screen.getByText("5K Time Trial")).toBeInTheDocument();
});

it("shows a PR badge only for personal_record events", () => {
  render(
    <TimelineSection
      events={[
        { date: "2026-07-17", title: "Easy Run", description: "8.0 km", kind: "activity" },
        { date: "2026-07-15", title: "5K Time Trial", description: "New best effort", kind: "personal_record" },
      ]}
    />,
  );
  expect(screen.getAllByText("PR")).toHaveLength(1);
});
