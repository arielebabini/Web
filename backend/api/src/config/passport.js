console.log('DEBUG ENV:', {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'MISSING'
});

// config/passport.js - Passport configuration for Google OAuth
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const User = require('../models/User');
const logger = require('../utils/logger');

// ==================== GOOGLE OAUTH STRATEGY ====================
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_REDIRECT_URI || "/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        console.log('🔍 Google OAuth Profile received:', {
            id: profile.id,
            email: profile.emails?.[0]?.value,
            name: profile.displayName,
            photo: profile.photos?.[0]?.value
        });

        const email = profile.emails?.[0]?.value;

        if (!email) {
            logger.error('No email provided by Google OAuth');
            return done(new Error('Email not provided by Google'), null);
        }

        // Cerca utente esistente per email Google
        let user = await User.findByEmail(email);

        if (user) {
            // Utente esistente - aggiorna Google ID se necessario
            if (!user.google_id) {
                // Aggiorna utente esistente con Google ID
                await User.updateProfile(user.id, {
                    google_id: profile.id,
                    avatar_url: profile.photos?.[0]?.value || user.avatar_url
                });

                logger.info('Existing user linked with Google:', {
                    userId: user.id,
                    email: user.email
                });
            }

            console.log('✅ Existing user logged in via Google:', user.email);
            return done(null, user);
        }

        // Nuovo utente - crea account
        const [firstName, ...lastNameParts] = (profile.displayName || '').split(' ');
        const lastName = lastNameParts.join(' ') || '';

        const userData = {
            google_id: profile.id,
            email: email,
            first_name: firstName || 'User',
            last_name: lastName || '',
            avatar_url: profile.photos?.[0]?.value || null,
            status: 'active',
            role: 'client',
            email_verified: true, // Google emails are pre-verified
            password_hash: null, // No password for OAuth users
            phone: null,
            company: null,
            created_at: new Date(),
            updated_at: new Date()
        };

        user = await User.create(userData);

        console.log('🎉 New user created via Google:', user.email);

        logger.info('New user created via Google OAuth:', {
            userId: user.id,
            email: user.email,
            googleId: profile.id
        });

        return done(null, user);

    } catch (error) {
        console.error('❌ Google OAuth error:', error);
        logger.error('Google OAuth error:', {
            error: error.message,
            stack: error.stack,
            profileId: profile?.id
        });
        return done(error, null);
    }
}));

// ==================== JWT STRATEGY (existing) ====================
passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET || 'fallback-secret-key',
    algorithms: ['HS256']
}, async (payload, done) => {
    try {
        console.log('🔍 JWT Strategy - Payload:', {
            id: payload.id,
            email: payload.email,
            role: payload.role
        });

        const user = await User.findById(payload.id);

        if (user && user.status === 'active') {
            console.log('✅ JWT Strategy - User found:', user.email);
            return done(null, user);
        }

        console.log('❌ JWT Strategy - User not found or inactive');
        return done(null, false);

    } catch (error) {
        console.error('❌ JWT Strategy error:', error);
        logger.error('JWT Strategy error:', error);
        return done(error, false);
    }
}));

// ==================== SERIALIZATION ====================
// Questi metodi sono utilizzati quando session: true (non il nostro caso)
// Li includiamo per completezza ma non sono necessari per JWT auth
passport.serializeUser((user, done) => {
    console.log('📦 Serializing user:', user.id);
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        console.log('📤 Deserializing user:', id);
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        console.error('❌ Deserialization error:', error);
        done(error, null);
    }
});

// ==================== DEBUG INFO ====================
if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Passport Configuration Loaded:');
    console.log('  - Google OAuth Strategy: ✅');
    console.log('  - JWT Strategy: ✅');
    console.log('  - Google Client ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing');
    console.log('  - Google Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing');
    console.log('  - Google Redirect URI:', process.env.GOOGLE_REDIRECT_URI || '/api/auth/google/callback');
}

module.exports = passport;