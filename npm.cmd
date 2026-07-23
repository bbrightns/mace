@echo off
setlocal
set "LOCAL_NODE=%~dp0.node\node-v22.11.0-win-x64\node.exe"
set "LOCAL_NPM=%~dp0.node\node-v22.11.0-win-x64\node_modules\npm\bin\npm-cli.js"

if exist "%LOCAL_NODE%" (
    "%LOCAL_NODE%" "%LOCAL_NPM%" %*
) else (
    for /f "delims=" %%i in ('where node.exe') do (
        set "SYSTEM_NODE_DIR=%%~dpi"
        goto :found_system
    )
    echo Error: node.exe not found in PATH.
    exit /b 1

    :found_system
    "%SYSTEM_NODE_DIR%node.exe" "%SYSTEM_NODE_DIR%node_modules\npm\bin\npm-cli.js" %*
)
