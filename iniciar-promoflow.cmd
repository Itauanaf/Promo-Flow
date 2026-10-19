@echo off
setlocal
cd /d "%~dp0"
set "PATH=%~dp0.tools\nodejs;%~dp0.tools\pnpm;%PATH%"
set "ENABLE_DEMO_MODE=false"
echo Iniciando o PromoFlow...
echo Quando aparecer Ready, acesse http://localhost:3000
echo.
call "%~dp0.tools\pnpm\pnpm.cmd" dev
echo.
echo O servidor foi encerrado ou ocorreu um erro.
pause
