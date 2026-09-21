import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../companies/entities/company.entity.js';
import { User } from '../auth/entities/user.entity.js';
import { Role } from '../../common/enums/role.enum.js';
import { NotificationPurpose } from '../../common/enums/notification-purpose.enum.js';
import { NotificationChannel } from '../../common/enums/notification-channel.enum.js';
import { NotificationDispatchStatus } from '../../common/enums/notification-dispatch-status.enum.js';
import { normalizeTrMobile } from '../../common/phone/normalize-tr-mobile.js';
import { NotificationDispatch } from './entities/notification-dispatch.entity.js';
import { SendAccountCredentialsDto } from './dto/send-account-credentials.dto.js';
import { OriginatorsService } from '../originators/originators.service.js';
import {
  EMAIL_NOTIFICATION_PROVIDER,
  SMS_NOTIFICATION_PROVIDER,
  type EmailNotificationProvider,
  type SmsNotificationProvider,
} from './providers/notification-provider.types.js';
import {
  accountCredentialsEmail,
  accountCredentialsSms,
} from './templates/account-credentials.template.js';

type Actor = { id: string; role: string; companyId: string };

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(NotificationDispatch)
    private readonly dispatchRepository: Repository<NotificationDispatch>,
    @Inject(SMS_NOTIFICATION_PROVIDER)
    private readonly smsProvider: SmsNotificationProvider,
    @Inject(EMAIL_NOTIFICATION_PROVIDER)
    private readonly emailProvider: EmailNotificationProvider,
    private readonly originatorsService: OriginatorsService,
  ) {}

  async credentialsNotifyStatus(actor: Actor) {
    const canSendSms = await this.originatorsService.hasActiveForCompany(actor.companyId);
    return {
      canSendSms,
      smsDisabledReason: canSendSms
        ? null
        : 'SMS göndermek için aktif bir originatör gerekli',
    };
  }

  async sendAccountCredentials(dto: SendAccountCredentialsDto, actor: Actor) {
    const company = await this.companyRepository.findOne({
      where: { id: dto.companyId },
      relations: ['contacts'],
    });
    if (!company) {
      throw new NotFoundException('Firma bulunamadı');
    }
    this.assertCanNotify(actor, company);

    if (dto.channel === NotificationChannel.SMS) {
      const canSendSms = await this.originatorsService.hasActiveForCompany(actor.companyId);
      if (!canSendSms) {
        throw new BadRequestException('SMS göndermek için aktif bir originatör gerekli');
      }
    }

    const account = await this.userRepository.findOne({
      where: { companyId: company.id, isActive: true },
      order: { createdAt: 'ASC' },
    });
    if (!account) {
      throw new BadRequestException('Bu firma için kullanıcı hesabı bulunamadı');
    }

    const content = {
      companyName: company.name,
      companyCode: company.companyCode,
      username: account.username,
      password: dto.password,
    };

    if (dto.channel === NotificationChannel.SMS) {
      const to = this.resolveMobile(company);
      if (!to) {
        throw new BadRequestException('Firma kaydında geçerli bir cep telefonu yok');
      }
      try {
        const result = await this.smsProvider.send({
          to,
          body: accountCredentialsSms(content),
          purpose: NotificationPurpose.ACCOUNT_CREDENTIALS,
          senderCompanyId: actor.companyId,
          targetCompanyId: company.id,
        });
        await this.saveDispatch({
          actor,
          company,
          channel: NotificationChannel.SMS,
          recipient: to,
          status: NotificationDispatchStatus.MOCK_SENT,
          providerName: result.provider,
          providerMessageId: result.messageId,
        });
        return {
          channel: NotificationChannel.SMS,
          status: NotificationDispatchStatus.MOCK_SENT,
          recipient: to,
          mock: result.mock,
          message: `Giriş bilgileri SMS olarak gönderildi (simülasyon): ${to}`,
        };
      } catch (error) {
        await this.saveDispatch({
          actor,
          company,
          channel: NotificationChannel.SMS,
          recipient: to,
          status: NotificationDispatchStatus.FAILED,
          providerName: 'MOCK_SMS',
          errorMessage: error instanceof Error ? error.message : 'SMS gönderilemedi',
        });
        throw new BadRequestException('SMS gönderilemedi');
      }
    }

    const to = this.resolveEmail(company);
    if (!to) {
      throw new BadRequestException('Firma kaydında geçerli bir e-posta yok');
    }
    const email = accountCredentialsEmail(content);
    try {
      const result = await this.emailProvider.send({
        to,
        subject: email.subject,
        body: email.body,
        purpose: NotificationPurpose.ACCOUNT_CREDENTIALS,
        senderCompanyId: actor.companyId,
        targetCompanyId: company.id,
      });
      await this.saveDispatch({
        actor,
        company,
        channel: NotificationChannel.EMAIL,
        recipient: to,
        status: NotificationDispatchStatus.MOCK_SENT,
        providerName: result.provider,
        providerMessageId: result.messageId,
      });
      return {
        channel: NotificationChannel.EMAIL,
        status: NotificationDispatchStatus.MOCK_SENT,
        recipient: to,
        mock: result.mock,
        message: `Giriş bilgileri e-posta olarak gönderildi (simülasyon): ${to}`,
      };
    } catch (error) {
      await this.saveDispatch({
        actor,
        company,
        channel: NotificationChannel.EMAIL,
        recipient: to,
        status: NotificationDispatchStatus.FAILED,
        providerName: 'MOCK_EMAIL',
        errorMessage: error instanceof Error ? error.message : 'E-posta gönderilemedi',
      });
      throw new BadRequestException('E-posta gönderilemedi');
    }
  }

  private assertCanNotify(actor: Actor, company: Company) {
    if (company.companyCode === 'ADMIN' || company.id === actor.companyId) {
      throw new ForbiddenException('Bu firmaya bilgilendirme gönderilemez');
    }
    if (actor.role === Role.ADMIN) {
      return;
    }
    if (actor.role === Role.DEALER) {
      const ownsCustomer = company.dealerCompanyId === actor.companyId;
      const ownsSubDealer = company.parentCompanyId === actor.companyId;
      if (ownsCustomer || ownsSubDealer) {
        return;
      }
    }
    throw new ForbiddenException('Bu firmaya bilgilendirme gönderemezsiniz');
  }

  private resolveMobile(company: Company) {
    const candidates = [
      company.mobile,
      company.phone,
      ...(company.contacts ?? []).flatMap((contact) => [contact.mobile, contact.phone]),
    ];
    for (const value of candidates) {
      const normalized = normalizeTrMobile(value);
      if (normalized) return normalized;
    }
    return null;
  }

  private resolveEmail(company: Company) {
    const candidates = [company.email, ...(company.contacts ?? []).map((contact) => contact.email)];
    for (const value of candidates) {
      const email = value?.trim();
      if (email && email.includes('@')) return email;
    }
    return null;
  }

  private saveDispatch(input: {
    actor: Actor;
    company: Company;
    channel: NotificationChannel;
    recipient: string;
    status: NotificationDispatchStatus;
    providerName: string;
    providerMessageId?: string;
    errorMessage?: string;
  }) {
    return this.dispatchRepository.save(
      this.dispatchRepository.create({
        senderCompanyId: input.actor.companyId,
        targetCompanyId: input.company.id,
        purpose: NotificationPurpose.ACCOUNT_CREDENTIALS,
        channel: input.channel,
        recipient: input.recipient,
        status: input.status,
        providerName: input.providerName,
        providerMessageId: input.providerMessageId,
        errorMessage: input.errorMessage,
        createdBy: input.actor.id,
      }),
    );
  }
}
