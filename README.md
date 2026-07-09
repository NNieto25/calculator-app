# Calculator App

A full-stack basic calculator: a Go REST API for the arithmetic and a React +
TypeScript single-page app in a soft **claymorphism** style. The two run
together behind Docker Compose.

<p align="center">
  <em>Indigo &amp; blue claymorphism UI · Go standard-library API · React Query · fully containerised</em>
</p>

## Contents
- [Architecture](#architecture)
- [Quick start (Docker Compose)](#quick-start-docker-compose)
- [Running each part on its own](#running-each-part-on-its-own)
- [Supported operations](#supported-operations)
- [REST API reference](#rest-api-reference)
- [Testing](#testing)
- [Product & design decisions](#product--design-decisions)

## Architecture

```
┌───────────────────────┐        /api/v1/*         ┌────────────────────────┐
│  Frontend (nginx)      │  ───────────────────▶    │  Backend (Go)          │
│  React + TS SPA        │      JSON over HTTP       │  net/http REST API     │
│  React Query, sonner   │  ◀───────────────────    │  pure calculator engine│
└───────────────────────┘                           └────────────────────────┘
      host :3000                                            host :8080
```

- **backend/** — Go service. `internal/calculator` is a pure arithmetic engine
  with no transport concerns; `internal/api` is a thin HTTP layer that maps the
  engine's typed errors onto HTTP status codes. Standard library only.
- **frontend/** — Vite + React + TypeScript SPA. All network access is isolated
  in `src/api/calculator.ts` and only ever invoked through React Query hooks. A
  pure reducer (`src/lib/calculatorMachine.ts`) models the calculator behaviour.
- In production the SPA is served by nginx, which also reverse-proxies `/api` to
  the backend so the browser always talks to a single origin.

## Quick start (Docker Compose)

**Prerequisite:** Docker with the Compose plugin.

```bash
docker compose up --build
```

Then open **http://localhost:3000**. The API is also exposed directly on
**http://localhost:8080** for inspection.

Stop everything with `docker compose down`.

## Running each part on its own

Useful during development. The Vite dev server proxies `/api` to
`localhost:8080`, so run the backend first.

### Backend

```bash
cd backend
go run ./cmd/server        # listens on :8080 (override with PORT)
```

### Frontend

```bash
cd frontend
npm install
npm run dev                # Vite dev server on http://localhost:5173
```

## Supported operations

| Operation      | Endpoint                 | Operands       | Notes                              |
| -------------- | ------------------------ | -------------- | ---------------------------------- |
| Addition       | `POST /api/v1/add`       | `[a, b]`       |                                    |
| Subtraction    | `POST /api/v1/subtract`  | `[a, b]`       |                                    |
| Multiplication | `POST /api/v1/multiply`  | `[a, b]`       |                                    |
| Division       | `POST /api/v1/divide`    | `[a, b]`       | rejects division by zero           |
| Exponentiation | `POST /api/v1/power`     | `[base, exp]`  | negative exponents allowed         |
| Square root    | `POST /api/v1/sqrt`      | `[a]`          | rejects negative input             |
| Percentage     | `POST /api/v1/percentage`| `[a, b]`       | returns `a * b / 100` (b% of a)    |

## REST API reference

Every endpoint accepts `POST` with a JSON body `{"operands": [...]}` and returns
`{"result": <number>}` on success. All requests and responses are JSON.

### Successful requests

```bash
# Addition
curl -X POST localhost:8080/api/v1/add -d '{"operands":[2,3]}'
# {"result":5}

# Division
curl -X POST localhost:8080/api/v1/divide -d '{"operands":[10,4]}'
# {"result":2.5}

# Exponentiation (negative exponents are valid)
curl -X POST localhost:8080/api/v1/power -d '{"operands":[2,-2]}'
# {"result":0.25}

# Square root (single operand)
curl -X POST localhost:8080/api/v1/sqrt -d '{"operands":[144]}'
# {"result":12}

# Percentage: 10% of 200
curl -X POST localhost:8080/api/v1/percentage -d '{"operands":[200,10]}'
# {"result":20}
```

### Error responses

Errors return a JSON body `{"error": "...", "code": "..."}` with a meaningful
status code.

```bash
# 422 Unprocessable Entity — mathematically invalid
curl -i -X POST localhost:8080/api/v1/divide -d '{"operands":[5,0]}'
# HTTP/1.1 422 Unprocessable Entity
# {"error":"division by zero is undefined","code":"DIVIDE_BY_ZERO"}

curl -i -X POST localhost:8080/api/v1/sqrt -d '{"operands":[-9]}'
# HTTP/1.1 422 Unprocessable Entity
# {"error":"square root of a negative number is not a real number","code":"NEGATIVE_SQRT"}

# 400 Bad Request — malformed input
curl -i -X POST localhost:8080/api/v1/add -d '{"operands":[1]}'
# HTTP/1.1 400 Bad Request
# {"error":"this operation requires exactly 2 operands","code":"INVALID_OPERANDS"}

# 405 Method Not Allowed
curl -i localhost:8080/api/v1/add
# HTTP/1.1 405 Method Not Allowed
```

| Status | When                                                          | Codes                                                        |
| ------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `200`  | success                                                      | —                                                            |
| `400`  | malformed JSON, unknown fields, wrong operand count          | `INVALID_REQUEST`, `INVALID_OPERANDS`                        |
| `422`  | well-formed but mathematically invalid                       | `DIVIDE_BY_ZERO`, `NEGATIVE_SQRT`, `UNDEFINED_RESULT`, `OVERFLOW` |
| `405`  | wrong HTTP method                                            | —                                                            |

There is also a health probe: `GET /api/v1/health` → `{"status":"ok"}`.

## Testing

```bash
# Backend — engine + HTTP layer, with coverage
cd backend && go test ./... -cover

# Frontend — reducer, API layer, hooks, and app integration
cd frontend && npm test
cd frontend && npm run test:coverage   # with a coverage report
```

A detailed breakdown of scenarios and the coverage achieved lives in
[TESTING-REPORT.md](./TESTING-REPORT.md).

## Product & design decisions

- **One endpoint per operation.** A RESTful endpoint per operation reads
  clearly and documents itself. Handler boilerplate is avoided by adapting each
  pure engine function through a shared `binaryHandler` / `unaryHandler` helper,
  so adding an operation is a single line in the router.
- **Decoupled layers.** The arithmetic lives in a pure `calculator` package that
  knows nothing about HTTP. It returns sentinel errors; the API layer alone
  decides the status code. This keeps the maths trivially unit-testable and the
  transport layer thin.
- **Errors are first-class.** Mathematically invalid but well-formed requests
  return `422` (not `400` or `500`) with a machine-readable `code` and a
  human-readable `error`. Any non-finite floating-point result (overflow, `NaN`)
  is converted into an explicit error rather than leaking `Infinity`.
- **Negative exponents are supported**, since `2^-2` is well defined; only
  genuinely undefined cases (`0` to a negative power, a fractional power of a
  negative base) are rejected.
- **Contextual percentage.** Like a physical calculator, `200 + 10 %` computes
  10% of 200 (= 20) so that `=` yields 220; a standalone `%` divides by 100.
- **API isolation on the frontend.** Every `fetch` lives in one file and is only
  reachable through React Query mutations, which provide the loading state that
  dims the display and the error channel that raises a toast.
- **Pure UI state machine.** The calculator's behaviour is a framework-free
  reducer; asynchronous computation is expressed as a "request" the host hook
  fulfils. This lets the entire interaction model be tested synchronously.
- **Claymorphism, deliberately.** Soft inflated keys (layered inset highlight +
  drop shadow), a recessed display, an indigo-and-blue palette and rounded
  Fredoka type give the tactile feel of a physical calculator. Fonts are
  self-hosted, so the app has no external runtime dependencies and works fully
  offline.
- **Accessible and responsive.** Every key has an `aria-label`, focus is
  visible, motion respects `prefers-reduced-motion`, the layout scales down to
  small phones, and the calculator is fully operable from the physical keyboard.
```
