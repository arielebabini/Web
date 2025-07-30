-- ===============================================
-- CoWorkSpace Sample Data
-- ===============================================

-- Inserimento utenti manager di esempio
INSERT INTO users (email, password_hash, first_name, last_name, role, email_verified, phone, company) VALUES
                                                                                                          ('manager.milano@coworkspace.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewMhzQCnwsVtTq9W', 'Marco', 'Rossi', 'manager', TRUE, '+39 02 1234567', 'Milano Coworking SRL'),
                                                                                                          ('manager.roma@coworkspace.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewMhzQCnwsVtTq9W', 'Giulia', 'Bianchi', 'manager', TRUE, '+39 06 2345678', 'Roma Workspace SRL'),
                                                                                                          ('manager.torino@coworkspace.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewMhzQCnwsVtTq9W', 'Luca', 'Verdi', 'manager', TRUE, '+39 011 3456789', 'Torino Hub SRL');

-- Inserimento utenti clienti di esempio
INSERT INTO users (email, password_hash, first_name, last_name, role, email_verified, phone, company) VALUES
                                                                                                          ('client1@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewMhzQCnwsVtTq9W', 'Mario', 'Rossi', 'client', TRUE, '+39 333 1234567', 'Freelance'),
                                                                                                          ('client2@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewMhzQCnwsVtTq9W', 'Sara', 'Bianchi', 'client', TRUE, '+39 333 2345678', 'Design Studio SRL'),
                                                                                                          ('client3@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewMhzQCnwsVtTq9W', 'Francesco', 'Verdi', 'client', TRUE, '+39 333 3456789', 'Tech Startup SRL');

-- Recupero ID utenti per riferimenti
-- (In produzione useresti i veri UUID generati)

