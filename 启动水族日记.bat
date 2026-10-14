@echo off
chcp 65001 >nul
REM # Windows 静态启动器，需预先安装 Python 3。
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel% equ 0 (
  echo 服务启动后，请在浏览器打开 http://127.0.0.1:4173/
  py -3 -m http.server 4173 --bind 127.0.0.1 --directory dist
) else (
  echo 服务启动后，请在浏览器打开 http://127.0.0.1:4173/
  python -m http.server 4173 --bind 127.0.0.1 --directory dist
)
REM # 只服务静态网页；饲养数据由浏览器保存。
pause
