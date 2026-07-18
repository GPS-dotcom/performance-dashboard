import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { EmptyState } from "../EmptyState";

it("renders the message without an action by default", () => {
  render(<EmptyState message="No activities synced yet." />);
  expect(screen.getByText("No activities synced yet.")).toBeInTheDocument();
});

it("renders a suggested action when provided", () => {
  render(<EmptyState message="No upcoming race set." action="Add a goal to see a countdown here." />);
  expect(screen.getByText("Add a goal to see a countdown here.")).toBeInTheDocument();
});
