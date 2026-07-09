import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, calculate } from "./calculator";

function mockFetch(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response as Response));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("calculate", () => {
  it("posts operands to the operation endpoint and returns the result", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: 42 }),
    } as Response);
    vi.stubGlobal("fetch", fetchMock);

    const result = await calculate({ operation: "multiply", operands: [6, 7] });

    expect(result).toBe(42);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/multiply",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ operands: [6, 7] }),
      }),
    );
  });

  it("throws an ApiError carrying the backend error code", async () => {
    mockFetch({
      ok: false,
      json: async () => ({ error: "division by zero is undefined", code: "DIVIDE_BY_ZERO" }),
    });

    await expect(calculate({ operation: "divide", operands: [1, 0] })).rejects.toMatchObject({
      name: "ApiError",
      code: "DIVIDE_BY_ZERO",
      message: "division by zero is undefined",
    });
  });

  it("falls back to a generic error when the body is not JSON", async () => {
    mockFetch({
      ok: false,
      json: async () => {
        throw new Error("not json");
      },
    });

    await expect(calculate({ operation: "add", operands: [1, 2] })).rejects.toMatchObject({
      code: "UNKNOWN_ERROR",
    });
  });

  it("reports a network error when fetch itself fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    await expect(calculate({ operation: "add", operands: [1, 2] })).rejects.toMatchObject({
      code: "NETWORK_ERROR",
    });
    await expect(calculate({ operation: "add", operands: [1, 2] })).rejects.toBeInstanceOf(ApiError);
  });
});
