@echo off
setlocal
if exist "%~dp0.node\node-v22.11.0-win-x64\node.exe" (
    "%~dp0.node\node-v22.11.0-win-x64\node.exe" %*
) else if exist "%LOCALAPPDATA%\Programs\nodejs\node-v22.11.0-win-x64\node.exe" (
    "%LOCALAPPDATA%\Programs\nodejs\node-v22.11.0-win-x64\node.exe" %*
) else if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
    "%LOCALAPPDATA%\Programs\nodejs\node.exe" %*
) else (
    node.exe %*
)

