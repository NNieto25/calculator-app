# Testing Report

This report summarises the automated tests for both the Go backend and the
React/TypeScript frontend, and the coverage achieved.

## How to reproduce

```bash
# Backend
cd backend && go test ./... -cover

# Frontend
cd frontend && npm run test:coverage
```

## Coverage summary

| Component | Suite                         | Result            | Statement coverage |
| --------- | ----------------------------- | ----------------- | ------------------ |
| Backend   | `internal/calculator` (engine)| ✅ pass           | **100.0%**         |
| Backend   | `internal/api` (HTTP layer)   | ✅ pass           | **94.7%**          |
| Frontend  | 40 tests / 4 files            | ✅ pass           | **95.9%** overall  |

Frontend per-area coverage (statements): `App.tsx` 100%, `api/calculator.ts`
100%, `components` 96.3%, `hooks` 94.0%, `lib/calculatorMachine.ts` 95.7%.

The only intentionally uncovered code is `cmd/server/main.go` (process
bootstrap) and a handful of defensive branches (e.g. panic recovery, an
unreachable `null` request guard).

---

## Backend

### `internal/calculator` — pure arithmetic engine (100%)

Table-driven tests exercise every operation across normal, boundary and
error-producing inputs.

| Operation   | Scenarios covered                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| Add         | positives, mixed signs, with zero, fractions, **overflow → error**                                            |
| Subtract    | positives, negative result, with zero, **overflow → error**                                                   |
| Multiply    | positives, by zero, two negatives, fractions, **overflow → error**                                            |
| Divide      | exact, fractional, negative, zero numerator, **÷0 → error**, **0÷0 → error**                                  |
| Power       | square, cube, exponent 0, **negative exponent (valid)**, fractional exponent, negative base, **0^-1 → error**, **(-8)^0.5 → error**, **overflow → error** |
| Sqrt        | perfect square, zero, irrational, fraction, **negative → error**                                              |
| Percentage  | b% of a, 100%, 0%, fractional percent, negative value                                                         |

Cross-cutting: every result is passed through a guard that turns `NaN` and
`±Inf` into typed errors, so a numeric response is always a real, finite number.

### `internal/api` — HTTP layer (94.7%)

`httptest`-based tests drive the router exactly as a client would.

| Group                | Scenarios                                                                                          | Expected status |
| -------------------- | -------------------------------------------------------------------------------------------------- | --------------- |
| Operation success    | add, subtract, multiply, divide, power, power w/ negative exponent, percentage, sqrt               | `200`           |
| Mathematical errors  | divide by zero, sqrt of negative, 0 to a negative power, negative base fractional power, overflow  | `422` + code    |
| Bad requests         | malformed JSON, unknown field, too few / too many operands, sqrt with two operands, empty body      | `400` + code    |
| Method not allowed   | `GET` on a `POST` endpoint                                                                          | `405`           |
| Health probe         | `GET /api/v1/health`                                                                                | `200`           |
| CORS preflight       | `OPTIONS` request returns CORS headers                                                              | `204`           |

Each error case additionally asserts the machine-readable `code` in the body.

---

## Frontend (40 tests)

### `lib/calculatorMachine.test.ts` — pure state machine (24 tests)

The reducer is tested synchronously by resolving each computation request with a
deterministic in-test backend.

- **Number entry:** leading-zero replacement, appending digits, input-length
  cap, single decimal point only, decimal from zero.
- **Editing:** backspace, backspace-to-zero, sign toggle, no-negate on zero,
  clear resets state.
- **Binary operations:** addition, operator chaining (pending op evaluated
  first), operator replacement, exponentiation, continuing from a result,
  equals with no pending operation is a no-op.
- **Unary operations:** square root, contextual percentage inside an operation
  (`200 + 10% → 20 → 220`), standalone percentage (`50% → 0.5`).
- **Error handling:** reject enters an error state and the next entry recovers;
  operators are ignored while errored.
- **Formatting:** floating-point noise removed (`0.1 + 0.2 → "0.3"`), non-finite
  values labelled `Error`, integers preserved.

### `api/calculator.test.ts` — network boundary (4 tests)

With `fetch` mocked: correct URL/body for the operation, `ApiError` carrying the
backend `code`, a generic fallback when the error body is not JSON, and a
`NETWORK_ERROR` when `fetch` itself throws.

### `hooks/actionForKey.test.ts` — keyboard mapping (6 tests)

Digits, `.`/`,` → decimal, `+ - * / ^` → operators, `%` and `r`/`R` → unary,
`= Enter Backspace Escape c C` → their actions, and unmapped keys → `null`.

### `test/App.test.tsx` — integration (6 tests)

Rendering the full app with the API boundary mocked and React Query wired:

- initial zeroed display,
- evaluating `6 × 7 = 42` via on-screen keys (and the expression line shows
  `6 × 7 =`),
- an API rejection raises an error toast **and** shows `Error` on the display,
- physical-keyboard input (`5 + 3 Enter → 8`),
- one decimal point per number,
- recovery from an error state on the next key press.