-- Inserimento spazi di coworking
INSERT INTO spaces (name, description, type, city, address, capacity, price_per_day, manager_id, amenities, images, coordinates, is_active, is_featured, rating, total_reviews) VALUES
                                                                                                                                                                                    (
                                                                                                                                                                                        'Milano Business Hub',
                                                                                                                                                                                        'Ufficio privato nel cuore di Milano, completamente attrezzato per team fino a 12 persone. Situato in zona Brera, offre un ambiente professionale e moderno.',
                                                                                                                                                                                        'private-office',
                                                                                                                                                                                        'Milano',
                                                                                                                                                                                        'Via Brera 12, 20121 Milano MI',
                                                                                                                                                                                        12,
                                                                                                                                                                                        85.00,
                                                                                                                                                                                        (SELECT id FROM users WHERE email = 'manager.milano@coworkspace.com'),
                                                                                                                                                                                        '["wifi", "parking", "coffee", "printer", "meeting_room", "air_conditioning"]'::jsonb,
                                                                                                                                                                                        '["https://images.unsplash.com/photo-1497366216548-37526070297c?w=600", "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600"]'::jsonb,
                                                                                                                                                                                        '{"lat": 45.4719, "lng": 9.1896}'::jsonb,
                                                                                                                                                                                        TRUE,
                                                                                                                                                                                        TRUE,
                                                                                                                                                                                        4.8,
                                                                                                                                                                                        24
                                                                                                                                                                                    ),
                                                                                                                                                                                    (
                                                                                                                                                                                        'Milano Creative Space',
                                                                                                                                                                                        'Spazio creativo nei Navigli, perfetto per freelancer e startup. Open space luminoso con area relax e cucina condivisa.',
                                                                                                                                                                                        'hot-desk',
                                                                                                                                                                                        'Milano',
                                                                                                                                                                                        'Via Navigli 45, 20144 Milano MI',
                                                                                                                                                                                        20,
                                                                                                                                                                                        45.00,
                                                                                                                                                                                        (SELECT id FROM users WHERE email = 'manager.milano@coworkspace.com'),
                                                                                                                                                                                        '["wifi", "coffee", "kitchen", "bike_parking", "terrace"]'::jsonb,
                                                                                                                                                                                        '["https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600", "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=600"]'::jsonb,
                                                                                                                                                                                        '{"lat": 45.4484, "lng": 9.1740}'::jsonb,
                                                                                                                                                                                        TRUE,
                                                                                                                                                                                        FALSE,
                                                                                                                                                                                        4.5,
                                                                                                                                                                                        18
                                                                                                                                                                                    ),
                                                                                                                                                                                    (
                                                                                                                                                                                        'Roma Creative Space',
                                                                                                                                                                                        'Spazio di coworking dinamico nel caratteristico quartiere di Trastevere. Ambiente stimolante per creativi e professionisti.',
                                                                                                                                                                                        'hot-desk',
                                                                                                                                                                                        'Roma',
                                                                                                                                                                                        'Via di Trastevere 85, 00153 Roma RM',
                                                                                                                                                                                        25,
                                                                                                                                                                                        35.00,
                                                                                                                                                                                        (SELECT id FROM users WHERE email = 'manager.roma@coworkspace.com'),
                                                                                                                                                                                        '["wifi", "coffee", "printer", "lounge_area", "outdoor_space"]'::jsonb,
                                                                                                                                                                                        '["https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600"]'::jsonb,
                                                                                                                                                                                        '{"lat": 41.8902, "lng": 12.4663}'::jsonb,
                                                                                                                                                                                        TRUE,
                                                                                                                                                                                        FALSE,
                                                                                                                                                                                        4.6,
                                                                                                                                                                                        32
                                                                                                                                                                                    ),
                                                                                                                                                                                    (
                                                                                                                                                                                        'Roma Executive Meeting',
                                                                                                                                                                                        'Sala riunioni di alto livello nel centro di Roma. Perfetta per meeting aziendali e presentazioni importanti.',
                                                                                                                                                                                        'meeting-room',
                                                                                                                                                                                        'Roma',
                                                                                                                                                                                        'Via del Corso 156, 00186 Roma RM',
                                                                                                                                                                                        14,
                                                                                                                                                                                        95.00,
                                                                                                                                                                                        (SELECT id FROM users WHERE email = 'manager.roma@coworkspace.com'),
                                                                                                                                                                                        '["wifi", "projector", "whiteboard", "coffee", "air_conditioning", "parking"]'::jsonb,
                                                                                                                                                                                        '["https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=600"]'::jsonb,
                                                                                                                                                                                        '{"lat": 41.9028, "lng": 12.4764}'::jsonb,
                                                                                                                                                                                        TRUE,
                                                                                                                                                                                        TRUE,
                                                                                                                                                                                        4.9,
                                                                                                                                                                                        15
                                                                                                                                                                                    ),
                                                                                                                                                                                    (
                                                                                                                                                                                        'Torino Executive Meeting',
                                                                                                                                                                                        'Sala riunioni di alto livello con vista panoramica sulla città. Dotata di tecnologie all''avanguardia.',
                                                                                                                                                                                        'meeting-room',
                                                                                                                                                                                        'Torino',
                                                                                                                                                                                        'Corso Francia 23, 10138 Torino TO',
                                                                                                                                                                                        16,
                                                                                                                                                                                        120.00,
                                                                                                                                                                                        (SELECT id FROM users WHERE email = 'manager.torino@coworkspace.com'),
                                                                                                                                                                                        '["wifi", "parking", "printer", "projector", "video_conferencing", "catering"]'::jsonb,
                                                                                                                                                                                        '["https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=600"]'::jsonb,
                                                                                                                                                                                        '{"lat": 45.0703, "lng": 7.6869}'::jsonb,
                                                                                                                                                                                        FALSE,
                                                                                                                                                                                        TRUE,
                                                                                                                                                                                        4.9,
                                                                                                                                                                                        8
                                                                                                                                                                                    ),
                                                                                                                                                                                    (
                                                                                                                                                                                        'Bologna Open Workspace',
                                                                                                                                                                                        'Ampio spazio aperto nel centro di Bologna, ideale per networking e collaborazione. Ambiente moderno e accogliente.',
                                                                                                                                                                                        'hot-desk',
                                                                                                                                                                                        'Bologna',
                                                                                                                                                                                        'Via Indipendenza 45, 40121 Bologna BO',
                                                                                                                                                                                        35,
                                                                                                                                                                                        28.00,
                                                                                                                                                                                        (SELECT id FROM users WHERE email = 'manager.milano@coworkspace.com'),
                                                                                                                                                                                        '["wifi", "coffee", "kitchen", "printing", "lounge", "bike_parking"]'::jsonb,
                                                                                                                                                                                        '["https://images.unsplash.com/photo-1556761175-4b46a572b786?w=600"]'::jsonb,
                                                                                                                                                                                        '{"lat": 44.4949, "lng": 11.3426}'::jsonb,
                                                                                                                                                                                        TRUE,
                                                                                                                                                                                        FALSE,
                                                                                                                                                                                        4.3,
                                                                                                                                                                                        41
                                                                                                                                                                                    );

