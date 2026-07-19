import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

vi.mock("../dashboard/pages/HomePage", () => ({
  HomePage: () => <div data-testid="home-page" />,
}));

const { default: App } = await import("../App");

it("renders the app header, nav and the Home page for the default route", async () => {
  render(<App />);
  expect(screen.getByText("Treino Z2")).toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 1, name: "Performance OS" })).toBeInTheDocument();
  expect(await screen.findByTestId("home-page")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Activities" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Home", current: "page" })).toBeInTheDocument();
});
