import { useCallback, useEffect, useReducer } from "react";
import { toast } from "sonner";

import { ApiError } from "../api/calculator";
import {
  type Action,
  calculatorReducer,
  initialState,
} from "../lib/calculatorMachine";
import { useCalculate } from "./useCalculate";

// InputAction is the subset of reducer actions triggered by the user; resolve
// and reject are internal to the request lifecycle.
export type InputAction = Exclude<Action, { type: "resolve" } | { type: "reject" }>;

// useCalculator binds the pure state machine to the network layer. It runs any
// computation the reducer requests through React Query, reports failures via a
// toast, and exposes a guarded `press` plus physical-keyboard support.
export function useCalculator() {
  const [state, dispatch] = useReducer(calculatorReducer, initialState);
  const calculation = useCalculate();
  const busy = state.request !== null || calculation.isPending;

  useEffect(() => {
    const request = state.request;
    if (request === null) {
      return;
    }
    let cancelled = false;
    calculation
      .mutateAsync({ operation: request.operation, operands: request.operands })
      .then((value) => {
        if (!cancelled) {
          dispatch({ type: "resolve", value });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        const message = error instanceof ApiError ? error.message : "Something went wrong.";
        toast.error(message);
        dispatch({ type: "reject" });
      });
    return () => {
      cancelled = true;
    };
    // Re-run whenever a new request is queued by the reducer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.request]);

  const press = useCallback(
    (action: InputAction) => {
      if (busy) {
        return;
      }
      dispatch(action);
    },
    [busy],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const action = actionForKey(event.key);
      if (action === null) {
        return;
      }
      event.preventDefault();
      press(action);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [press]);

  return {
    display: state.display,
    expression: state.expression,
    busy,
    press,
  };
}

// actionForKey maps a physical keyboard key to a calculator action.
export function actionForKey(key: string): InputAction | null {
  if (key >= "0" && key <= "9") {
    return { type: "digit", value: key };
  }
  switch (key) {
    case ".":
    case ",":
      return { type: "decimal" };
    case "+":
      return { type: "operator", operator: "add" };
    case "-":
      return { type: "operator", operator: "subtract" };
    case "*":
      return { type: "operator", operator: "multiply" };
    case "/":
      return { type: "operator", operator: "divide" };
    case "^":
      return { type: "operator", operator: "power" };
    case "%":
      return { type: "unary", operator: "percentage" };
    case "r":
    case "R":
      return { type: "unary", operator: "sqrt" };
    case "=":
    case "Enter":
      return { type: "equals" };
    case "Backspace":
      return { type: "backspace" };
    case "Escape":
    case "c":
    case "C":
      return { type: "clear" };
    default:
      return null;
  }
}