-- Inserimento prenotazioni di esempio
INSERT INTO bookings (user_id, space_id, start_date, end_date, start_time, end_time, total_days, people_count, base_price, fees, total_price, status, notes) VALUES
                                                                                                                                                                 (
                                                                                                                                                                     (SELECT id FROM users WHERE email = 'client1@example.com'),
                                                                                                                                                                     (SELECT id FROM spaces WHERE name = 'Milano Business Hub'),
                                                                                                                                                                     '2024-12-15',
                                                                                                                                                                     '2024-12-17',
                                                                                                                                                                     '09:00',
                                                                                                                                                                     '18:00',
                                                                                                                                                                     3,
                                                                                                                                                                     8,
                                                                                                                                                                     255.00,
                                                                                                                                                                     25.50,
                                                                                                                                                                     280.50,
                                                                                                                                                                     'confirmed',
                                                                                                                                                                     'Riunione importante con team internazionale'
                                                                                                                                                                 ),
                                                                                                                                                                 (
                                                                                                                                                                     (SELECT id FROM users WHERE email = 'client2@example.com'),
                                                                                                                                                                     (SELECT id FROM spaces WHERE name = 'Milano Creative Space'),
                                                                                                                                                                     '2024-12-20',
                                                                                                                                                                     '2024-12-20',
                                                                                                                                                                     '14:00',
                                                                                                                                                                     '17:00',
                                                                                                                                                                     1,
                                                                                                                                                                     3,
                                                                                                                                                                     45.00,
                                                                                                                                                                     4.50,
                                                                                                                                                                     49.50,
                                                                                                                                                                     'confirmed',
                                                                                                                                                                     'Workshop di design thinking'
                                                                                                                                                                 ),
                                                                                                                                                                 (
                                                                                                                                                                     (SELECT id FROM users WHERE email = 'client3@example.com'),
                                                                                                                                                                     (SELECT id FROM spaces WHERE name = 'Roma Creative Space'),
                                                                                                                                                                     '2024-12-18',
                                                                                                                                                                     '2024-12-19',
                                                                                                                                                                     '10:00',
                                                                                                                                                                     '16:00',
                                                                                                                                                                     2,
                                                                                                                                                                     5,
                                                                                                                                                                     70.00,
                                                                                                                                                                     7.00,
                                                                                                                                                                     77.00,
                                                                                                                                                                     'pending',
                                                                                                                                                                     'Sessione di brainstorming per nuovo progetto'
                                                                                                                                                                 );

-- Inserimento pagamenti di esempio
INSERT INTO payments (booking_id, stripe_payment_intent_id, amount, currency, status, completed_at) VALUES
                                                                                                        (
                                                                                                            (SELECT id FROM bookings WHERE total_price = 280.50),
                                                                                                            'pi_1234567890abcdef',
                                                                                                            280.50,
                                                                                                            'EUR',
                                                                                                            'completed',
                                                                                                            CURRENT_TIMESTAMP - INTERVAL '2 days'
                                                                                                        ),
                                                                                                        (
                                                                                                            (SELECT id FROM bookings WHERE total_price = 49.50),
                                                                                                            'pi_0987654321fedcba',
                                                                                                            49.50,
                                                                                                            'EUR',
                                                                                                            'completed',
                                                                                                            CURRENT_TIMESTAMP - INTERVAL '1 day'
                                                                                                        );

