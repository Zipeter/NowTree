@echo off
setlocal

REM === NowTree dev launcher ===
REM Sets non-standard MSVC / Windows SDK / debug-CRT paths, then runs: npm run tauri dev
REM Place this file in the scripts/ folder and double-click it.

set "MSVC_BIN=H:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\VC\Tools\MSVC\14.51.36231\bin\Hostx64\x64"
set "CARGO_BIN=C:\Users\zJJ\.cargo\bin"
set "DEBUG_CRT=H:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\VC\Redist\MSVC\14.51.36231\debug_nonredist\x64\Microsoft.VC145.DebugCRT"

set "SDK_INC=D:\Windows Kits\10\Include\10.0.28000.0"
set "SDK_LIB=D:\Windows Kits\10\Lib\10.0.28000.0"
set "MSVC_INC=H:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\VC\Tools\MSVC\14.51.36231\include"
set "MSVC_LIB=H:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\VC\Tools\MSVC\14.51.36231\lib\x64"

set "PATH=%MSVC_BIN%;%CARGO_BIN%;%DEBUG_CRT%;%PATH%"
set "INCLUDE=%SDK_INC%\um;%SDK_INC%\shared;%SDK_INC%\ucrt;%MSVC_INC%"
set "LIB=%SDK_LIB%\um\x64;%SDK_LIB%\ucrt\x64;%MSVC_LIB%"

cd /d "%~dp0.."

echo [NowTree] environment ready, starting dev server + app...
echo [NowTree] close this window or press Ctrl+C to stop
call npm run tauri dev

endlocal
