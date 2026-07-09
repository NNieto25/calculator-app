// Package api exposes the calculator engine over a small JSON REST interface.
// Each arithmetic operation has its own endpoint.
package api

import (
	"encoding/json"
	"errors"
	"net/http"

	"calculator-app/internal/calculator"
)

type calcRequest struct {
	Operands []float64 `json:"operands"`
}

type resultResponse struct {
	Result float64 `json:"result"`
}

type errorResponse struct {
	Error string `json:"error"`
	Code  string `json:"code"`
}

// NewRouter wires every operation endpoint and returns the fully configured
// handler, with middleware applied.
func NewRouter() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/v1/health", handleHealth)

	mux.HandleFunc("POST /api/v1/add", binaryHandler(calculator.Add))
	mux.HandleFunc("POST /api/v1/subtract", binaryHandler(calculator.Subtract))
	mux.HandleFunc("POST /api/v1/multiply", binaryHandler(calculator.Multiply))
	mux.HandleFunc("POST /api/v1/divide", binaryHandler(calculator.Divide))
	mux.HandleFunc("POST /api/v1/power", binaryHandler(calculator.Power))
	mux.HandleFunc("POST /api/v1/percentage", binaryHandler(calculator.Percentage))
	mux.HandleFunc("POST /api/v1/sqrt", unaryHandler(calculator.Sqrt))

	return withMiddleware(mux)
}

func handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// binaryHandler adapts a two-operand engine function into an HTTP handler.
func binaryHandler(op func(a, b float64) (float64, error)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		operands, ok := decodeOperands(w, r, 2)
		if !ok {
			return
		}
		compute(w, func() (float64, error) { return op(operands[0], operands[1]) })
	}
}

// unaryHandler adapts a single-operand engine function into an HTTP handler.
func unaryHandler(op func(a float64) (float64, error)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		operands, ok := decodeOperands(w, r, 1)
		if !ok {
			return
		}
		compute(w, func() (float64, error) { return op(operands[0]) })
	}
}

// decodeOperands parses the request body and validates the operand count,
// writing a 400 response and returning ok=false on any problem.
func decodeOperands(w http.ResponseWriter, r *http.Request, want int) ([]float64, bool) {
	var req calcRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body must be valid JSON with an \"operands\" array")
		return nil, false
	}
	if len(req.Operands) != want {
		writeError(w, http.StatusBadRequest, "INVALID_OPERANDS", operandCountMessage(want))
		return nil, false
	}
	return req.Operands, true
}

// compute runs the engine function and translates its outcome into a response.
func compute(w http.ResponseWriter, run func() (float64, error)) {
	result, err := run()
	if err != nil {
		writeError(w, statusForError(err), codeForError(err), err.Error())
		return
	}
	writeJSON(w, http.StatusOK, resultResponse{Result: result})
}

// statusForError maps engine errors to HTTP status codes. Mathematically
// invalid but well-formed requests are Unprocessable Entity (422).
func statusForError(err error) int {
	switch {
	case errors.Is(err, calculator.ErrDivideByZero),
		errors.Is(err, calculator.ErrNegativeSqrt),
		errors.Is(err, calculator.ErrUndefinedResult),
		errors.Is(err, calculator.ErrOverflow):
		return http.StatusUnprocessableEntity
	default:
		return http.StatusInternalServerError
	}
}

func codeForError(err error) string {
	switch {
	case errors.Is(err, calculator.ErrDivideByZero):
		return "DIVIDE_BY_ZERO"
	case errors.Is(err, calculator.ErrNegativeSqrt):
		return "NEGATIVE_SQRT"
	case errors.Is(err, calculator.ErrUndefinedResult):
		return "UNDEFINED_RESULT"
	case errors.Is(err, calculator.ErrOverflow):
		return "OVERFLOW"
	default:
		return "INTERNAL_ERROR"
	}
}

func operandCountMessage(want int) string {
	if want == 1 {
		return "this operation requires exactly 1 operand"
	}
	return "this operation requires exactly 2 operands"
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, errorResponse{Error: message, Code: code})
}
