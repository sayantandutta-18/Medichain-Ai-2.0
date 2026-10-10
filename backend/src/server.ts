import { app } from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';

const PORT = env.PORT;
const HOST = '0.0.0.0';

async function startServer(): Promise<void> {
  try {
    await connectDB();
    console.log(`Connected to MongoDB successfully.`);

    const server = app.listen(PORT, HOST, () => {
      console.log(`MediChain-AI API server running on http://${HOST}:${PORT} (NODE_ENV: ${env.NODE_ENV})`);
    });

    const shutdown = async (signal: string) => {
      console.log(`Received ${signal}. Starting graceful shutdown...`);
      server.close(async (err) => {
        if (err) {
          console.error('Error during HTTP server shutdown:', err);
          process.exit(1);
        }
        await disconnectDB();
        console.log('HTTP server and database connection closed.');
        process.exit(0);
      });

      setTimeout(() => {
        console.error('Graceful shutdown timed out, forcing exit.');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('Failed to start MediChain-AI API server:', err);
    process.exit(1);
  }
}

startServer();
