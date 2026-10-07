import { app } from './app.js';
import { env } from './config/env.js';

const PORT = env.PORT;
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`MediChain-AI API server running on http://${HOST}:${PORT} (NODE_ENV: ${env.NODE_ENV})`);
});

function gracefulShutdown(signal: string): void {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  server.close((err) => {
    if (err) {
      console.error('Error during HTTP server shutdown:', err);
      process.exit(1);
    }
    console.log('HTTP server closed successfully.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Graceful shutdown timed out, forcing exit.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
