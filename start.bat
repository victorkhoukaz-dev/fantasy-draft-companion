@echo off
title Fantasy Football Draft Companion
echo ===================================================
echo 🏈 Starting Fantasy Football Draft Companion...
echo ===================================================
echo.
echo Starting PDF Auto-Watcher in background...
start /b python ingest.py --watch

echo.
echo ===================================================
echo 📱 Phone Access URL (Open on your phone browser):
python -c "import socket; ip=socket.gethostbyname(socket.gethostname()); print(f'  --> http://{ip}:8080')"
echo ===================================================
echo.

echo Starting Web Server at http://localhost:8080...
echo (Opening browser in 2 seconds...)
timeout /t 2 /nobreak >nul
start http://localhost:8080
python -m http.server 8080
