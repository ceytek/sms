import { createHash } from 'crypto';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KvkkOtpChallenge } from '../entities/kvkk-otp-challenge.entity.js';
import { KvkkConsent } from '../entities/kvkk-consent.entity.js';
import { SendKvkkOtpDto, VerifyKvkkOtpDto } from '../dto/otp.dto.js';
import { KvkkAccessService, type KvkkActor } from './kvkk-access.service.js';
import { SHORT_CODE_PROVIDER, type ShortCodeProvider } from '../providers/short-code.provider.js';
import { KvkkOtpStatus } from '../../../common/enums/kvkk-otp-status.enum.js';
import { KvkkConsentMethod } from '../../../common/enums/kvkk-consent-method.enum.js';
import { KvkkConsentStatus } from '../../../common/enums/kvkk-consent-status.enum.js';
import { toConsentDetailDto } from './kvkk-presenter.js';

@Injectable()
export class KvkkOtpService {
  constructor(
    @InjectRepository(KvkkOtpChallenge)
    private readonly challengeRepository: Repository<KvkkOtpChallenge>,
    @InjectRepository(KvkkConsent)
    private readonly consentRepository: Repository<KvkkConsent>,
    private readonly access: KvkkAccessService,
    @Inject(SHORT_CODE_PROVIDER)
    private readonly shortCodeProvider: ShortCodeProvider,
  ) {}

  async send(dto: SendKvkkOtpDto, actor: KvkkActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    const phone = this.access.requirePhone(dto.mobilePhone);
    await this.challengeRepository.update(
      { ownerCompanyId, normalizedPhone: phone.normalizedPhone, status: KvkkOtpStatus.SENT },
      { status: KvkkOtpStatus.EXPIRED },
    );
    const sent = await this.shortCodeProvider.send(phone.normalizedPhone);
    const consent = await this.consentRepository.save(
      this.consentRepository.create({
        ownerCompanyId,
        firstName: dto.firstName?.trim(),
        lastName: dto.lastName?.trim(),
        mobilePhone: phone.mobilePhone,
        normalizedPhone: phone.normalizedPhone,
        status: KvkkConsentStatus.PENDING,
        method: KvkkConsentMethod.SHORT_CODE,
        createdBy: actor.id,
      }),
    );
    const challenge = await this.challengeRepository.save(
      this.challengeRepository.create({
        ownerCompanyId,
        consentId: consent.id,
        mobilePhone: phone.mobilePhone,
        normalizedPhone: phone.normalizedPhone,
        codeHash: hashCode(sent.code),
        providerRef: sent.providerRef,
        status: KvkkOtpStatus.SENT,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        createdBy: actor.id,
      }),
    );
    consent.otpChallengeId = challenge.id;
    await this.consentRepository.save(consent);
    return {
      challengeId: challenge.id,
      consentId: consent.id,
      expiresAt: challenge.expiresAt,
      providerRef: challenge.providerRef,
      debugCode: process.env.NODE_ENV === 'production' ? undefined : sent.code,
    };
  }

  async verify(dto: VerifyKvkkOtpDto, actor: KvkkActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    const challenge = await this.challengeRepository.findOne({
      where: { id: dto.challengeId, ownerCompanyId },
    });
    if (!challenge) throw new NotFoundException('Doğrulama kaydı bulunamadı');
    if (challenge.status !== KvkkOtpStatus.SENT) {
      throw new BadRequestException('Bu kod artık kullanılamaz');
    }
    if (challenge.expiresAt.getTime() < Date.now()) {
      challenge.status = KvkkOtpStatus.EXPIRED;
      await this.challengeRepository.save(challenge);
      throw new BadRequestException('Kodun süresi doldu');
    }
    if (hashCode(dto.code.trim()) !== challenge.codeHash) {
      challenge.status = KvkkOtpStatus.FAILED;
      await this.challengeRepository.save(challenge);
      throw new BadRequestException('Doğrulama kodu hatalı');
    }
    challenge.status = KvkkOtpStatus.VERIFIED;
    challenge.verifiedAt = new Date();
    await this.challengeRepository.save(challenge);
    const consent = await this.consentRepository.findOne({ where: { id: challenge.consentId } });
    if (!consent) throw new NotFoundException('İzin kaydı bulunamadı');
    consent.status = KvkkConsentStatus.APPROVED;
    consent.approvedAt = new Date();
    await this.consentRepository.save(consent);
    return toConsentDetailDto(consent);
  }
}

function hashCode(code: string) {
  return createHash('sha256').update(code).digest('hex');
}
