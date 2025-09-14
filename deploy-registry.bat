@echo off
REM ===============================================
REM Deploy CoWorkSpace su Docker Hub
REM ===============================================

echo ========================================
echo    Deploy Docker Hub - CoWorkSpace
echo ========================================

set /p username="Inserisci il tuo username Docker Hub: "
if "%username%"=="" (
    echo Errore: Username richiesto
    pause
    exit /b 1
)

echo [INFO] Building immagini per Docker Hub...

REM Build backend
echo [INFO] Building backend image...
docker build -t %username%/coworkspace-backend:latest -f backend/Dockerfile .
if errorlevel 1 (
    echo [ERROR] Build backend fallito!
    pause
    exit /b 1
)

REM Build frontend
echo [INFO] Building frontend image...
docker build -t %username%/coworkspace-frontend:latest -f frontend/Dockerfile .
if errorlevel 1 (
    echo [ERROR] Build frontend fallito!
    pause
    exit /b 1
)

echo [OK] Build completato!

REM Login Docker Hub
echo [INFO] Login Docker Hub...
docker login
if errorlevel 1 (
    echo [ERROR] Login fallito!
    pause
    exit /b 1
)

REM Push immagini
echo [INFO] Push backend su Docker Hub...
docker push %username%/coworkspace-backend:latest
if errorlevel 1 (
    echo [ERROR] Push backend fallito!
    pause
    exit /b 1
)

echo [INFO] Push frontend su Docker Hub...
docker push %username%/coworkspace-frontend:latest
if errorlevel 1 (
    echo [ERROR] Push frontend fallito!
    pause
    exit /b 1
)

echo [OK] Push completato!

REM Crea docker-compose per registry
echo [INFO] Creando docker-compose.registry.yml...
(
echo version: '3.8'
echo services:
echo   backend:
echo     image: %username%/coworkspace-backend:latest
echo     # resto configurazione uguale...
echo   frontend:
echo     image: %username%/coworkspace-frontend:latest
echo     # resto configurazione uguale...
) > docker-compose.registry.yml

echo [OK] File docker-compose.registry.yml creato!

echo.
echo ========================================
echo          DEPLOY COMPLETATO
echo ========================================
echo.
echo Le tue immagini sono ora su Docker Hub:
echo   - %username%/coworkspace-backend:latest
echo   - %username%/coworkspace-frontend:latest
echo.
echo Per deployare su server remoto:
echo   1. Copia docker-compose.registry.yml sul server
echo   2. Esegui: docker-compose -f docker-compose.registry.yml up -d
echo.
echo URL Docker Hub:
echo   https://hub.docker.com/r/%username%/coworkspace-backend
echo   https://hub.docker.com/r/%username%/coworkspace-frontend
echo.

pause