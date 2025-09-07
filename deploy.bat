@echo off
REM ===============================================
REM CoWorkSpace - Deploy Fix per Windows
REM ===============================================

echo.
echo ========================================
echo    CoWorkSpace Deploy Fix - Windows
echo ========================================

REM 1. Crea file .env se non esiste
if not exist ".env" (
    if exist ".env.windows" (
        echo [FIX] Creando .env da .env.windows...
        copy .env.windows .env >nul
        echo [OK] File .env creato
    ) else (
        echo [ERROR] File .env.windows non trovato!
        echo [INFO] Creando .env di default...
        (
            echo NODE_ENV=production
            echo DB_HOST=db
            echo DB_PORT=5432
            echo DB_NAME=coworkspace
            echo DB_USER=coworkspace_user
            echo DB_PASSWORD=postgress
            echo JWT_SECRET=your_super_secret_jwt_key_change_in_production
            echo FRONTEND_URL=http://localhost
            echo CORS_ORIGIN=http://localhost,http://localhost:80
        ) > .env
        echo [OK] File .env di default creato
    )
) else (
    echo [OK] File .env trovato
)

REM 2. Verifica struttura file
echo [INFO] Verificando struttura file...

if not exist "backend\Dockerfile" (
    echo [ERROR] backend\Dockerfile non trovato!
    echo [TIP] Assicurati che la struttura sia corretta
    pause
    exit /b 1
)

if not exist "frontend\Dockerfile" (
    echo [ERROR] frontend\Dockerfile non trovato!
    echo [TIP] Assicurati che la struttura sia corretta
    pause
    exit /b 1
)

echo [OK] Dockerfile trovati

REM 3. Verifica file backend
if exist "backend\api\package.json" (
    echo [OK] Backend package.json trovato in backend\api\
) else if exist "backend\package.json" (
    echo [WARNING] Backend package.json in backend\ invece di backend\api\
    echo [INFO] Potrebbe essere necessario aggiustare i path
) else (
    echo [ERROR] Backend package.json non trovato!
    echo [TIP] Controlla che i file backend siano nella posizione corretta
)

REM 4. Verifica file frontend
if exist "frontend\package.json" (
    echo [OK] Frontend package.json trovato
) else (
    echo [ERROR] Frontend package.json non trovato!
    echo [TIP] Controlla che i file frontend siano nella posizione corretta
)

REM 5. Stop container esistenti con cleanup
echo [INFO] Fermando e pulendo container esistenti...
docker-compose down -v >nul 2>&1
docker system prune -f >nul 2>&1

REM 6. Build con debug
echo [INFO] Building immagini con debug...
echo [DEBUG] Building backend...
docker-compose build backend
if errorlevel 1 (
    echo [ERROR] Build backend fallito!
    echo [DEBUG] Controllando contenuto directory backend...
    dir backend
    if exist "backend\api\" (
        echo [DEBUG] Contenuto backend\api\:
        dir backend\api
    )
    pause
    exit /b 1
)

echo [DEBUG] Building frontend...
docker-compose build frontend
if errorlevel 1 (
    echo [ERROR] Build frontend fallito!
    echo [DEBUG] Controllando contenuto directory frontend...
    dir frontend
    pause
    exit /b 1
)

REM 7. Avvia servizi step by step
echo [INFO] Avviando database e redis...
docker-compose up -d db redis
timeout /t 10 /nobreak >nul

echo [INFO] Avviando backend...
docker-compose up -d backend
timeout /t 15 /nobreak >nul

echo [INFO] Controllando status backend...
docker-compose ps backend

echo [INFO] Logs backend (ultimi 20 righe):
docker-compose logs --tail=20 backend

echo.
echo [INFO] Se il backend è in "Restarting", c'è un errore nel codice.
echo [INFO] Premere un tasto per continuare con frontend e nginx...
pause

echo [INFO] Avviando frontend e nginx...
docker-compose up -d frontend nginx

REM 8. Test finale
echo.
echo ========================================
echo           TEST FINALE
echo ========================================

timeout /t 10 /nobreak >nul

echo [TEST] Stato container:
docker-compose ps

echo.
echo [TEST] Test servizi:

REM Test backend con retry
echo [TEST] Backend API (con retry)...
set backend_ok=0
for /l %%i in (1,1,3) do (
    curl -f -s http://localhost:3000/api/health >nul 2>&1
    if not errorlevel 1 (
        echo [OK] Backend risponde al tentativo %%i
        set backend_ok=1
        goto backend_done
    ) else (
        echo [RETRY] Tentativo %%i fallito, riprovando...
        timeout /t 5 /nobreak >nul
    )
)
:backend_done
if %backend_ok%==0 (
    echo [FAILED] Backend non risponde dopo 3 tentativi
    echo [DEBUG] Logs backend completi:
    docker-compose logs backend
)

REM Test altri servizi
curl -f -s http://localhost:3001/ >nul 2>&1
if errorlevel 1 (
    echo [FAILED] Frontend non risponde
) else (
    echo [OK] Frontend OK
)

curl -f -s http://localhost/ >nul 2>&1
if errorlevel 1 (
    echo [FAILED] Nginx non risponde
) else (
    echo [OK] Nginx OK
)

echo.
echo ========================================
echo         DIAGNOSTICA AVANZATA
echo ========================================

echo [INFO] Verifica network:
docker network ls | findstr coworkspace

echo [INFO] Verifica volumi:
docker volume ls | findstr web

echo [INFO] Container in errore:
docker-compose ps --filter "status=exited"

echo.
echo [INFO] Se ci sono ancora problemi, esegui:
echo   docker-compose logs backend
echo   docker-compose logs frontend
echo.

pause