import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { LoadingState } from "../LoadingState";

it("renders the message with role status for screen readers", () => {
  render(<LoadingState message="Preparing today's brief…" />);
  expect(screen.getByRole("status")).toHaveTextContent("Preparing today's brief…");
});
