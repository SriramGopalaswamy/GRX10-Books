import express from 'express';
import passport from 'passport';
import { Strategy as MicrosoftStrategy } from 'passport-microsoft';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import { User, Employee } from '../config/database.js';

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

            // Look up employee by email in Employee table
            const employee = await Employee.findOne({
                where: {
                    email: email.toLowerCase(),
                    status: 'Active'
                }
            });

            if (!employee) {
                console.log(`🚫 Access denied: Employee not found or inactive for email: ${email}`);
                return done(null, false, { message: 'Access denied. Employee not found or account is inactive.' });
            }

            console.log(`✅ SSO authentication successful for employee: ${employee.email} (${employee.id})`);

            // Create session user object from employee (same structure as email/password login)
            const sessionUser = {
                id: employee.id,
                name: employee.name,
                email: employee.email,
                role: employee.role, // 'Admin', 'HR', 'Manager', 'Employee', 'Finance'
                isAdmin: employee.role === 'Admin' || employee.role === 'HR'
            };

            return done(null, sessionUser);
        } catch (err) {
            console.error('SSO authentication error:', err);
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

        // Create session user object from employee
        const sessionUser = {
            id: employee.id,
            name: employee.name,
            email: employee.email,
            role: employee.role, // 'Admin', 'HR', 'Manager', 'Employee', 'Finance'
            isAdmin: employee.role === 'Admin' || employee.role === 'HR'
        };

        req.login(sessionUser, (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to create session' });
            }
            res.json({ success: true, user: sessionUser });
        });
    } catch (error) {
        console.error('Employee login error:', error);
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
