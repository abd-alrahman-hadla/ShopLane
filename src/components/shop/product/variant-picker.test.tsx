// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { VariantOption } from "@/features/catalog/types";
import { VariantPicker } from "./variant-picker";

function variant(
  sku: string,
  size: string,
  color: string,
  stock: number,
  priceCents: number,
): VariantOption {
  return {
    id: sku,
    sku,
    title: `${size} / ${color}`,
    size,
    color,
    priceCents,
    compareAtPriceCents: null,
    stock,
  };
}

const variants = [
  variant("08-WHT", "8 oz", "White", 30, 2200),
  variant("08-CLY", "8 oz", "Clay", 12, 2200),
  variant("12-WHT", "12 oz", "White", 26, 2400),
  variant("12-SGE", "12 oz", "Sage", 0, 2400),
];

afterEach(cleanup);

describe("VariantPicker", () => {
  it("shows the selected options", () => {
    render(<VariantPicker variants={variants} selected={variants[2]!} onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Size 12 oz" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Color White" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("disables combinations that do not exist", () => {
    render(<VariantPicker variants={variants} selected={variants[2]!} onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Color Clay" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Color White" })).toBeEnabled();
  });

  it("labels sold-out combinations but keeps them selectable", () => {
    render(<VariantPicker variants={variants} selected={variants[2]!} onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Color Sage (sold out)" })).toBeEnabled();
  });

  it("selects the matching variant when an option is clicked", async () => {
    const onSelect = vi.fn();
    render(<VariantPicker variants={variants} selected={variants[0]!} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: "Size 12 oz" }));
    expect(onSelect).toHaveBeenCalledWith(variants[2]);
  });
});
