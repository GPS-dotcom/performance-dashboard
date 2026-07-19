import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { Card } from "../Card";

it("renders the title as a heading and the children as content", () => {
  render(
    <Card title="Recovery">
      <p>Recovery is good.</p>
    </Card>,
  );
  expect(screen.getByRole("heading", { name: "Recovery" })).toBeInTheDocument();
  expect(screen.getByText("Recovery is good.")).toBeInTheDocument();
});
