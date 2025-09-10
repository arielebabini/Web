@echo off
REM ===============================================
REM Complete Database - Crea Tutte le Tabelle
REM ===============================================

echo ========================================
echo    Complete Database Setup
echo ========================================

echo [INFO] Creando tutte le tabelle mancanti...

REM Crea script SQL completo
(
echo -- Complete CoWorkSpace Database Schema
echo.
echo -- Spaces Table
echo CREATE TABLE IF NOT EXISTS public.spaces ^(
echo     id uuid DEFAULT public.uuid_generate_v4^(^) NOT NULL,
echo     name character varying^(255^) NOT NULL,
echo     description text,
echo     type public.space_type NOT NULL,
echo     city character varying^(100^) NOT NULL,
echo     address text NOT NULL,
echo     capacity integer NOT NULL,
echo     price_per_day numeric^(10,2^) NOT NULL,
echo     manager_id uuid NOT NULL,
echo     amenities jsonb DEFAULT '\[\]'::jsonb,
echo     images jsonb DEFAULT '\[\]'::jsonb,
echo     coordinates jsonb,
echo     is_active boolean DEFAULT true NOT NULL,
echo     is_featured boolean DEFAULT false NOT NULL,
echo     rating numeric^(3,2^) DEFAULT 0.0,
echo     total_reviews integer DEFAULT 0,
echo     created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
echo     updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
echo     CONSTRAINT spaces_pkey PRIMARY KEY ^(id^),
echo     CONSTRAINT spaces_capacity_check CHECK ^(^(capacity ^> 0^)^),
echo     CONSTRAINT spaces_price_per_day_check CHECK ^(^(price_per_day ^>= ^(0^)::numeric^)^),
echo     CONSTRAINT spaces_rating_check CHECK ^(^(^(rating ^>= ^(0^)::numeric^) AND ^(rating ^<= ^(5^)::numeric^)^)^),
echo     CONSTRAINT spaces_manager_id_fkey FOREIGN KEY ^(manager_id^) REFERENCES public.users^(id^)
echo ^);
echo.
echo -- Bookings Table
echo CREATE TABLE IF NOT EXISTS public.bookings ^(
echo     id uuid DEFAULT public.uuid_generate_v4^(^) NOT NULL,
echo     user_id uuid NOT NULL,
echo     space_id uuid NOT NULL,
echo     start_date date NOT NULL,
echo     end_date date NOT NULL,
echo     start_time time without time zone,
echo     end_time time without time zone,
echo     total_days integer NOT NULL,
echo     people_count integer NOT NULL,
echo     base_price numeric^(10,2^) NOT NULL,
echo     fees numeric^(10,2^) DEFAULT 0 NOT NULL,
echo     total_price numeric^(10,2^) NOT NULL,
echo     status public.booking_status DEFAULT 'pending'::public.booking_status NOT NULL,
echo     notes text,
echo     created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
echo     updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
echo     cancelled_at timestamp with time zone,
echo     cancellation_reason text,
echo     CONSTRAINT bookings_pkey PRIMARY KEY ^(id^),
echo     CONSTRAINT bookings_user_id_fkey FOREIGN KEY ^(user_id^) REFERENCES public.users^(id^),
echo     CONSTRAINT bookings_space_id_fkey FOREIGN KEY ^(space_id^) REFERENCES public.spaces^(id^)
echo ^);
echo.
echo -- Payments Table
echo CREATE TABLE IF NOT EXISTS public.payments ^(
echo     id uuid DEFAULT public.uuid_generate_v4^(^) NOT NULL,
echo     booking_id uuid NOT NULL,
echo     stripe_payment_intent_id character varying^(255^),
echo     amount numeric^(10,2^) NOT NULL,
echo     currency character varying^(3^) DEFAULT 'EUR'::character varying NOT NULL,
echo     status public.payment_status DEFAULT 'pending'::public.payment_status NOT NULL,
echo     payment_method jsonb,
echo     created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
echo     updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
echo     completed_at timestamp with time zone,
echo     failed_at timestamp with time zone,
echo     failure_reason text,
echo     CONSTRAINT payments_pkey PRIMARY KEY ^(id^),
echo     CONSTRAINT payments_booking_id_fkey FOREIGN KEY ^(booking_id^) REFERENCES public.bookings^(id^)
echo ^);
echo.
echo -- Sample Data
echo INSERT INTO public.spaces ^(
echo     name, description, type, city, address, capacity, price_per_day, manager_id
echo ^) VALUES ^(
echo     'Ufficio Moderno Milano',
echo     'Spazio di coworking nel centro di Milano con connessione WiFi veloce',
echo     'co_working',
echo     'Milano',
echo     'Via Dante 15, Milano',
echo     20,
echo     50.00,
echo     ^(SELECT id FROM users WHERE role = 'admin' LIMIT 1^)
echo ^), ^(
echo     'Sala Riunioni Roma',
echo     'Sala riunioni elegante per meeting aziendali',
echo     'meeting_room',
echo     'Roma',
echo     'Via del Corso 100, Roma',
echo     10,
echo     80.00,
echo     ^(SELECT id FROM users WHERE role = 'admin' LIMIT 1^)
echo ^) ON CONFLICT DO NOTHING;
echo.
echo \echo 'Database completed successfully!'
echo \dt
) > temp_complete_schema.sql

echo [INFO] Eseguendo script nel database...
docker-compose exec -T db psql -U coworkspace_user -d coworkspace -f - < temp_complete_schema.sql

if errorlevel 1 (
    echo [ERROR] Errore durante la creazione delle tabelle
    pause
    exit /b 1
)

echo [OK] Tabelle create con successo

REM Cleanup
del temp_complete_schema.sql >nul 2>&1

REM Test API
echo [INFO] Testing API spaces...
timeout /t 3 /nobreak >nul
curl -s http://localhost/api/spaces | head -10

echo.
echo ========================================
echo         SETUP COMPLETATO
echo ========================================
echo.
echo Ora prova a ricaricare la pagina:
echo   http://localhost
echo.
echo Le API dovrebbero funzionare:
echo   http://localhost/api/spaces
echo   http://localhost/api/health
echo.

pause