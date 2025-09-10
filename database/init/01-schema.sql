-- CoWorkSpace Database Schema
-- Auto-initialization script

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum Types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('client', 'manager', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE account_status AS ENUM ('active', 'inactive', 'banned', 'pending');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE space_type AS ENUM ('office', 'meeting_room', 'desk', 'conference_room', 'co_working', 'private_office');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255),
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    phone character varying(20),
    company character varying(255),
    role public.user_role DEFAULT 'client'::public.user_role NOT NULL,
    status public.account_status DEFAULT 'active'::public.account_status NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    profile_image character varying(500),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_login timestamp with time zone,
    reset_token character varying(255),
    reset_token_expires timestamp with time zone,
    verification_token character varying(255),
    google_id character varying(255),
    avatar_url text,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_email_unique UNIQUE (email)
);

-- Admin User
INSERT INTO public.users (
    email,
    password_hash,
    first_name,
    last_name,
    role,
    email_verified
) VALUES (
    'admin@coworkspace.test',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewLhox5ABNG5QAg.',
    'Admin',
    'System',
    'admin',
    true
) ON CONFLICT (email) DO NOTHING;

\echo 'Database initialized successfully!'
