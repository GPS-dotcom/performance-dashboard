import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppShell } from "../../layouts/AppShell";
import { ThemeProvider } from "../../providers/ThemeProvider";

function renderShell(route: Parameters<typeof AppShell>[0]["route"]) {
  return render(
    <ThemeProvider>
      <AppShell route={route}>
        <div data-testid="page-content" />
      </AppShell>
    </ThemeProvider>,
  );
}

describe("AppShell", () => {
  it("renders the app title, the page content and a link for every nav item", () => {
    renderShell("home");
    expect(screen.getByRole("heading", { level: 1, name: "Performance OS" })).toBeInTheDocument();
    expect(screen.getByTestId("page-content")).toBeInTheDocument();
    for (const label of ["Home", "Activities", "Metrics", "Predictions", "Coach", "Shoes", "Laboratory", "Settings"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("marks the active route's nav link with aria-current", () => {
    renderShell("coach");
    expect(screen.getByRole("link", { name: "Coach" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("renders a theme preference selector that drives ThemeProvider", () => {
    renderShell("home");
    const select = screen.getByLabelText("Theme preference");
    expect(select).toBeInTheDocument();
    fireEvent.change(select, { target: { value: "dark" } });
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
