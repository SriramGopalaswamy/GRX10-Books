// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import passport from 'passport';
import { sequelize, initDb } from './config/database.js';
import invoiceRoutes from './modules/invoices/invoice.routes.js';
import customerRoutes from './modules/customers/customer.routes.js';
import aiRoutes from './modules/ai/ai.routes.js';
import migrationRoutes from './modules/migration/migration.routes.js';
import authRoutes from './auth/auth.routes.js';
import hrmsRoutes from './modules/hrms/hrms.routes.js';
import osRoutes from './modules/os/os.routes.js';
import configRoutes from './modules/config/config.routes.js';
import securityRoutes from './modules/security/security.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

console.log(`Starting server. NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`Current directory: ${__dirname}`);

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for file uploads

// --- Session & Passport Config ---
app.use(session({
  secret: process.env.SESSION_SECRET || 'grx10-secret-key-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Secure in production (HTTPS)
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Trust proxy is required for secure cookies behind a proxy (like Cloud Run)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(passport.initialize());
app.use(passport.session());

// Serve static files from the React app
const distPath = path.join(__dirname, '../../frontend/dist');
console.log(`Serving static files from: ${distPath}`);
app.use(express.static(distPath));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/accounting', invoiceRoutes);
app.use('/api/accounting', customerRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/migration', migrationRoutes);
app.use('/api/hrms', hrmsRoutes);
app.use('/api/os', osRoutes);
app.use('/api/config', configRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Root health check for Cloud Run (responds before static file serving)
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
// Only match non-API routes
app.get('*', (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  console.log(`Catchall: serving index.html for ${req.url}`);
  const indexPath = path.join(__dirname, '../../frontend/dist/index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      // If index.html doesn't exist, return OK for health checks on root
      if (req.path === '/') {
        return res.status(200).send('GRX10 Books API Server - OK');
      }
      console.error('Error serving index.html:', err);
      res.status(500).send('Frontend not available');
    }
  });
});

// Initialize DB and start server
// Initialize DB
initDb().then(() => {
  console.log('Database initialized successfully');
}).catch(err => {
  console.error('Failed to initialize database:', err);
});

// Start server immediately (don't wait for DB) to satisfy Cloud Run health check
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
