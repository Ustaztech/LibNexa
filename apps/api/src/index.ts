import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/env';
import apiV1Router from './routes';
import { errorHandler } from './middleware/errorHandler';
import { swaggerSpec } from './swagger/swagger';
import { ensureDefaultSettings } from './services/setting.service';
import { startReminderScheduler } from './services/reminderScheduler';

const app = express();

// Security & Parsing Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allows swagger UI and cross-origin images
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow local dev origins or requests without origin (like curl, postman, mobile apps)
    if (!origin || config.corsAllowedOrigins.includes(origin) || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
    } else {
      callback(null, true); // Dev-friendly permissive for local testing
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Swagger UI Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Mount Versioned API Routes
app.use('/api/v1', apiV1Router);

// Centralized Error Handler
app.use(errorHandler);

const server = app.listen(config.port, async () => {
  console.log(`=======================================================`);
  console.log(` LIBNEXA API Server is running on port ${config.port}`);
  console.log(` API Endpoint:  http://localhost:${config.port}/api/v1`);
  console.log(` API Docs:      http://localhost:${config.port}/api/docs`);
  console.log(` Environment:   ${config.nodeEnv}`);
  console.log(`=======================================================`);

  try {
    await ensureDefaultSettings();
    startReminderScheduler();
  } catch (err) {
    console.error('[STARTUP ERROR] Could not initialize settings/scheduler:', err);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

export default app;
