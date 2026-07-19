import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../providers/ThemeProvider";
import { useTheme } from "../../providers/themeContext";

function Consumer() {
  const { preference, setPreference } = useTheme();
  return (
    <div>
      <span data-testid="preference">{preference}</span>
      <button type="button" onClick={() => setPreference("dark")}>
        dark
      </button>
      <button type="button" onClick={() => setPreference("light")}>
        light
      </button>
      <button type="button" onClick={() => setPreference("system")}>
        system
      </button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("ThemeProvider", () => {
  it("defaults to 'system' and clears the data-theme attribute", () => {
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("preference").textContent).toBe("system");
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it("stamps data-theme and persists to localStorage when set to dark", () => {
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );
    act(() => screen.getByText("dark").click());
    expect(screen.getByTestId("preference").textContent).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("treino-z2:theme")).toBe("dark");
  });

  it("removes data-theme and the stored preference when set back to system", () => {
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );
    act(() => screen.getByText("light").click());
    act(() => screen.getByText("system").click());
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(localStorage.getItem("treino-z2:theme")).toBeNull();
  });

  it("reads a previously stored preference on mount", () => {
    localStorage.setItem("treino-z2:theme", "dark");
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("preference").textContent).toBe("dark");
  });

  it("still updates in-memory state when localStorage.setItem throws", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );
    act(() => screen.getByText("dark").click());
    expect(screen.getByTestId("preference").textContent).toBe("dark");
    spy.mockRestore();
  });

  it("falls back to 'system' when localStorage.getItem throws on mount", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("preference").textContent).toBe("system");
    spy.mockRestore();
  });

  it("throws when useTheme is used outside a ThemeProvider", () => {
    const spy = vitestSuppressErrorLog();
    expect(() => render(<Consumer />)).toThrow("useTheme must be used within a ThemeProvider");
    spy.restore();
  });
});

function vitestSuppressErrorLog() {
  const original = console.error;
  console.error = () => {};
  return {
    restore: () => {
      console.error = original;
    },
  };
}
