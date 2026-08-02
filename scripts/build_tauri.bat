@echo off
REM NowTree Tauri 侧编译环境脚本（非标准安装路径专用）
REM   - MSVC 工具链在 H: 盘（VS 18 BuildTools）
REM   - Windows SDK 10.0.28000.0 在 D: 盘（非默认 C: 位置，需手动指路）
REM   - cargo 在 C:\Users\zJJ\.cargo\bin
REM 用法：直接双击，或在 Git Bash 里 `cmd //c build_tauri.bat`
REM 仅编译 Rust 侧（验证可链接 SQLite），GUI 窗口请用 `npm run tauri dev` 在本机跑。

call "H:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
echo [build] vcvars done, errorlevel=%ERRORLEVEL%
set PATH=%PATH%;C:\Users\zJJ\.cargo\bin
echo [build] cargo on PATH? 
where cargo

REM 手动追加 D: 上的 Windows SDK 头文件与库（vcvars 默认只认注册表/标准路径）
set INCLUDE=%INCLUDE%;D:\Windows Kits\10\Include\10.0.28000.0\um;D:\Windows Kits\10\Include\10.0.28000.0\shared;D:\Windows Kits\10\Include\10.0.28000.0\ucrt
set LIB=%LIB%;D:\Windows Kits\10\Lib\10.0.28000.0\um\x64;D:\Windows Kits\10\Lib\10.0.28000.0\ucrt\x64

cd /d H:\Users\zJJ\WorkBuddy\NowTree开发\src-tauri
echo [build] entering src-tauri, now cargo build
cargo build 2>&1
