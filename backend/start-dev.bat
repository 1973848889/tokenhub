@echo off
set GOPROXY=https://goproxy.cn,direct
set PATH=%PATH%;C:\Program Files\Go\bin
cd /d C:\Users\chenjiawei\Desktop\Tokenhub\backend
echo Starting AI Governance Platform Backend on :8080
echo.
go run ./cmd/gateway
pause
