import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../components/dailyBrief/DailyBriefPage", () => ({
  DailyBriefPage: () => <div data-testid="daily-brief-page" />,
}));

const { HomePage } = await import("../../pages/HomePage");

describe("HomePage", () => {
  it("renders the Daily Brief page", () => {
    render(<HomePage />);
    expect(screen.getByTestId("daily-brief-page")).toBeInTheDocument();
  });
});
