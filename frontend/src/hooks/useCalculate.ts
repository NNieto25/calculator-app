import { useMutation } from "@tanstack/react-query";

import { calculate, type CalculationRequest } from "../api/calculator";

// useCalculate wraps the API boundary in a React Query mutation.
export function useCalculate() {
  return useMutation<number, Error, CalculationRequest>({
    mutationFn: calculate,
  });
}
