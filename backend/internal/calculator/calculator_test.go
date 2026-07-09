package calculator

import (
	"errors"
	"math"
	"testing"
)

// binaryCase describes a single binary-operation test row.
type binaryCase struct {
	name    string
	a, b    float64
	want    float64
	wantErr error
}

func runBinary(t *testing.T, op func(a, b float64) (float64, error), cases []binaryCase) {
	t.Helper()
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := op(tc.a, tc.b)
			assertResult(t, got, err, tc.want, tc.wantErr)
		})
	}
}

func assertResult(t *testing.T, got float64, err error, want float64, wantErr error) {
	t.Helper()
	if wantErr != nil {
		if !errors.Is(err, wantErr) {
			t.Fatalf("expected error %v, got %v", wantErr, err)
		}
		return
	}
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if math.Abs(got-want) > 1e-9 {
		t.Fatalf("expected %v, got %v", want, got)
	}
}

func TestAdd(t *testing.T) {
	runBinary(t, Add, []binaryCase{
		{"positives", 2, 3, 5, nil},
		{"negative and positive", -4, 10, 6, nil},
		{"with zero", 7, 0, 7, nil},
		{"fractions", 0.1, 0.2, 0.3, nil},
		{"overflow", math.MaxFloat64, math.MaxFloat64, 0, ErrOverflow},
	})
}

func TestSubtract(t *testing.T) {
	runBinary(t, Subtract, []binaryCase{
		{"positives", 9, 4, 5, nil},
		{"negative result", 3, 8, -5, nil},
		{"with zero", 0, 6, -6, nil},
		{"overflow", -math.MaxFloat64, math.MaxFloat64, 0, ErrOverflow},
	})
}

func TestMultiply(t *testing.T) {
	runBinary(t, Multiply, []binaryCase{
		{"positives", 6, 7, 42, nil},
		{"by zero", 123, 0, 0, nil},
		{"two negatives", -3, -4, 12, nil},
		{"fraction", 0.5, 8, 4, nil},
		{"overflow", math.MaxFloat64, 2, 0, ErrOverflow},
	})
}

func TestDivide(t *testing.T) {
	runBinary(t, Divide, []binaryCase{
		{"even", 10, 2, 5, nil},
		{"fractional", 1, 4, 0.25, nil},
		{"negative", -9, 3, -3, nil},
		{"zero numerator", 0, 5, 0, nil},
		{"by zero", 5, 0, 0, ErrDivideByZero},
		{"zero by zero", 0, 0, 0, ErrDivideByZero},
	})
}

func TestPower(t *testing.T) {
	runBinary(t, Power, []binaryCase{
		{"square", 2, 2, 4, nil},
		{"cube", 3, 3, 27, nil},
		{"power of zero exponent", 12, 0, 1, nil},
		{"negative exponent", 2, -2, 0.25, nil},
		{"fractional exponent", 9, 0.5, 3, nil},
		{"negative base integer exponent", -2, 3, -8, nil},
		{"zero to negative exponent", 0, -1, 0, ErrDivideByZero},
		{"negative base fractional exponent", -8, 0.5, 0, ErrUndefinedResult},
		{"overflow", 10, 400, 0, ErrOverflow},
	})
}

func TestSqrt(t *testing.T) {
	cases := []struct {
		name    string
		value   float64
		want    float64
		wantErr error
	}{
		{"perfect square", 16, 4, nil},
		{"zero", 0, 0, nil},
		{"non-perfect", 2, math.Sqrt2, nil},
		{"fraction", 0.25, 0.5, nil},
		{"negative", -4, 0, ErrNegativeSqrt},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := Sqrt(tc.value)
			assertResult(t, got, err, tc.want, tc.wantErr)
		})
	}
}

func TestPercentage(t *testing.T) {
	runBinary(t, Percentage, []binaryCase{
		{"ten percent of two hundred", 200, 10, 20, nil},
		{"one hundred percent", 55, 100, 55, nil},
		{"zero percent", 999, 0, 0, nil},
		{"fractional percent", 50, 12.5, 6.25, nil},
		{"negative value", -80, 25, -20, nil},
	})
}
