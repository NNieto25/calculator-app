import { describe, expect, it } from "vitest";

import { actionForKey } from "./useCalculator";

describe("actionForKey", () => {
  it("maps number keys to digit actions", () => {
    expect(actionForKey("0")).toEqual({ type: "digit", value: "0" });
    expect(actionForKey("9")).toEqual({ type: "digit", value: "9" });
  });

  it("maps both '.' and ',' to a decimal", () => {
    expect(actionForKey(".")).toEqual({ type: "decimal" });
    expect(actionForKey(",")).toEqual({ type: "decimal" });
  });

  it("maps arithmetic symbols to binary operators", () => {
    expect(actionForKey("+")).toEqual({ type: "operator", operator: "add" });
    expect(actionForKey("-")).toEqual({ type: "operator", operator: "subtract" });
    expect(actionForKey("*")).toEqual({ type: "operator", operator: "multiply" });
    expect(actionForKey("/")).toEqual({ type: "operator", operator: "divide" });
    expect(actionForKey("^")).toEqual({ type: "operator", operator: "power" });
  });

  it("maps unary shortcuts", () => {
    expect(actionForKey("%")).toEqual({ type: "unary", operator: "percentage" });
    expect(actionForKey("r")).toEqual({ type: "unary", operator: "sqrt" });
    expect(actionForKey("R")).toEqual({ type: "unary", operator: "sqrt" });
  });

  it("maps equals, delete and clear keys", () => {
    expect(actionForKey("=")).toEqual({ type: "equals" });
    expect(actionForKey("Enter")).toEqual({ type: "equals" });
    expect(actionForKey("Backspace")).toEqual({ type: "backspace" });
    expect(actionForKey("Escape")).toEqual({ type: "clear" });
    expect(actionForKey("c")).toEqual({ type: "clear" });
    expect(actionForKey("C")).toEqual({ type: "clear" });
  });

  it("ignores unmapped keys", () => {
    expect(actionForKey("a")).toBeNull();
    expect(actionForKey("Tab")).toBeNull();
  });
});
