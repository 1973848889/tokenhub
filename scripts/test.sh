#!/bin/bash
set -e

echo "============================================"
echo "     TokenHub Test Suite"
echo "============================================"
echo ""

echo "[1/4] Go Backend Tests"
echo "-----------------------"
cd backend
go test ./... -v -count=1
echo "[PASS] Go tests completed"
cd ..

echo ""
echo "[2/4] React Unit Tests"
echo "-----------------------"
cd web
npx vitest run
echo "[PASS] React unit tests completed"

echo ""
echo "[3/4] TypeScript Type Check"
echo "-----------------------"
npx tsc --noEmit
echo "[PASS] TypeScript check completed"

echo ""
echo "[4/4] E2E Tests (Playwright)"
echo "-----------------------"
npx playwright test
echo "[PASS] E2E tests completed"
cd ..

echo ""
echo "============================================"
echo "     All Tests Passed"
echo "============================================"
