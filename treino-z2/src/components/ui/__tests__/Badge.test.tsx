import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { Badge } from "../Badge";
import { ConfidenceBadge } from "../ConfidenceBadge";

it("applies the neutral variant class by default", () => {
  render(<Badge>Draft</Badge>);
  expect(screen.getByText("Draft")).toHaveClass("ui-badge-neutral");
});

it("applies the requested variant class", () => {
  render(<Badge variant="danger">Critical</Badge>);
  expect(screen.getByText("Critical")).toHaveClass("ui-badge-danger");
});

it("ConfidenceBadge formats a 0-1 confidence as a rounded percentage", () => {
  render(<ConfidenceBadge confidence={0.923} />);
  expect(screen.getByText("92% confidence")).toHaveClass("ui-badge-info");
});
