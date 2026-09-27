export const SMS_QUEUES = {
  PREPARE: 'sms-prepare',
  BULK: 'sms-bulk',
  NORMAL: 'sms-normal',
  CRITICAL: 'sms-critical',
  CALLBACK: 'sms-callback',
  SCHEDULED: 'sms-scheduled',
} as const;

export type SmsQueueName = (typeof SMS_QUEUES)[keyof typeof SMS_QUEUES];

export const SMS_JOB = {
  PREPARE: 'prepare-campaign',
  SEND_BATCH: 'send-batch',
  CALLBACK: 'handle-callback',
  RECONCILE: 'reconcile-campaign',
} as const;
