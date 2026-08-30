@echo off
title Update & Deploy Fantasy Football Companion
echo =======================================================
echo 🏈 Fantasy Football Draft Companion - Update & Deploy
echo =======================================================
echo.

echo 1. Ingesting Redraft Articles & Rankings...
python ingest.py -m redraft

echo.
echo 2. Ingesting Underdog Best Ball Rankings & ADPs...
python ingest.py -m underdog

echo.
echo 3. Pushing updates to GitHub Pages (Online App)...
git add .
git commit -m "Auto-update rankings, articles, and ADPs"
git push origin master

echo.
echo =======================================================
echo ✅ Done! Your deployed online app is now 100%% up to date!
echo    URL: https://victorkhoukaz-dev.github.io/fantasy-draft-companion/
echo =======================================================
pause
