// Package calculator implements the arithmetic engine for the calculator service.
package calculator

import (
	"errors"
	"math"
)

// Errors returned when an operation cannot produce a valid real-number result.
// The API layer maps these to HTTP status codes; the engine itself stays
// transport-agnostic.
var (
	ErrDivideByZero    = errors.New("division by zero is undefined")
	ErrNegativeSqrt    = errors.New("square root of a negative number is not a real number")
	ErrUndefinedResult = errors.New("the operation has no defined real result")
	ErrOverflow        = errors.New("the result is too large to represent")
)

// Add returns a + b.
func Add(a, b float64) (float64, error) {
	return guard(a + b)
}

// Subtract returns a - b.
func Subtract(a, b float64) (float64, error) {
	return guard(a - b)
}

// Multiply returns a * b.
func Multiply(a, b float64) (float64, error) {
	return guard(a * b)
}

// Divide returns a / b and rejects division by zero.
func Divide(a, b float64) (float64, error) {
	if b == 0 {
		return 0, ErrDivideByZero
	}
	return guard(a / b)
}

// Power returns base raised to exponent. Negative exponents are valid for a
// non-zero base (2^-2 = 0.25); zero raised to a negative exponent is undefined,
// as is a fractional power of a negative base.
func Power(base, exponent float64) (float64, error) {
	if base == 0 && exponent < 0 {
		return 0, ErrDivideByZero
	}
	return guard(math.Pow(base, exponent))
}

// Sqrt returns the square root of a non-negative value.
func Sqrt(value float64) (float64, error) {
	if value < 0 {
		return 0, ErrNegativeSqrt
	}
	return guard(math.Sqrt(value))
}

// Percentage returns percent percent of value, i.e. value * percent / 100.
// Example: Percentage(200, 10) == 20 ("10% of 200").
func Percentage(value, percent float64) (float64, error) {
	return guard(value * percent / 100)
}

// guard converts IEEE-754 exceptional results (NaN, ±Inf) into engine errors so
// callers never receive a value that cannot be serialized as a real number.
func guard(result float64) (float64, error) {
	switch {
	case math.IsNaN(result):
		return 0, ErrUndefinedResult
	case math.IsInf(result, 0):
		return 0, ErrOverflow
	}
	return result, nil
}
