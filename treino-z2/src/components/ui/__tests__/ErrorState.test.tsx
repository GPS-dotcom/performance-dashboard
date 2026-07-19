import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ErrorState } from "../ErrorState";

it("has role alert so screen readers announce it immediately", () => {
  render(<ErrorState title="Could not load today's brief." message="network down" />);
  expect(screen.getByRole("alert")).toBeInTheDocument();
});

it("does not render a retry button when onRetry is not provided", () => {
  render(<ErrorState title="Error" message="x" />);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

it("calls onRetry when the retry button is clicked", () => {
  const onRetry = vi.fn();
  render(<ErrorState title="Error" message="x" onRetry={onRetry} />);
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(onRetry).toHaveBeenCalledTimes(1);
});

it("disables the retry button and shows a retrying label while retrying", () => {
  render(<ErrorState title="Error" message="x" onRetry={() => {}} retrying />);
  const button = screen.getByRole("button", { name: "Retrying…" });
  expect(button).toBeDisabled();
});
