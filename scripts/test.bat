@echo off
echo ============================================
echo      企业AI治理智能平台 Test Suite
echo ============================================
echo.

echo [1/4] Go Backend Tests
echo -----------------------
cd backend
go test ./... -v -count=1 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [FAIL] Go tests failed
) else (
    echo [PASS] Go tests passed
)
cd ..

echo.
echo [2/4] React Unit Tests
echo -----------------------
cd web
npx vitest run 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [FAIL] React unit tests failed
) else (
    echo [PASS] React unit tests passed
)

echo.
echo [3/4] TypeScript Type Check
echo -----------------------
npx tsc --noEmit 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [FAIL] TypeScript check failed
) else (
    echo [PASS] TypeScript check passed
)

echo.
echo [4/4] E2E Tests (Playwright)
echo -----------------------
npx playwright test 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [FAIL] E2E tests failed
) else (
    echo [PASS] E2E tests passed
)
cd ..

echo.
echo ============================================
echo      Test Suite Complete
echo ============================================
