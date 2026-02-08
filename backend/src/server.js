// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import passport from 'passport';
let initDb;
let bootstrapAdminUser;

// Prevent unhandled rejections from crashing the container before port is bound
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

console.log(`[startup] Starting server. NODE_ENV: ${process.env.NODE_ENV}, PORT: ${PORT}`);
console.log(`[startup] Current directory: ${__dirname}`);

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for file uploads

// Trust proxy is required for secure cookies behind a proxy (like Cloud Run)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

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

app.use(passport.initialize());
app.use(passport.session());

// Serve static files from the React app
const distPath = path.join(__dirname, '../../frontend/dist');
console.log(`Serving static files from: ${distPath}`);
app.use(express.static(distPath));

const attachRoutes = async () => {
  try {
    const [
      authRoutes,
      invoiceRoutes,
      customerRoutes,
      aiRoutes,
      migrationRoutes,
      hrmsRoutes,
      osRoutes,
      configRoutes,
      securityRoutes,
      reportsRoutes,
      dashboardRoutes,
      accountingRoutes,
      billingRoutes,
      paymentsRoutes,
      taxRoutes,
      bankingRoutes,
      databaseModule,
      bootstrapModule
    ] = await Promise.all([
      import('./auth/auth.routes.js'),
      import('./modules/invoices/invoice.routes.js'),
      import('./modules/customers/customer.routes.js'),
      import('./modules/ai/ai.routes.js'),
      import('./modules/migration/migration.routes.js'),
      import('./modules/hrms/hrms.routes.js'),
      import('./modules/os/os.routes.js'),
      import('./modules/config/config.routes.js'),
      import('./modules/security/security.routes.js'),
      import('./modules/reports/reports.routes.js'),
      import('./modules/dashboard/dashboard.routes.js'),
      import('./modules/accounting/accounting.routes.js'),
      import('./modules/billing/billing.routes.js'),
      import('./modules/payments/payments.routes.js'),
      import('./modules/tax/tax.routes.js'),
      import('./modules/banking/banking.routes.js'),
      import('./config/database.js'),
      import('./config/bootstrap.js')
    ]);

    initDb = databaseModule.initDb;
    bootstrapAdminUser = bootstrapModule.bootstrapAdminUser;

    app.use('/api/auth', authRoutes.default);
    app.use('/api/accounting', invoiceRoutes.default);
    app.use('/api/accounting', customerRoutes.default);
    app.use('/api/ai', aiRoutes.default);
    app.use('/api/migration', migrationRoutes.default);
    app.use('/api/hrms', hrmsRoutes.default);
    app.use('/api/os', osRoutes.default);
    app.use('/api/config', configRoutes.default);
    app.use('/api/security', securityRoutes.default);
    app.use('/api/reports', reportsRoutes.default);
    app.use('/api/dashboard', dashboardRoutes.default);
    // Finance module routes
    app.use('/api/accounting', accountingRoutes.default);
    app.use('/api/billing', billingRoutes.default);
    app.use('/api/payments', paymentsRoutes.default);
    app.use('/api/tax', taxRoutes.default);
    app.use('/api/banking', bankingRoutes.default);

    // API 404 handler (must be after all API routes)
    app.use('/api', (req, res) => {
      res.status(404).json({ error: 'API endpoint not found' });
    });
  } catch (err) {
    console.error('[startup] Failed to attach routes:', err);
  }
};

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

// CRITICAL: Bind port FIRST so Cloud Run health check passes immediately.
// Database initialization runs in the background after the port is bound.
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[startup] Server listening on http://0.0.0.0:${PORT}`);

  // Attach routes and initialize DB AFTER port is bound
  attachRoutes().then(async () => {
    if (!initDb) {
      console.error('[startup] Database module not available; skipping init.');
      return;
    }

    try {
      await initDb();
      console.log('[startup] Database initialized successfully');
    } catch (err) {
      console.error('Failed to initialize database:', err);
      return;
    }

    if (!bootstrapAdminUser) {
      console.error('[startup] Bootstrap module not available; skipping admin bootstrap.');
      return;
    }

    // Bootstrap initial admin user if none exists
    try {
      await bootstrapAdminUser();
    } catch (err) {
      console.error('Bootstrap warning:', err.message);
    }
  }).catch(err => {
    console.error('[startup] Failed during async startup:', err);
    // Don't crash - server still serves health checks and static files
  });
});
