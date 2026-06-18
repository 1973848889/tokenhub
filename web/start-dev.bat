@echo off
set PATH=%PATH%;C:\Program Files\nodejs;C:\Users\chenjiawei\AppData\Roaming\npm
cd /d C:\Users\chenjiawei\Desktop\Tokenhub\web
echo Starting AI治理平台 Frontend on http://localhost:3000
echo.
npx next dev -p 3000
pause
