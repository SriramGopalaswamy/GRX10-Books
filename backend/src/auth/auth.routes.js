import express from 'express';
import passport from 'passport';
import { Strategy as MicrosoftStrategy } from 'passport-microsoft';
import dotenv from 'dotenv';
import { User } from '../config/database.js';

dotenv.config();

const router = express.Router();

// --- Configuration ---
// TODO: User must provide these in .env or Cloud Run secrets
const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const TENANT_ID = process.env.MICROSOFT_TENANT_ID; // Optional, but good for single-tenant apps

// --- Admin Credentials ---
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// --- Whitelist ---
// TODO: Replace these with the actual allowed email addresses
const ALLOWED_EMAILS = [
    'user1@example.com',
    'user2@example.com',
    'sriram@grx10.com'
];

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.warn("⚠️ Microsoft OAuth credentials not found. Login will fail.");
}

// --- Passport Strategy ---
passport.use(new MicrosoftStrategy({
    clientID: CLIENT_ID || 'MISSING_ID',
    clientSecret: CLIENT_SECRET || 'MISSING_SECRET',
    callbackURL: "/api/auth/microsoft/callback",
    scope: ['user.read'],
    tenant: TENANT_ID || 'common',
    authorizationURL: `https://login.microsoftonline.com/${TENANT_ID || 'common'}/oauth2/v2.0/authorize`,
    tokenURL: `https://login.microsoftonline.com/${TENANT_ID || 'common'}/oauth2/v2.0/token`,
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value.toLowerCase() : null;

            if (!email) {
                return done(null, false, { message: 'No email found in profile.' });
            }

            if (!ALLOWED_EMAILS.includes(email)) {
                console.log(`🚫 Access denied for: ${email}`);
                return done(null, false, { message: 'Access denied. You are not authorized.' });
            }

            console.log(`✅ User authenticated: ${email}`);
            // In a real app, you might find/create a user in your DB here
            const user = {
                id: profile.id,
                displayName: profile.displayName,
                email: email
            };
            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }
));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

// --- Routes ---

// 1. Initiate Login
router.get('/microsoft', passport.authenticate('microsoft', {
    prompt: 'select_account',
}));

// 2. Callback
router.get('/microsoft/callback',
    passport.authenticate('microsoft', { failureRedirect: '/login?error=access_denied' }),
    (req, res) => {
        // Successful authentication
        res.redirect('/');
    }
);

// 3. Status Check (for Frontend)
router.get('/status', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ isAuthenticated: true, user: req.user });
    } else {
        res.json({ isAuthenticated: false });
    }
});

// 4. Admin/User Login (Username/Password)
router.post('/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Try to find user in database first
        let user = await User.findOne({ 
            where: { 
                username: username,
                isActive: true 
            } 
        });

        // Fallback to environment variables if user not found in DB (backward compatibility)
        if (!user) {
            // Check against env vars (for backward compatibility during migration)
            if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
                // Create user in database if it doesn't exist
                user = await User.findOrCreate({
                    where: { username: ADMIN_USERNAME },
                    defaults: {
                        id: 'admin-001',
                        username: ADMIN_USERNAME,
                        email: 'admin@grx10.com',
                        passwordHash: ADMIN_PASSWORD, // TODO: Hash with bcrypt in production
                        displayName: 'Administrator',
                        role: 'admin',
                        isActive: true
                    }
                }).then(([user]) => user);
            } else {
                return res.status(401).json({ error: 'Invalid username or password' });
            }
        } else {
            // User found in DB - check password
            // For now, compare plain text (TODO: implement bcrypt hashing)
            if (user.passwordHash !== password) {
                return res.status(401).json({ error: 'Invalid username or password' });
            }
        }

        // Update last login
        await user.update({ lastLogin: new Date() });

        // Create session user object
        const sessionUser = {
            id: user.id,
            displayName: user.displayName || user.username,
            email: user.email || `${user.username}@grx10.com`,
            role: user.role,
            isAdmin: user.role === 'admin'
        };

        req.login(sessionUser, (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to create session' });
            }
            res.json({ success: true, user: sessionUser });
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// 5. Logout
router.post('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        res.json({ success: true });
    });
});

export default router;
