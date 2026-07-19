import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VirtualList } from "../../components/VirtualList";

const items = Array.from({ length: 100 }, (_, i) => `item-${i}`);

describe("VirtualList", () => {
  it("renders only a windowed subset of items initially, not all 100", () => {
    render(
      <VirtualList items={items} itemHeight={40} viewportHeight={200} getKey={(item) => item} ariaLabel="Test list" renderItem={(item) => <span>{item}</span>} />,
    );
    const rendered = screen.getAllByRole("listitem");
    expect(rendered.length).toBeGreaterThan(0);
    expect(rendered.length).toBeLessThan(items.length);
    expect(screen.getByText("item-0")).toBeInTheDocument();
    expect(screen.queryByText("item-99")).not.toBeInTheDocument();
  });

  it("renders items further down the list after scrolling", () => {
    render(
      <VirtualList items={items} itemHeight={40} viewportHeight={200} getKey={(item) => item} ariaLabel="Test list" renderItem={(item) => <span>{item}</span>} />,
    );
    const list = screen.getByRole("list", { name: "Test list" });
    fireEvent.scroll(list, { target: { scrollTop: 2000 } });
    expect(screen.getByText("item-50")).toBeInTheDocument();
  });

  it("renders nothing but the container when items is empty", () => {
    render(<VirtualList items={[]} itemHeight={40} viewportHeight={200} getKey={(item: string) => item} ariaLabel="Empty list" renderItem={(item) => <span>{item}</span>} />);
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });
});
