import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

vi.mock("../components/dailyBrief/DailyBriefPage", () => ({
  DailyBriefPage: () => <div data-testid="daily-brief-page" />,
}));

const { default: App } = await import("../App");

it("renders the app header and the Daily Brief page", () => {
  render(<App />);
  expect(screen.getByText("Treino Z2")).toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 1, name: "Daily Brief" })).toBeInTheDocument();
  expect(screen.getByTestId("daily-brief-page")).toBeInTheDocument();
});
