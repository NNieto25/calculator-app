// A pure, framework-free calculator state machine.
//
// It models the behaviour of a physical calculator (entering numbers, chaining
// operators, equals, clear, etc.) as a reducer. Arithmetic itself is delegated
// to the backend: whenever a computation is required, the reducer records a
// `request` describing the call to make. The host (a React hook) performs that
// request and feeds the outcome back via `resolve`/`reject`. Keeping the maths
// out of this file lets the whole interaction model be tested synchronously.

import type { Operation } from "../api/calculator";

export type BinaryOperator = "add" | "subtract" | "multiply" | "divide" | "power";

const SYMBOLS: Record<Operation, string> = {
  add: "+",
  subtract: "−",
  multiply: "×",
  divide: "÷",
  power: "^",
  percentage: "%",
  sqrt: "√",
};

const INITIAL_DISPLAY = "0";
const ERROR_DISPLAY = "Error";
const DECIMAL_POINT = ".";
const NEGATIVE_SIGN = "-";
const DECIMAL_ENTRY_START = INITIAL_DISPLAY + DECIMAL_POINT;

const MAX_INPUT_LENGTH = 15;
const DISPLAY_PRECISION = 12;

// A standalone "%" divides by 100. Expressed through the backend's percentage
// operation as percentage(value, 1) === value * 1 / 100 === value / 100.
const STANDALONE_PERCENT_MULTIPLIER = 1;

// Request describes a computation the host must perform, plus what to do with
// the result once it arrives.
export interface Request {
  operation: Operation;
  operands: number[];
  outcome: "result" | "chain" | "operand";
  nextOperator?: BinaryOperator;
  expression?: string;
}

export interface CalculatorState {
  display: string;
  expression: string;
  accumulator: number | null;
  operator: BinaryOperator | null;
  overwrite: boolean;
  errored: boolean;
  request: Request | null;
}

export type Action =
  | { type: "digit"; value: string }
  | { type: "decimal" }
  | { type: "backspace" }
  | { type: "clear" }
  | { type: "negate" }
  | { type: "operator"; operator: BinaryOperator }
  | { type: "unary"; operator: "sqrt" | "percentage" }
  | { type: "equals" }
  | { type: "resolve"; value: number }
  | { type: "reject" };

export const initialState: CalculatorState = {
  display: INITIAL_DISPLAY,
  expression: "",
  accumulator: null,
  operator: null,
  overwrite: true,
  errored: false,
  request: null,
};

const erroredState: CalculatorState = {
  ...initialState,
  display: ERROR_DISPLAY,
  errored: true,
};

export function calculatorReducer(state: CalculatorState, action: Action): CalculatorState {
  switch (action.type) {
    case "digit":
      return inputDigit(state, action.value);
    case "decimal":
      return inputDecimal(state);
    case "backspace":
      return backspace(state);
    case "clear":
      return initialState;
    case "negate":
      return negate(state);
    case "operator":
      return chooseOperator(state, action.operator);
    case "unary":
      return applyUnary(state, action.operator);
    case "equals":
      return equals(state);
    case "resolve":
      return resolve(state, action.value);
    case "reject":
      return erroredState;
  }
}

// formatNumber renders a result without floating-point noise (0.1 + 0.2 shows
// as 0.3, not 0.30000000000000004) and falls back to the error label for any
// non-finite value.
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return ERROR_DISPLAY;
  }
  const withoutFloatingNoise = parseFloat(value.toPrecision(DISPLAY_PRECISION));
  return withoutFloatingNoise.toString();
}

// displayHoldsResult is true when the display shows a computed value, an error,
// or a placeholder rather than a number the user is actively typing.
function displayHoldsResult(state: CalculatorState): boolean {
  return state.overwrite || state.errored;
}

function pendingExpression(value: number, operator: BinaryOperator): string {
  return `${formatNumber(value)} ${SYMBOLS[operator]}`;
}

function completedExpression(left: number, operator: BinaryOperator, right: number): string {
  return `${formatNumber(left)} ${SYMBOLS[operator]} ${formatNumber(right)} =`;
}

// beginEntry starts a fresh number, keeping any pending operator expression.
function beginEntry(state: CalculatorState, display: string): CalculatorState {
  const expression = state.operator === null ? "" : state.expression;
  return { ...state, display, expression, overwrite: false, errored: false };
}

