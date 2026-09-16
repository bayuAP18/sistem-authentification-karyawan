@echo off
echo ============================================
echo   WebAuth - Setup MySQL Database
echo ============================================
echo.

REM Coba cari mysql di PATH dulu
where mysql >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] mysql ditemukan di PATH
    goto :create_db
)

REM Cari di lokasi umum
set MYSQL_BIN=
if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" set MYSQL_BIN=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe
if exist "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" set MYSQL_BIN=C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe
if exist "C:\Program Files\MySQL\MySQL Server 9.0\bin\mysql.exe" set MYSQL_BIN=C:\Program Files\MySQL\MySQL Server 9.0\bin\mysql.exe
if exist "C:\xampp\mysql\bin\mysql.exe"                          set MYSQL_BIN=C:\xampp\mysql\bin\mysql.exe
if exist "C:\laragon\bin\mysql\mysql-8.0\bin\mysql.exe"          set MYSQL_BIN=C:\laragon\bin\mysql\mysql-8.0\bin\mysql.exe
if exist "C:\laragon\bin\mysql\mysql-8.4\bin\mysql.exe"          set MYSQL_BIN=C:\laragon\bin\mysql\mysql-8.4\bin\mysql.exe

if "%MYSQL_BIN%"=="" (
    echo [ERROR] mysql.exe tidak ditemukan!
    echo Cari di mana mysql.exe kamu ada, lalu jalankan perintah ini manual:
    echo   mysql -u root -e "CREATE DATABASE IF NOT EXISTS webauth CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    echo.
    pause
    exit /b 1
)

echo [OK] mysql ditemukan: %MYSQL_BIN%

:create_db
echo.
echo Membuat database webauth...
echo (jika MySQL kamu pakai password, masukkan saat diminta)
echo.

if "%MYSQL_BIN%"=="" (
    mysql -u root -e "CREATE DATABASE IF NOT EXISTS webauth CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
) else (
    "%MYSQL_BIN%" -u root -e "CREATE DATABASE IF NOT EXISTS webauth CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
)

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [OK] Database webauth siap!
    echo.
    echo ===========================================
    echo  Sekarang jalankan server dengan:
    echo    npm start
    echo  atau:
    echo    node server.js
    echo ===========================================
) else (
    echo.
    echo [ERROR] Gagal membuat database.
    echo Pastikan MySQL service sudah berjalan dan password root benar.
    echo.
    echo Jika MySQL kamu pakai password, edit file server.js baris ini:
    echo   const sequelize = new Sequelize('webauth', 'root', '', {
    echo Ganti '' dengan password MySQL kamu.
)

echo.
pause
