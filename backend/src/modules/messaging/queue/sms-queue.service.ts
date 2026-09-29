import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { bullmqConnection } from './redis.connection.js';
import { SMS_JOB, SMS_QUEUES } from './sms-queues.js';

const defaultJob = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 30_000 },
  removeOnComplete: { count: 2000 },
  removeOnFail: { count: 5000 },
};

const IN_FLIGHT = new Set(['waiting', 'delayed', 'active', 'paused', 'waiting-children']);

@Injectable()
export class SmsQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(SmsQueueService.name);
  private readonly prepare: Queue;
  private readonly bulk: Queue;
  private readonly normal: Queue;
  private readonly critical: Queue;
  private readonly callback: Queue;
  private readonly scheduled: Queue;

  constructor() {
    const connection = bullmqConnection();
    this.prepare = new Queue(SMS_QUEUES.PREPARE, { connection });
    this.bulk = new Queue(SMS_QUEUES.BULK, { connection });
    this.normal = new Queue(SMS_QUEUES.NORMAL, { connection });
    this.critical = new Queue(SMS_QUEUES.CRITICAL, { connection });
    this.callback = new Queue(SMS_QUEUES.CALLBACK, { connection });
    this.scheduled = new Queue(SMS_QUEUES.SCHEDULED, { connection });
  }

  async enqueuePrepare(campaignId: string, companyId: string) {
    await this.addOrReplace(this.prepare, SMS_JOB.PREPARE, { campaignId, companyId }, `prepare-${campaignId}`);
  }

  async enqueueSendBatch(input: {
    campaignId: string;
    companyId: string;
    batchId: string;
    priority?: 'bulk' | 'normal' | 'critical';
  }) {
    const queue =
      input.priority === 'critical'
        ? this.critical
        : input.priority === 'normal'
          ? this.normal
          : this.bulk;
    await this.addOrReplace(queue, SMS_JOB.SEND_BATCH, input, `send-${input.batchId}`);
  }

  async enqueueScheduled(campaignId: string, companyId: string, delayMs: number, actorId?: string) {
    await this.addOrReplace(
      this.scheduled,
      SMS_JOB.PREPARE,
      { campaignId, companyId, actorId, confirmAfterPrepare: true },
      `scheduled-${campaignId}`,
      { delay: Math.max(0, delayMs) },
    );
  }

  async enqueueCallback(payload: Record<string, unknown>) {
    await this.callback.add(SMS_JOB.CALLBACK, payload, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 5000 },
    });
  }

  async enqueueReconcile(campaignId: string) {
    await this.scheduled.add(
      SMS_JOB.RECONCILE,
      { campaignId },
      { jobId: `reconcile-${campaignId}-${Date.now()}`, attempts: 3 },
    );
  }

  async ensureStuckReconcileRepeat() {
    await this.scheduled.upsertJobScheduler(
      'sms-reconcile-stuck',
      { every: 60_000 },
      {
        name: SMS_JOB.RECONCILE,
        data: { all: true },
      },
    );
  }

  async pauseCampaignJobs(campaignId: string) {
    this.logger.log(`Campaign ${campaignId} cancel requested; workers honor cancelled status`);
  }

  async depth() {
    const queues = [this.prepare, this.bulk, this.normal, this.critical, this.callback, this.scheduled];
    const counts = await Promise.all(queues.map((queue) => queue.getJobCounts()));
    return {
      prepare: counts[0],
      bulk: counts[1],
      normal: counts[2],
      critical: counts[3],
      callback: counts[4],
      scheduled: counts[5],
    };
  }

  async onModuleDestroy() {
    await Promise.all([
      this.prepare.close(),
      this.bulk.close(),
      this.normal.close(),
      this.critical.close(),
      this.callback.close(),
      this.scheduled.close(),
    ]);
  }

  private async addOrReplace(
    queue: Queue,
    name: string,
    data: unknown,
    jobId: string,
    extra: Record<string, unknown> = {},
  ) {
    const safeId = jobId.replace(/:/g, '-');
    const existing = await queue.getJob(safeId);
    if (existing) {
      const state = await existing.getState();
      if (IN_FLIGHT.has(state)) return;
      await existing.remove();
    }
    await queue.add(name, data, { ...defaultJob, ...extra, jobId: safeId });
  }
}
