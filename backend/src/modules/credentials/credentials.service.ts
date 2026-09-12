import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { CompanyCredential } from './entities/company-credential.entity.js';
import { CredentialType } from '../../common/enums/credential-type.enum.js';

@Injectable()
export class CredentialsService {
  private readonly keyVersion = 1;

  constructor(
    @InjectRepository(CompanyCredential)
    private readonly credentialRepository: Repository<CompanyCredential>,
    private readonly configService: ConfigService,
  ) {}

  async store(
    companyId: string,
    credentialType: CredentialType,
    entityType: string,
    entityId: string,
    plainValue: string,
    manager?: EntityManager,
  ): Promise<CompanyCredential> {
    const repo = manager
      ? manager.getRepository(CompanyCredential)
      : this.credentialRepository;

    const encryptedValue = this.encrypt(plainValue);

    const existing = await repo.findOne({
      where: { companyId, credentialType, entityType, entityId },
    });

    if (existing) {
      existing.encryptedValue = encryptedValue;
      existing.keyVersion = this.keyVersion;
      return repo.save(existing);
    }

    const credential = repo.create({
      companyId,
      credentialType,
      entityType,
      entityId,
      encryptedValue,
      keyVersion: this.keyVersion,
    });

    return repo.save(credential);
  }

  async retrieve(
    companyId: string,
    credentialType: CredentialType,
    entityType: string,
    entityId: string,
    manager?: EntityManager,
  ): Promise<string | null> {
    const repo = manager
      ? manager.getRepository(CompanyCredential)
      : this.credentialRepository;

    const credential = await repo.findOne({
      where: { companyId, credentialType, entityType, entityId },
    });

    if (!credential) {
      return null;
    }

    return this.decrypt(credential.encryptedValue);
  }

  async delete(
    companyId: string,
    credentialType: CredentialType,
    entityType: string,
    entityId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager
      ? manager.getRepository(CompanyCredential)
      : this.credentialRepository;

    await repo.delete({ companyId, credentialType, entityType, entityId });
  }

  encrypt(plainText: string): string {
    const key = this.getEncryptionKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted.toString('base64'),
    ].join('.');
  }

  decrypt(encryptedPayload: string): string {
    const key = this.getEncryptionKey();
    const [ivB64, authTagB64, ciphertextB64] = encryptedPayload.split('.');

    if (!ivB64 || !authTagB64 || !ciphertextB64) {
      throw new InternalServerErrorException('Geçersiz şifreli veri formatı');
    }

    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const ciphertext = Buffer.from(ciphertextB64, 'base64');

    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  private getEncryptionKey(): Buffer {
    const rawKey = this.configService.get<string>('CREDENTIAL_ENCRYPTION_KEY');

    if (!rawKey) {
      throw new InternalServerErrorException(
        'CREDENTIAL_ENCRYPTION_KEY yapılandırılmamış',
      );
    }

    if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
      return Buffer.from(rawKey, 'hex');
    }

    const decoded = Buffer.from(rawKey, 'base64');
    if (decoded.length === 32) {
      return decoded;
    }

    throw new InternalServerErrorException(
      'CREDENTIAL_ENCRYPTION_KEY 32 bayt olmalı (hex veya base64)',
    );
  }
}
