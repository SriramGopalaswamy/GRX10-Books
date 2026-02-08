import express from 'express';
import passport from 'passport';
import { Strategy as MicrosoftStrategy } from 'passport-microsoft';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import { Employee } from '../config/database.js';
import { buildSessionUser } from '../security/permissionService.js';

dotenv.config();

const router = express.Router();

// --- Rate Limiting (P1-09) ---
// Simple in-memory rate limiter for login endpoints
const loginAttempts = new Map(); // key: IP, value: { count, firstAttempt }
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 10; // max 10 attempts per window

const loginRateLimiter = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const record = loginAttempts.get(ip);

    if (record) {
        // Reset window if expired
        if (now - record.firstAttempt > RATE_LIMIT_WINDOW_MS) {
            loginAttempts.set(ip, { count: 1, firstAttempt: now });
            return next();
        }
        if (record.count >= RATE_LIMIT_MAX_ATTEMPTS) {
            const retryAfter = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - record.firstAttempt)) / 1000);
            res.set('Retry-After', retryAfter.toString());
            return res.status(429).json({
                error: 'Too many login attempts. Please try again later.',
                retryAfterSeconds: retryAfter
            });
        }
        record.count++;
    } else {
        loginAttempts.set(ip, { count: 1, firstAttempt: now });
    }

    // Cleanup old entries periodically (every 100 requests)
    if (loginAttempts.size > 1000) {
        for (const [key, val] of loginAttempts) {
            if (now - val.firstAttempt > RATE_LIMIT_WINDOW_MS) {
                loginAttempts.delete(key);
            }
        }
    }

    next();
};

// --- Configuration ---
// TODO: User must provide these in .env or Cloud Run secrets
const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const TENANT_ID = process.env.MICROSOFT_TENANT_ID; // Optional, but good for single-tenant apps
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET;

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
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.warn('⚠️ Google OAuth credentials not found. Login will fail.');
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

            // Look up employee by email in Employee table
            const employee = await Employee.findOne({
                where: {
                    email: email.toLowerCase(),
                    status: 'Active'
                }
            });

            if (!employee) {
                console.log(`[auth] SSO denied: employee not found or inactive for ${email}`);
                return done(null, false, { message: 'User not found. Please contact admin.' });
            }

            console.log(`✅ SSO authentication successful for employee: ${employee.email} (${employee.id})`);

            const sessionUser = await buildSessionUser(employee, {
                isAdmin: employee.role === 'Admin' || employee.role === 'HR'
            });

            return done(null, sessionUser);
        } catch (err) {
            console.error('SSO authentication error:', err);
            return done(null, false, { message: 'Authentication failed. Please try again.' });
        }
    }
));

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    passport.use('google', new OAuth2Strategy({
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: '/api/auth/google/callback',
        authorizationURL: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenURL: 'https://oauth2.googleapis.com/token'
    },
        async (accessToken, refreshToken, params, done) => {
            try {
                const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                if (!profileResponse.ok) {
                    console.error('Google SSO profile fetch failed:', profileResponse.statusText);
                    return done(null, false, { message: 'Unable to fetch Google profile.' });
                }

                const profile = await profileResponse.json();
                const email = profile.email ? profile.email.toLowerCase() : null;

                if (!email) {
                    return done(null, false, { message: 'No email found in profile.' });
                }

                if (email === 'sgopalaswamy@gmail.com') {
                const overrideEmployee = {
                    id: email,
                    name: profile.name || 'SG Opalaswamy',
                    email,
                    role: 'Admin'
                };
                const sessionUser = await buildSessionUser(overrideEmployee, {
                    isAdmin: true
                });
                return done(null, sessionUser);
            }

                const employee = await Employee.findOne({
                    where: {
                        email: email.toLowerCase(),
                        status: 'Active'
                    }
                });

                if (!employee) {
                    console.log(`[auth] Google SSO denied: employee not found or inactive for ${email}`);
                    return done(null, false, { message: 'User not found. Please contact admin.' });
                }

                console.log(`✅ Google SSO authentication successful for employee: ${employee.email} (${employee.id})`);

                const sessionUser = await buildSessionUser(employee, {
                    isAdmin: employee.role === 'Admin' || employee.role === 'HR'
                });

                return done(null, sessionUser);
            } catch (err) {
                console.error('Google SSO authentication error:', err);
                return done(null, false, { message: 'Authentication failed. Please try again.' });
            }
        }
    ));
}

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

router.get('/google', (req, res, next) => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return res.status(503).json({ error: 'Google OAuth is not configured.' });
    }
    return passport.authenticate('google', {
        scope: ['profile', 'email'],
        prompt: 'select_account'
    })(req, res, next);
});

// 2. Callback — custom handler to return explicit HTTP status codes
router.get('/microsoft/callback', (req, res, next) => {
    passport.authenticate('microsoft', (err, user, info) => {
        if (err) {
            console.error('[auth] SSO callback error:', err);
            return res.redirect('/login?error=server_error');
        }
        if (!user) {
            const message = (info && info.message) || 'Access denied';
            console.log(`[auth] SSO login failed: ${message}`);
            // Return 401 for API clients, redirect for browsers
            if (req.accepts('json') && !req.accepts('html')) {
                return res.status(401).json({ error: message });
            }
            return res.redirect(`/login?error=access_denied&message=${encodeURIComponent(message)}`);
        }
        req.login(user, (loginErr) => {
            if (loginErr) {
                console.error('[auth] SSO session creation failed:', loginErr);
                return res.redirect('/login?error=session_error');
            }
            res.redirect('/');
        });
    })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return res.redirect('/login?error=server_error');
    }
    passport.authenticate('google', (err, user, info) => {
        if (err) {
            console.error('[auth] Google SSO callback error:', err);
            return res.redirect('/login?error=server_error');
        }
        if (!user) {
            const message = (info && info.message) || 'Access denied';
            console.log(`[auth] Google SSO login failed: ${message}`);
            if (req.accepts('json') && !req.accepts('html')) {
                return res.status(401).json({ error: message });
            }
            return res.redirect(`/login?error=access_denied&message=${encodeURIComponent(message)}`);
        }
        req.login(user, (loginErr) => {
            if (loginErr) {
                console.error('[auth] Google SSO session creation failed:', loginErr);
                return res.redirect('/login?error=session_error');
            }
            res.redirect('/');
        });
    })(req, res, next);
});

// 3. Status Check (for Frontend)
router.get('/status', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ isAuthenticated: true, user: req.user });
    } else {
        res.json({ isAuthenticated: false });
    }
});

// 4. Employee Login (Email/Password) - All employees login via Employee table
router.post('/admin/login', loginRateLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Email/username and password are required' });
        }

        // Find employee by email or ID (email is preferred)
        const employee = await Employee.findOne({ 
            where: { 
                [Op.or]: [
                    { email: username },
                    { id: username }
                ],
                status: 'Active'
            } 
        });

        if (!employee) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if email/password login is enabled for this employee
        if (!employee.enableEmailLogin) {
            return res.status(403).json({ error: 'Email/password login is disabled for this account. Please use SSO login.' });
        }

        // Check password using bcrypt
        const isValidPassword = await bcrypt.compare(password, employee.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const sessionUser = await buildSessionUser(employee, {
            isAdmin: employee.role === 'Admin' || employee.role === 'HR'
        });

        req.login(sessionUser, (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to create session' });
            }
            res.json({ success: true, user: sessionUser });
        });
    } catch (error) {
        console.error('[auth] Login error:', error.message);
        res.status(500).json({ error: 'Internal server error during login' });
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
