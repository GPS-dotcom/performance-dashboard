import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Timeline } from "../../components/Timeline";

describe("Timeline", () => {
  it("renders the empty state when there are no items", () => {
    render(<Timeline items={[]} />);
    expect(screen.getByText("Nothing to show yet.")).toBeInTheDocument();
  });

  it("uses a custom empty message when given", () => {
    render(<Timeline items={[]} emptyMessage="No activities synced yet." />);
    expect(screen.getByText("No activities synced yet.")).toBeInTheDocument();
  });

  it("renders each item's date, title and description", () => {
    render(
      <Timeline
        items={[
          { id: 1, date: "2026-07-18", title: "Morning Run", description: "10.2 km" },
          { id: 2, date: "2026-07-17", title: "Interval Session", description: "8.0 km", badge: "PR", highlighted: true },
        ]}
      />,
    );
    expect(screen.getByText("Morning Run")).toBeInTheDocument();
    expect(screen.getByText("10.2 km")).toBeInTheDocument();
    expect(screen.getByText("PR")).toBeInTheDocument();
  });
});
