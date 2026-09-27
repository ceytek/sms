import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { SmsWorkerHost } from './modules/messaging/services/sms-worker.host.js';
import { closeRedis } from './modules/messaging/queue/redis.connection.js';

process.env.SMS_WORKER = '1';

async function bootstrap() {
  const logger = new Logger('SmsWorker');
  const app = await NestFactory.createApplicationContext(AppModule);
  const host = app.get(SmsWorkerHost);
  await host.start();
  logger.log('SMS worker process ready');

  const shutdown = async () => {
    logger.log('SIGTERM: draining workers');
    await host.onModuleDestroy();
    await closeRedis();
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());
}

bootstrap();
