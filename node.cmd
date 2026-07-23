@echo off
setlocal
set "LOCAL_NODE=%~dp0.node\node-v22.11.0-win-x64\node.exe"
if exist "%LOCAL_NODE%" (
    "%LOCAL_NODE%" %*
) else (
    node.exe %*
)