-- Inserimento recensioni di esempio
INSERT INTO reviews (booking_id, user_id, space_id, rating, comment) VALUES
                                                                         (
                                                                             (SELECT id FROM bookings WHERE total_price = 280.50),
                                                                             (SELECT id FROM users WHERE email = 'client1@example.com'),
                                                                             (SELECT id FROM spaces WHERE name = 'Milano Business Hub'),
                                                                             5,
                                                                             'Spazio eccellente, molto professionale e ben attrezzato. Staff cortese e disponibile.'
                                                                         ),
                                                                         (
                                                                             (SELECT id FROM bookings WHERE total_price = 49.50),
                                                                             (SELECT id FROM users WHERE email = 'client2@example.com'),
                                                                             (SELECT id FROM spaces WHERE name = 'Milano Creative Space'),
                                                                             4,
                                                                             'Ambiente creativo e stimolante, perfetto per il nostro workshop. Unico neo: il wifi a volte era lento.'
                                                                         );

-- Inserimento notifiche di esempio
INSERT INTO notifications (user_id, type, title, message, data) VALUES
                                                                    (
                                                                        (SELECT id FROM users WHERE email = 'client1@example.com'),
                                                                        'booking_confirmed',
                                                                        'Prenotazione Confermata',
                                                                        'La tua prenotazione per Milano Business Hub è stata confermata per il 15-17 Dicembre.',
                                                                        '{"booking_id": "placeholder", "space_name": "Milano Business Hub", "dates": "15-17 Dicembre 2024"}'::jsonb
                                                                    ),
                                                                    (
                                                                        (SELECT id FROM users WHERE email = 'client2@example.com'),
                                                                        'payment_success',
                                                                        'Pagamento Completato',
                                                                        'Il pagamento di €49.50 per Milano Creative Space è stato elaborato con successo.',
                                                                        '{"amount": 49.50, "currency": "EUR", "space_name": "Milano Creative Space"}'::jsonb
                                                                    ),
                                                                    (
                                                                        (SELECT id FROM users WHERE email = 'manager.milano@coworkspace.com'),
                                                                        'new_booking',
                                                                        'Nuova Prenotazione',
                                                                        'Hai ricevuto una nuova prenotazione per Milano Business Hub.',
                                                                        '{"space_name": "Milano Business Hub", "customer": "Mario Rossi", "dates": "15-17 Dicembre 2024"}'::jsonb
                                                                    );

-- Inserimento disponibilità speciali
INSERT INTO space_availability (space_id, date, start_time, end_time, is_available, price_override, notes) VALUES
                                                                                                               (
                                                                                                                   (SELECT id FROM spaces WHERE name = 'Milano Business Hub'),
                                                                                                                   '2024-12-25',
                                                                                                                   '00:00',
                                                                                                                   '23:59',
                                                                                                                   FALSE,
                                                                                                                   NULL,
                                                                                                                   'Chiuso per festività natalizie'
                                                                                                               ),
                                                                                                               (
                                                                                                                   (SELECT id FROM spaces WHERE name = 'Roma Executive Meeting'),
                                                                                                                   '2024-12-31',
                                                                                                                   '14:00',
                                                                                                                   '18:00',
                                                                                                                   TRUE,
                                                                                                                   150.00,
                                                                                                                   'Prezzo speciale per Capodanno'
                                                                                                               );

-- Commit delle modifiche
COMMIT;

-- Messaggio di conferma
DO $
BEGIN
    RAISE NOTICE 'Database CoWorkSpace inizializzato con dati di esempio!';
    RAISE NOTICE 'Utenti creati:';
    RAISE NOTICE '- Admin: admin@coworkspace.com (password: admin123)';
    RAISE NOTICE '- Manager Milano: manager.milano@coworkspace.com (password: admin123)';
    RAISE NOTICE '- Manager Roma: manager.roma@coworkspace.com (password: admin123)';
    RAISE NOTICE '- Manager Torino: manager.torino@coworkspace.com (password: admin123)';
    RAISE NOTICE '- Client 1: client1@example.com (password: admin123)';
    RAISE NOTICE '- Client 2: client2@example.com (password: admin123)';
    RAISE NOTICE '- Client 3: client3@example.com (password: admin123)';
    RAISE NOTICE 'Spazi creati: 6';
    RAISE NOTICE 'Prenotazioni di esempio: 3';
    RAISE NOTICE 'Recensioni di esempio: 2';
END $;