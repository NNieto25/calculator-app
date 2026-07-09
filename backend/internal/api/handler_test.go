package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func newTestServer(t *testing.T) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(NewRouter())
	t.Cleanup(srv.Close)
	return srv
}

func post(t *testing.T, srv *httptest.Server, path, body string) *http.Response {
	t.Helper()
	resp, err := http.Post(srv.URL+path, "application/json", strings.NewReader(body))
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	return resp
}

func decodeResult(t *testing.T, resp *http.Response) float64 {
	t.Helper()
	var body resultResponse
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode result: %v", err)
	}
	return body.Result
}

func decodeError(t *testing.T, resp *http.Response) errorResponse {
	t.Helper()
	var body errorResponse
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode error: %v", err)
	}
	return body
}

func TestOperationSuccess(t *testing.T) {
	srv := newTestServer(t)

	cases := []struct {
		name string
		path string
		body string
		want float64
	}{
		{"add", "/api/v1/add", `{"operands":[2,3]}`, 5},
		{"subtract", "/api/v1/subtract", `{"operands":[9,4]}`, 5},
		{"multiply", "/api/v1/multiply", `{"operands":[6,7]}`, 42},
		{"divide", "/api/v1/divide", `{"operands":[10,4]}`, 2.5},
		{"power", "/api/v1/power", `{"operands":[2,10]}`, 1024},
		{"power negative exponent", "/api/v1/power", `{"operands":[2,-2]}`, 0.25},
		{"percentage", "/api/v1/percentage", `{"operands":[200,10]}`, 20},
		{"sqrt", "/api/v1/sqrt", `{"operands":[144]}`, 12},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			resp := post(t, srv, tc.path, tc.body)
			if resp.StatusCode != http.StatusOK {
				t.Fatalf("expected 200, got %d", resp.StatusCode)
			}
			if got := decodeResult(t, resp); got != tc.want {
				t.Fatalf("expected %v, got %v", tc.want, got)
			}
		})
	}
}

func TestMathematicalErrors(t *testing.T) {
	srv := newTestServer(t)

	cases := []struct {
		name string
		path string
		body string
		code string
	}{
		{"divide by zero", "/api/v1/divide", `{"operands":[5,0]}`, "DIVIDE_BY_ZERO"},
		{"sqrt of negative", "/api/v1/sqrt", `{"operands":[-9]}`, "NEGATIVE_SQRT"},
		{"zero to negative power", "/api/v1/power", `{"operands":[0,-1]}`, "DIVIDE_BY_ZERO"},
		{"negative base fractional power", "/api/v1/power", `{"operands":[-8,0.5]}`, "UNDEFINED_RESULT"},
		{"overflow", "/api/v1/power", `{"operands":[10,400]}`, "OVERFLOW"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			resp := post(t, srv, tc.path, tc.body)
			if resp.StatusCode != http.StatusUnprocessableEntity {
				t.Fatalf("expected 422, got %d", resp.StatusCode)
			}
			if got := decodeError(t, resp); got.Code != tc.code {
				t.Fatalf("expected code %q, got %q", tc.code, got.Code)
			}
		})
	}
}

func TestBadRequests(t *testing.T) {
	srv := newTestServer(t)

	cases := []struct {
		name string
		path string
		body string
		code string
	}{
		{"malformed json", "/api/v1/add", `{"operands":`, "INVALID_REQUEST"},
		{"unknown field", "/api/v1/add", `{"operands":[1,2],"extra":true}`, "INVALID_REQUEST"},
		{"too few operands", "/api/v1/add", `{"operands":[1]}`, "INVALID_OPERANDS"},
		{"too many operands", "/api/v1/add", `{"operands":[1,2,3]}`, "INVALID_OPERANDS"},
		{"sqrt with two operands", "/api/v1/sqrt", `{"operands":[1,2]}`, "INVALID_OPERANDS"},
		{"empty body", "/api/v1/add", ``, "INVALID_REQUEST"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			resp := post(t, srv, tc.path, tc.body)
			if resp.StatusCode != http.StatusBadRequest {
				t.Fatalf("expected 400, got %d", resp.StatusCode)
			}
			if got := decodeError(t, resp); got.Code != tc.code {
				t.Fatalf("expected code %q, got %q", tc.code, got.Code)
			}
		})
	}
}

func TestMethodNotAllowed(t *testing.T) {
	srv := newTestServer(t)
	resp, err := http.Get(srv.URL + "/api/v1/add")
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if resp.StatusCode != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405, got %d", resp.StatusCode)
	}
}

func TestHealth(t *testing.T) {
	srv := newTestServer(t)
	resp, err := http.Get(srv.URL + "/api/v1/health")
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
}

func TestCORSPreflight(t *testing.T) {
	srv := newTestServer(t)
	req, _ := http.NewRequest(http.MethodOptions, srv.URL+"/api/v1/add", nil)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if resp.StatusCode != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", resp.StatusCode)
	}
	if resp.Header.Get("Access-Control-Allow-Origin") != "*" {
		t.Fatal("expected CORS header on preflight")
	}
}
