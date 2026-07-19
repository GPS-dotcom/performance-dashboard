import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FilterBar } from "../../components/FilterBar";

describe("FilterBar", () => {
  it("renders the search input with the given value and placeholder", () => {
    render(<FilterBar searchValue="run" onSearchChange={() => {}} searchPlaceholder="Search…" />);
    expect(screen.getByPlaceholderText("Search…")).toHaveValue("run");
  });

  it("calls onSearchChange as the user types", () => {
    const onSearchChange = vi.fn();
    render(<FilterBar searchValue="" onSearchChange={onSearchChange} searchPlaceholder="Search…" />);
    fireEvent.change(screen.getByPlaceholderText("Search…"), { target: { value: "hills" } });
    expect(onSearchChange).toHaveBeenCalledWith("hills");
  });

  it("renders no select when selectOptions/onSelectChange are omitted", () => {
    render(<FilterBar searchValue="" onSearchChange={() => {}} />);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("renders and drives the optional select", () => {
    const onSelectChange = vi.fn();
    render(
      <FilterBar
        searchValue=""
        onSearchChange={() => {}}
        selectLabel="Range"
        selectValue="30"
        selectOptions={[
          { value: "all", label: "All time" },
          { value: "30", label: "Last 30 days" },
        ]}
        onSelectChange={onSelectChange}
      />,
    );
    const select = screen.getByRole("combobox");
    expect(select).toHaveValue("30");
    fireEvent.change(select, { target: { value: "all" } });
    expect(onSelectChange).toHaveBeenCalledWith("all");
  });
});