function inputDigit(state: CalculatorState, digit: string): CalculatorState {
  if (displayHoldsResult(state)) {
    return beginEntry(state, digit);
  }

  const digitsEntered = state.display.replace(NEGATIVE_SIGN, "").length;
  if (digitsEntered >= MAX_INPUT_LENGTH) {
    return state;
  }

  const startingFromZero = state.display === INITIAL_DISPLAY;
  const display = startingFromZero ? digit : state.display + digit;
  return { ...state, display };
}

function inputDecimal(state: CalculatorState): CalculatorState {
  if (displayHoldsResult(state)) {
    return beginEntry(state, DECIMAL_ENTRY_START);
  }
  if (state.display.includes(DECIMAL_POINT)) {
    return state;
  }
  return { ...state, display: state.display + DECIMAL_POINT };
}

function backspace(state: CalculatorState): CalculatorState {
  if (displayHoldsResult(state)) {
    return state;
  }

  const trimmed = state.display.slice(0, -1);
  const nothingLeft = trimmed === "" || trimmed === NEGATIVE_SIGN;
  if (nothingLeft) {
    return { ...state, display: INITIAL_DISPLAY, overwrite: true };
  }
  return { ...state, display: trimmed };
}

function negate(state: CalculatorState): CalculatorState {
  if (state.errored || state.display === INITIAL_DISPLAY) {
    return state;
  }

  const isNegative = state.display.startsWith(NEGATIVE_SIGN);
  const display = isNegative ? state.display.slice(1) : NEGATIVE_SIGN + state.display;
  return { ...state, display };
}

function chooseOperator(state: CalculatorState, operator: BinaryOperator): CalculatorState {
  if (state.errored) {
    return state;
  }

  const current = Number(state.display);
  const { accumulator: left, operator: pending } = state;

  // A pending operator with a freshly entered right-hand operand must be
  // evaluated before the new operator takes effect (operator chaining).
  const hasRightOperand = pending !== null && left !== null && !state.overwrite;
  if (hasRightOperand) {
    return {
      ...state,
      request: {
        operation: pending,
        operands: [left, current],
        outcome: "chain",
        nextOperator: operator,
      },
    };
  }

  const keepAccumulator = state.overwrite && left !== null;
  const accumulator = keepAccumulator ? left : current;
  return {
    ...state,
    accumulator,
    operator,
    overwrite: true,
    expression: pendingExpression(accumulator, operator),
  };
}

function applyUnary(state: CalculatorState, operator: "sqrt" | "percentage"): CalculatorState {
  if (state.errored) {
    return state;
  }

  const current = Number(state.display);

  if (operator === "sqrt") {
    return withRequest(state, { operation: "sqrt", operands: [current], outcome: "operand" });
  }

  // Percentage is contextual: with a pending operation it means "current % of
  // the accumulator" (200 + 10% -> 20); standalone it simply divides by 100.
  const { accumulator, operator: pending } = state;
  const isPartOfOperation = pending !== null && accumulator !== null;
  const operands = isPartOfOperation
    ? [accumulator, current]
    : [current, STANDALONE_PERCENT_MULTIPLIER];

  return withRequest(state, { operation: "percentage", operands, outcome: "operand" });
}

function equals(state: CalculatorState): CalculatorState {
  const { accumulator, operator } = state;
  const canEvaluate = !state.errored && operator !== null && accumulator !== null;
  if (!canEvaluate) {
    return state;
  }

  const current = Number(state.display);
  return withRequest(state, {
    operation: operator,
    operands: [accumulator, current],
    outcome: "result",
    expression: completedExpression(accumulator, operator, current),
  });
}

function resolve(state: CalculatorState, value: number): CalculatorState {
  const request = state.request;
  if (request === null) {
    return state;
  }

  const display = formatNumber(value);
  const cleared = { ...state, display, overwrite: true, request: null };

  switch (request.outcome) {
    case "chain": {
      const nextOperator = request.nextOperator ?? null;
      return {
        ...cleared,
        accumulator: value,
        operator: nextOperator,
        expression: nextOperator ? pendingExpression(value, nextOperator) : "",
      };
    }
    case "operand":
      return cleared;
    case "result":
      return {
        ...cleared,
        accumulator: null,
        operator: null,
        expression: request.expression ?? "",
      };
  }
}

function withRequest(state: CalculatorState, request: Request): CalculatorState {
  return { ...state, request };
}
