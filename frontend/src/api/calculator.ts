// This module is the single boundary between the app and the calculator REST API.

export type Operation =
  | "add"
  | "subtract"
  | "multiply"
  | "divide"
  | "power"
  | "percentage"
  | "sqrt";

export interface CalculationRequest {
  operation: Operation;
  operands: number[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

const NETWORK_ERROR = {
  message: "Could not reach the calculator service.",
  code: "NETWORK_ERROR",
};
const UNKNOWN_ERROR = {
  message: "The calculation could not be completed.",
  code: "UNKNOWN_ERROR",
};

// ApiError carries the machine-readable code returned by the backend so the UI
// can present a meaningful, human message.
export class ApiError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

interface ResultResponse {
  result: number;
}

interface ErrorResponse {
  error: string;
  code: string;
}

export async function calculate({ operation, operands }: CalculationRequest): Promise<number> {
  const endpoint = `${API_BASE_URL}/${operation}`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operands }),
    });
  } catch {
    throw new ApiError(NETWORK_ERROR.message, NETWORK_ERROR.code);
  }

  if (!response.ok) {
    const body = await readErrorBody(response);
    throw new ApiError(body?.error ?? UNKNOWN_ERROR.message, body?.code ?? UNKNOWN_ERROR.code);
  }

  const body = (await response.json()) as ResultResponse;
  return body.result;
}

async function readErrorBody(response: Response): Promise<ErrorResponse | null> {
  try {
    return (await response.json()) as ErrorResponse;
  } catch {
    return null;
  }
}
