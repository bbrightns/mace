@echo off
setlocal
set "NODE_DIR="

if exist "%~dp0.node\node-v22.11.0-win-x64\node.exe" (
    set "NODE_DIR=%~dp0.node\node-v22.11.0-win-x64"
) else if exist "%LOCALAPPDATA%\Programs\nodejs\node-v22.11.0-win-x64\node.exe" (
    set "NODE_DIR=%LOCALAPPDATA%\Programs\nodejs\node-v22.11.0-win-x64"
) else if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
    set "NODE_DIR=%LOCALAPPDATA%\Programs\nodejs"
) else (
    for /f "delims=" %%i in ('where node.exe 2^>nul') do (
        set "NODE_DIR=%%~dpi"
        set "NODE_DIR=%NODE_DIR:~0,-1%"
        goto :run_npm
    )
)

:run_npm
if "%NODE_DIR%"=="" (
    echo Error: node.exe not found in PATH or AppData.
    exit /b 1
)

set "PATH=%NODE_DIR%;%PATH%"
if exist "%NODE_DIR%\node_modules\npm\bin\npm-cli.js" (
    "%NODE_DIR%\node.exe" "%NODE_DIR%\node_modules\npm\bin\npm-cli.js" %*
) else (
    npm.cmd %*
)

