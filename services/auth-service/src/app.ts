import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes';
import { env } from './config/env';

const app = express();
app.set('trust proxy', true);

app.use(cors({
  origin: true, // Set to your frontend domain in production
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/auth', authRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'auth-service' });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Server error in Auth Service:", {
    message: err.message,
    stack: err.stack,
  });

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error in Auth Service",
    error: {
      code: err.code || "INTERNAL_SERVER_ERROR",
      details: env.NODE_ENV === "development" ? err.stack : null,
    },
  });
});

export default app;
