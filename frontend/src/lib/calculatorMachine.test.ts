import { describe, expect, it } from "vitest";

import type { Operation } from "../api/calculator";
import {
  type Action,
  type CalculatorState,
  calculatorReducer,
  formatNumber,
  initialState,
} from "./calculatorMachine";

// A deterministic stand-in for the backend, so the reducer's request/resolve
// cycle can be exercised synchronously.
function backend(operation: Operation, operands: number[]): number {
  switch (operation) {
    case "add":
      return operands[0] + operands[1];
    case "subtract":
      return operands[0] - operands[1];
    case "multiply":
      return operands[0] * operands[1];
    case "divide":
      return operands[0] / operands[1];
    case "power":
      return operands[0] ** operands[1];
    case "percentage":
      return (operands[0] * operands[1]) / 100;
    case "sqrt":
      return Math.sqrt(operands[0]);
  }
}

// press applies an action and immediately resolves any computation the reducer
// requested, mirroring how the useCalculator hook drives the machine.
function press(state: CalculatorState, action: Action): CalculatorState {
  let next = calculatorReducer(state, action);
  while (next.request !== null) {
    const value = backend(next.request.operation, next.request.operands);
    next = calculatorReducer(next, { type: "resolve", value });
  }
  return next;
}

function digits(state: CalculatorState, input: string): CalculatorState {
  return [...input].reduce((acc, ch) => {
    if (ch === ".") return press(acc, { type: "decimal" });
    return press(acc, { type: "digit", value: ch });
  }, state);
}

describe("number entry", () => {
  it("replaces the leading zero with the first digit", () => {
    const state = press(initialState, { type: "digit", value: "5" });
    expect(state.display).toBe("5");
  });

  it("appends subsequent digits", () => {
    const state = digits(initialState, "123");
    expect(state.display).toBe("123");
  });

  it("caps the input length", () => {
    const state = digits(initialState, "12345678901234567890");
    expect(state.display.length).toBe(15);
  });

  it("allows a single decimal point only", () => {
    const state = digits(initialState, "3.14");
    const afterExtraDot = press(state, { type: "decimal" });
    expect(afterExtraDot.display).toBe("3.14");
  });

  it("starts a decimal number from zero", () => {
    const state = press(initialState, { type: "decimal" });
    expect(state.display).toBe("0.");
  });
});

describe("editing", () => {
  it("removes the last character on backspace", () => {
    const state = digits(initialState, "789");
    expect(press(state, { type: "backspace" }).display).toBe("78");
  });

  it("returns to zero when the last digit is deleted", () => {
    const state = digits(initialState, "7");
    expect(press(state, { type: "backspace" }).display).toBe("0");
  });

  it("toggles the sign", () => {
    const state = digits(initialState, "42");
    const negative = press(state, { type: "negate" });
    expect(negative.display).toBe("-42");
    expect(press(negative, { type: "negate" }).display).toBe("42");
  });

  it("does not negate a lone zero", () => {
    expect(press(initialState, { type: "negate" }).display).toBe("0");
  });

  it("clears everything", () => {
    let state = digits(initialState, "99");
    state = press(state, { type: "operator", operator: "add" });
    expect(press(state, { type: "clear" })).toEqual(initialState);
  });
});

describe("binary operations", () => {
  it("adds two numbers", () => {
    let state = digits(initialState, "2");
    state = press(state, { type: "operator", operator: "add" });
    state = digits(state, "3");
    state = press(state, { type: "equals" });
    expect(state.display).toBe("5");
    expect(state.expression).toBe("2 + 3 =");
  });

  it("chains operators, evaluating the pending one first", () => {
    let state = digits(initialState, "2");
    state = press(state, { type: "operator", operator: "add" });
    state = digits(state, "3");
    state = press(state, { type: "operator", operator: "multiply" });
    expect(state.display).toBe("5"); // 2 + 3 resolved before ×
    state = digits(state, "4");
    state = press(state, { type: "equals" });
    expect(state.display).toBe("20");
  });

  it("replaces the operator when pressed twice", () => {
    let state = digits(initialState, "8");
    state = press(state, { type: "operator", operator: "add" });
    state = press(state, { type: "operator", operator: "subtract" });
    state = digits(state, "3");
    state = press(state, { type: "equals" });
    expect(state.display).toBe("5");
  });

  it("computes exponentiation", () => {
    let state = digits(initialState, "2");
    state = press(state, { type: "operator", operator: "power" });
    state = digits(state, "10");
    state = press(state, { type: "equals" });
    expect(state.display).toBe("1024");
  });

  it("continues calculating from a previous result", () => {
    let state = digits(initialState, "10");
    state = press(state, { type: "operator", operator: "add" });
    state = digits(state, "5");
    state = press(state, { type: "equals" }); // 15
    state = press(state, { type: "operator", operator: "multiply" });
    state = digits(state, "2");
    state = press(state, { type: "equals" });
    expect(state.display).toBe("30");
  });

  it("ignores equals with no pending operation", () => {
    const state = digits(initialState, "7");
    expect(press(state, { type: "equals" }).display).toBe("7");
  });
});

describe("unary operations", () => {
  it("takes a square root", () => {
    const state = press(digits(initialState, "144"), { type: "unary", operator: "sqrt" });
    expect(state.display).toBe("12");
  });

  it("applies a percentage contextually inside an operation", () => {
    let state = digits(initialState, "200");
    state = press(state, { type: "operator", operator: "add" });
    state = digits(state, "10");
    state = press(state, { type: "unary", operator: "percentage" });
    expect(state.display).toBe("20"); // 10% of 200
    state = press(state, { type: "equals" });
    expect(state.display).toBe("220");
  });

  it("treats a standalone percentage as division by 100", () => {
    const state = press(digits(initialState, "50"), { type: "unary", operator: "percentage" });
    expect(state.display).toBe("0.5");
  });
});

describe("error handling", () => {
  it("enters an error state on reject and recovers on new input", () => {
    let state = digits(initialState, "5");
    state = calculatorReducer(state, { type: "reject" });
    expect(state.display).toBe("Error");
    expect(state.errored).toBe(true);

    state = press(state, { type: "digit", value: "9" });
    expect(state.display).toBe("9");
    expect(state.errored).toBe(false);
  });

  it("ignores operators while in an error state", () => {
    const errored = calculatorReducer(initialState, { type: "reject" });
    expect(press(errored, { type: "operator", operator: "add" })).toBe(errored);
  });
});

describe("formatNumber", () => {
  it("removes floating point noise", () => {
    expect(formatNumber(0.1 + 0.2)).toBe("0.3");
  });

  it("labels non-finite values as errors", () => {
    expect(formatNumber(Infinity)).toBe("Error");
    expect(formatNumber(NaN)).toBe("Error");
  });

  it("keeps integers intact", () => {
    expect(formatNumber(42)).toBe("42");
  });
});
