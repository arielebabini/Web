-- database/init/01-init.sql
-- Schema completo per CoWorkSpace

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabella Users
CREATE TABLE users (
                       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                       email VARCHAR(255) UNIQUE NOT NULL,
                       password_hash VARCHAR(255),
                       first_name VARCHAR(100) NOT NULL,
                       last_name VARCHAR(100) NOT NULL,
                       phone VARCHAR(20),
                       company VARCHAR(255),
                       role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('admin', 'manager', 'customer')),
                       status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
                       email_verified BOOLEAN DEFAULT FALSE,
                       profile_image TEXT,
                       google_id VARCHAR(255) UNIQUE,
                       avatar_url TEXT,
                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                       last_login TIMESTAMP
);

-- Tabella Spaces
CREATE TABLE public.spaces (
                               id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
                               name character varying(255) NOT NULL,
                               description text,
                               type public.space_type NOT NULL,
                               city character varying(100) NOT NULL,
                               address text NOT NULL,
                               capacity integer NOT NULL,
                               price_per_day numeric(10,2) NOT NULL,
                               manager_id uuid NOT NULL,
                               amenities jsonb DEFAULT '[]'::jsonb,
                               images jsonb DEFAULT '[]'::jsonb,
                               coordinates jsonb,
                               is_active boolean DEFAULT true NOT NULL,
                               is_featured boolean DEFAULT false NOT NULL,
                               rating numeric(3,2) DEFAULT 0.0,
                               total_reviews integer DEFAULT 0,
                               created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
                               updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
                               CONSTRAINT spaces_capacity_check CHECK ((capacity > 0)),
                               CONSTRAINT spaces_price_per_day_check CHECK ((price_per_day >= (0)::numeric)),
                               CONSTRAINT spaces_rating_check CHECK (((rating >= (0)::numeric) AND (rating <= (5)::numeric)))
);

-- Tabella Bookings
CREATE TABLE bookings (
                          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                          space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
                          start_time TIMESTAMP NOT NULL,
                          end_time TIMESTAMP NOT NULL,
                          total_amount DECIMAL(10,2) NOT NULL,
                          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
                          payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
                          notes TEXT,
                          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                          CONSTRAINT valid_booking_time CHECK (end_time > start_time)
);

-- Tabella Payments
CREATE TABLE payments (
                          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                          booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
                          stripe_payment_intent_id VARCHAR(255) UNIQUE,
                          amount DECIMAL(10,2) NOT NULL,
                          currency VARCHAR(3) DEFAULT 'EUR',
                          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled')),
                          payment_method VARCHAR(50),
                          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Notifications
CREATE TABLE notifications (
                               id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                               user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                               type VARCHAR(50) NOT NULL,
                               title VARCHAR(255) NOT NULL,
                               message TEXT NOT NULL,
                               read BOOLEAN DEFAULT FALSE,
                               created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indici per performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_space_id ON bookings(space_id);
CREATE INDEX idx_bookings_start_time ON bookings(start_time);
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- Dati di esempio
INSERT INTO users (email, password_hash, first_name, last_name, role, status, email_verified)
VALUES
    ('admin@coworkspace.test', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeNFtVe4BpBaEkFuK', 'Admin', 'CoWorkSpace', 'admin', 'active', true)
    ON CONFLICT (email) DO NOTHING;