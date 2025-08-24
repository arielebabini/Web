-- ===============================================
-- CoWorkSpace Database Schema
-- ===============================================

-- Estensioni PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enum Types
CREATE TYPE user_role AS ENUM ('client', 'manager', 'admin');
CREATE TYPE account_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE space_type AS ENUM ('hot-desk', 'private-office', 'meeting-room', 'event-space');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- ===============================================
-- USERS TABLE
-- ===============================================
CREATE TABLE users (
                       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                       email VARCHAR(255) NOT NULL UNIQUE,
                       password_hash VARCHAR(255) NOT NULL,
                       first_name VARCHAR(100) NOT NULL,
                       last_name VARCHAR(100) NOT NULL,
                       phone VARCHAR(20),
                       company VARCHAR(255),
                       role user_role NOT NULL DEFAULT 'client',
                       status account_status NOT NULL DEFAULT 'active',
                       email_verified BOOLEAN NOT NULL DEFAULT FALSE,
                       profile_image VARCHAR(500),
                       created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                       updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                       last_login TIMESTAMP WITH TIME ZONE,
                       reset_token VARCHAR(255),
                       reset_token_expires TIMESTAMP WITH TIME ZONE,
                       verification_token VARCHAR(255)
);

-- Indici per users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- ===============================================
-- SPACES TABLE
-- ===============================================
CREATE TABLE spaces (
                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                        name VARCHAR(255) NOT NULL,
                        description TEXT,
                        type space_type NOT NULL,
                        city VARCHAR(100) NOT NULL,
                        address TEXT NOT NULL,
                        capacity INTEGER NOT NULL CHECK (capacity > 0),
                        price_per_day DECIMAL(10,2) NOT NULL CHECK (price_per_day >= 0),
                        manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        amenities JSONB DEFAULT '[]'::jsonb,
                        images JSONB DEFAULT '[]'::jsonb,
                        coordinates JSONB, -- {lat: number, lng: number}
                        is_active BOOLEAN NOT NULL DEFAULT TRUE,
                        is_featured BOOLEAN NOT NULL DEFAULT FALSE,
                        rating DECIMAL(3,2) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
                        total_reviews INTEGER DEFAULT 0,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indici per spaces
CREATE INDEX idx_spaces_city ON spaces(city);
CREATE INDEX idx_spaces_type ON spaces(type);
CREATE INDEX idx_spaces_manager_id ON spaces(manager_id);
CREATE INDEX idx_spaces_is_active ON spaces(is_active);
CREATE INDEX idx_spaces_is_featured ON spaces(is_featured);
CREATE INDEX idx_spaces_price ON spaces(price_per_day);
CREATE INDEX idx_spaces_rating ON spaces(rating);

-- ===============================================
-- BOOKINGS TABLE
-- ===============================================
CREATE TABLE bookings (
                          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                          space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
                          start_date DATE NOT NULL,
                          end_date DATE NOT NULL,
                          start_time TIME,
                          end_time TIME,
                          total_days INTEGER NOT NULL CHECK (total_days > 0),
                          people_count INTEGER NOT NULL CHECK (people_count > 0),
                          base_price DECIMAL(10,2) NOT NULL CHECK (base_price >= 0),
                          fees DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (fees >= 0),
                          total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
                          status booking_status NOT NULL DEFAULT 'pending',
                          notes TEXT,
                          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                          cancelled_at TIMESTAMP WITH TIME ZONE,
                          cancellation_reason TEXT,

    -- Constraints
                          CONSTRAINT check_date_range CHECK (end_date >= start_date),
                          CONSTRAINT check_time_range CHECK (
                              (start_time IS NULL AND end_time IS NULL) OR
                              (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
                              )
);

-- Indici per bookings
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_space_id ON bookings(space_id);
CREATE INDEX idx_bookings_start_date ON bookings(start_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_created_at ON bookings(created_at);

-- Indice per evitare overbooking
CREATE UNIQUE INDEX idx_bookings_no_overlap ON bookings(space_id, start_date, end_date, start_time, end_time)
    WHERE status IN ('confirmed', 'pending');

-- ===============================================
-- PAYMENTS TABLE
-- ===============================================
CREATE TABLE payments (
                          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                          booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
                          stripe_payment_intent_id VARCHAR(255),
                          amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
                          currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
                          status payment_status NOT NULL DEFAULT 'pending',
                          payment_method JSONB, -- Stripe payment method info
                          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                          completed_at TIMESTAMP WITH TIME ZONE,
                          failed_at TIMESTAMP WITH TIME ZONE,
                          failure_reason TEXT
);

-- Indici per payments
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_stripe_intent ON payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_status ON payments(status);

-- ===============================================
-- REVIEWS TABLE
-- ===============================================
CREATE TABLE reviews (
                         id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                         booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
                         user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                         space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
                         rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                         comment TEXT,
                         created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                         updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Un utente può recensire una prenotazione solo una volta
                         UNIQUE(booking_id, user_id)
);

-- Indici per reviews
CREATE INDEX idx_reviews_space_id ON reviews(space_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);

-- ===============================================
-- NOTIFICATIONS TABLE
-- ===============================================
CREATE TABLE notifications (
                               id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                               user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                               type VARCHAR(50) NOT NULL, -- 'booking_confirmed', 'payment_success', etc.
                               title VARCHAR(255) NOT NULL,
                               message TEXT NOT NULL,
                               data JSONB DEFAULT '{}'::jsonb, -- Dati aggiuntivi specifici per tipo
                               is_read BOOLEAN NOT NULL DEFAULT FALSE,
                               created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                               read_at TIMESTAMP WITH TIME ZONE
);

-- Indici per notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- ===============================================
-- SPACE AVAILABILITY TABLE (per gestione orari complessi)
-- ===============================================
CREATE TABLE space_availability (
                                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                                    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
                                    date DATE NOT NULL,
                                    start_time TIME NOT NULL,
                                    end_time TIME NOT NULL,
                                    is_available BOOLEAN NOT NULL DEFAULT TRUE,
                                    price_override DECIMAL(10,2), -- Prezzo speciale per questo slot
                                    notes TEXT,
                                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Un orario per spazio per data non può sovrapporsi
                                    CONSTRAINT check_time_slot CHECK (end_time > start_time)
);

-- Indici per space_availability
CREATE INDEX idx_space_availability_space_date ON space_availability(space_id, date);
CREATE INDEX idx_space_availability_is_available ON space_availability(is_available);

-- ===============================================
-- AUDIT LOG TABLE (per tracciare modifiche importanti)
-- ===============================================
CREATE TABLE audit_logs (
                            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                            table_name VARCHAR(64) NOT NULL,
                            record_id UUID NOT NULL,
                            action VARCHAR(10) NOT NULL, -- INSERT, UPDATE, DELETE
                            old_data JSONB,
                            new_data JSONB,
                            user_id UUID REFERENCES users(id),
                            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indici per audit_logs
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ===============================================
-- FUNCTIONS & TRIGGERS
-- ===============================================

-- Funzione per aggiornare updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger per updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spaces_updated_at BEFORE UPDATE ON spaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Funzione per aggiornare rating degli spazi
CREATE OR REPLACE FUNCTION update_space_rating()
RETURNS TRIGGER AS $$
BEGIN
UPDATE spaces
SET
    rating = (
        SELECT COALESCE(AVG(rating::DECIMAL), 0)
        FROM reviews
        WHERE space_id = COALESCE(NEW.space_id, OLD.space_id)
    ),
    total_reviews = (
        SELECT COUNT(*)
        FROM reviews
        WHERE space_id = COALESCE(NEW.space_id, OLD.space_id)
    )
WHERE id = COALESCE(NEW.space_id, OLD.space_id);

RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Trigger per aggiornare rating
CREATE TRIGGER update_space_rating_trigger
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_space_rating();

-- ===============================================
-- INITIAL DATA SETUP
-- ===============================================

-- Inserimento utente admin di default
INSERT INTO users (
    email,
    password_hash,
    first_name,
    last_name,
    role,
    email_verified
) VALUES (
             'admin@coworkspace.com',
             '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewMhzQCnwsVtTq9W', -- password: admin123
             'Admin',
             'CoWorkSpace',
             'admin',
             TRUE
         );
-- Commit delle modifiche
COMMIT;