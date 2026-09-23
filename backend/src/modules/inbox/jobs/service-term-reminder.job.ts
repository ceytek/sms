import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { InboxEventType } from '../../../common/enums/inbox-event-type.enum.js';
import { CompanyServiceTerm } from '../../companies/entities/company-service-term.entity.js';
import { addDays, daysUntil, todayDateOnly, toDateOnly } from '../../companies/service-term.js';
import { InboxService } from '../inbox.service.js';

const REMIND_DAYS = 15;
const FIRST_RUN_MS = 20_000;
const INTERVAL_MS = 6 * 60 * 60 * 1000;

@Injectable()
export class ServiceTermReminderJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ServiceTermReminderJob.name);
  private timeout?: ReturnType<typeof setTimeout>;
  private interval?: ReturnType<typeof setInterval>;

  constructor(
    @InjectRepository(CompanyServiceTerm)
    private readonly termRepository: Repository<CompanyServiceTerm>,
    private readonly inboxService: InboxService,
  ) {}

  onModuleInit() {
    this.timeout = setTimeout(() => {
      void this.run();
      this.interval = setInterval(() => void this.run(), INTERVAL_MS);
    }, FIRST_RUN_MS);
  }

  onModuleDestroy() {
    if (this.timeout) clearTimeout(this.timeout);
    if (this.interval) clearInterval(this.interval);
  }

  async run() {
    const today = todayDateOnly();
    const until = addDays(today, REMIND_DAYS);
    const terms = await this.termRepository.find({
      where: {
        isCurrent: true,
        expiryReminderSentAt: IsNull(),
      },
      relations: ['company', 'service', 'companyService'],
    });

    let sent = 0;
    for (const term of terms) {
      if (!term.companyService?.isActive) continue;
      const expiresAt = toDateOnly(term.expiresAt);
      if (expiresAt < today || expiresAt > until) continue;
      try {
        const result = await this.inboxService.publish({
          type: InboxEventType.SERVICE_TERM_EXPIRING,
          payload: {
            termId: term.id,
            serviceId: term.serviceId,
            serviceName: term.service?.name,
            serviceCode: term.service?.code,
            ownerCompanyId: term.companyId,
            ownerIsDealer: term.company?.isDealer ?? false,
            customerName: term.company?.name,
            customerCode: term.company?.companyCode,
            dealerCompanyId: term.company?.dealerCompanyId,
            startsYear: term.startsYear,
            expiresAt,
            daysLeft: daysUntil(expiresAt, today),
          },
        });
        if (!result.created) continue;
        term.expiryReminderSentAt = new Date();
        await this.termRepository.save(term);
        sent += 1;
      } catch (error) {
        this.logger.warn(
          `Vade bildirimi gönderilemedi (${term.id}): ${
            error instanceof Error ? error.message : 'bilinmeyen hata'
          }`,
        );
      }
    }

    if (sent) {
      this.logger.log(`${sent} hizmet vade uyarısı gönderildi`);
    }
  }
}
