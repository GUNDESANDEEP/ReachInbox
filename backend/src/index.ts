import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { ENV } from './config/env';
import { connectDB } from './config/db';
import { initRedis } from './config/redis';
import { resetEmailQueue } from './queues/email.queue';
import { initEmailWorker } from './queues/email.worker';
import { setupBullBoard } from './queues/queue.board';
import apiRoutes from './routes/api.routes';

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'ReachInbox Email Scheduler Service',
    timestamp: new Date().toISOString(),
  });
});

// Start server initialization
const startServer = async () => {
  try {
    // 1. Connect DB
    await connectDB();

    // 2. Init Redis (External or Fallback Memory Server)
    await initRedis();
    resetEmailQueue();

    // 3. Init BullMQ Worker
    initEmailWorker();

    // 4. Mount BullMQ Admin UI Dashboard
    const bullBoardRouter = setupBullBoard();
    app.use('/admin/queues', bullBoardRouter);
    console.log(`📊 Live BullMQ Dashboard available at: http://localhost:${ENV.PORT}/admin/queues`);

    // 5. Mount REST API routes
    app.use('/api', apiRoutes);

    // 6. Global error handler
    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('🔥 Server Error:', err);
      res.status(500).json({ error: err.message || 'Internal Server Error' });
    });

    app.listen(ENV.PORT, () => {
      console.log(`🚀 ReachInbox Email Scheduler Backend listening on port ${ENV.PORT}`);
    });
  } catch (error) {
    console.error('💥 Fatal Server Initialization Error:', error);
    process.exit(1);
  }
};

// Start backend server
startServer();
