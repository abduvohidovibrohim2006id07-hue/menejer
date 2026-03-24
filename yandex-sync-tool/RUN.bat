@echo off
title Yandex Market & Uzum Sync Tool
echo [1/3] Kutubxonalarni tekshirish...
pip install -r requirements.txt
echo.
echo [2/3] Yashirin Chrome jarayonlarini tozalash...
taskkill /F /IM chrome.exe /T >nul 2>&1
taskkill /F /IM chromedriver.exe /T >nul 2>&1
echo Barcha Chrome oynalari yopildi.
echo.
echo [3/3] Skaner va Sinxronlash boshlanmoqda...
python sync_scraper.py
echo.
echo Bajarildi! Istalgan tugmani bosing...
pause
