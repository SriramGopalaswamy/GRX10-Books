import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { sequelize, initDb } from './database.js';
import accountingRoutes from './routes/accounting.js';
import aiRoutes from './routes/ai.js';
import migrationRoutes from './routes/migration.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

console.log(`Starting server. NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`Current directory: ${__dirname}`);

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for file uploads

// Serve static files from the React app
const distPath = path.join(__dirname, '../dist');
console.log(`Serving static files from: ${distPath}`);
app.use(express.static(distPath));

// Routes
app.use('/api/accounting', accountingRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/migration', migrationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  console.log(`Catchall: serving index.html for ${req.url}`);
  res.sendFile(path.join(__dirname, '../dist/index.html'), (err) => {
    if (err) {
      console.error('Error serving index.html:', err);
      res.status(500).send(err);
    }
  });
});

// Initialize DB and start server
initDb().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
});
