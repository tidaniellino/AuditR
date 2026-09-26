import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./url";

describe("safeRedirectPath (open redirect guard)", () => {
  it("accepts a plain relative path", () => {
    expect(safeRedirectPath("/painel")).toBe("/painel");
    expect(safeRedirectPath("/contratos/123")).toBe("/contratos/123");
  });

  it("falls back on absolute external URLs", () => {
    expect(safeRedirectPath("https://evil.com")).toBe("/painel");
    expect(safeRedirectPath("http://evil.com/phish")).toBe("/painel");
  });

  it("falls back on protocol-relative URLs", () => {
    expect(safeRedirectPath("//evil.com")).toBe("/painel");
  });

  it("falls back on backslash tricks browsers treat as protocol-relative", () => {
    expect(safeRedirectPath("/\\evil.com")).toBe("/painel");
  });

  it("falls back on a path with no leading slash", () => {
    expect(safeRedirectPath("evil.com")).toBe("/painel");
  });

  it("uses the given fallback when provided", () => {
    expect(safeRedirectPath("https://evil.com", "/login")).toBe("/login");
  });
});
