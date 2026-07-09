import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import App from "../App";
import { ApiError, calculate } from "../api/calculator";
import { toast } from "sonner";

vi.mock("../api/calculator", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/calculator")>();
  return { ...actual, calculate: vi.fn() };
});

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
  Toaster: () => null,
}));

const calculateMock = calculate as Mock;

function renderApp() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  );
}

function display() {
  return screen.getByTestId("display-value");
}

async function clickKeys(labels: string[]) {
  const user = userEvent.setup();
  for (const label of labels) {
    await user.click(screen.getByRole("button", { name: label }));
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  calculateMock.mockImplementation(async ({ operation, operands }) => {
    if (operation === "divide" && operands[1] === 0) {
      throw new ApiError("division by zero is undefined", "DIVIDE_BY_ZERO");
    }
    if (operation === "multiply") return operands[0] * operands[1];
    if (operation === "add") return operands[0] + operands[1];
    throw new ApiError("unexpected", "UNKNOWN");
  });
});

describe("<App />", () => {
  it("renders the initial zeroed display", () => {
    renderApp();
    expect(display()).toHaveTextContent("0");
  });

  it("evaluates an expression entered with the on-screen keys", async () => {
    renderApp();
    await clickKeys(["6", "Multiply", "7", "Equals"]);
    await waitFor(() => expect(display()).toHaveTextContent("42"));
    expect(screen.getByTestId("display-expression")).toHaveTextContent("6 × 7 =");
  });

  it("shows an error toast and an error display when the API rejects", async () => {
    renderApp();
    await clickKeys(["5", "Divide", "0", "Equals"]);
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("division by zero is undefined"),
    );
    expect(display()).toHaveTextContent("Error");
  });

  it("accepts input from the physical keyboard", async () => {
    renderApp();
    const user = userEvent.setup();
    await user.keyboard("5+3{Enter}");
    await waitFor(() => expect(display()).toHaveTextContent("8"));
  });

  it("only records one decimal point per number", async () => {
    renderApp();
    await clickKeys(["1", "Decimal point", "Decimal point", "5"]);
    expect(display()).toHaveTextContent("1.5");
  });

  it("recovers from an error state on the next entry", async () => {
    renderApp();
    await clickKeys(["5", "Divide", "0", "Equals"]);
    await waitFor(() => expect(display()).toHaveTextContent("Error"));
    await clickKeys(["9"]);
    expect(within(display()).queryByText("Error")).toBeNull();
    expect(display()).toHaveTextContent("9");
  });
});
