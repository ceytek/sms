import { formatTrMobile } from '../../../common/phone/normalize-tr-mobile.js';
import { KvkkConsent } from '../entities/kvkk-consent.entity.js';
import { KvkkForm } from '../entities/kvkk-form.entity.js';
import { KvkkQrCode } from '../entities/kvkk-qr-code.entity.js';
import { KvkkSetting } from '../entities/kvkk-setting.entity.js';
import { KvkkTextDocument } from '../entities/kvkk-text-document.entity.js';
import { KvkkTextVersion } from '../entities/kvkk-text-version.entity.js';

export function toPublicLogoPath(ownerCompanyId: string, logoUrl?: string | null) {
  if (!logoUrl) return '';
  if (/^https?:\/\//i.test(logoUrl)) return logoUrl;
  return `/public/kvkk/branding/${ownerCompanyId}/logo`;
}

export function toSettingDto(setting: KvkkSetting) {
  return {
    smsConsentCheckEnabled: setting.smsConsentCheckEnabled,
    companyDisplayName: setting.companyDisplayName ?? '',
    logoUrl: toPublicLogoPath(setting.ownerCompanyId, setting.logoUrl),
    contactInfo: setting.contactInfo ?? '',
    updatedAt: setting.updatedAt?.toISOString() ?? null,
  };
}

export function toTextDocumentDto(document: KvkkTextDocument, versions: KvkkTextVersion[] = []) {
  const current = versions.find((item) => item.isCurrent) ?? versions[0];
  return {
    id: document.id,
    name: document.name,
    isActive: document.isActive,
    currentVersion: current ? toTextVersionDto(current) : null,
    versions: versions
      .slice()
      .sort((a, b) => b.version - a.version)
      .map((item) => toTextVersionDto(item)),
    createdAt: document.createdAt,
  };
}

export function toTextVersionDto(version: KvkkTextVersion) {
  return {
    id: version.id,
    version: version.version,
    title: version.title,
    bodyHtml: version.bodyHtml,
    isCurrent: version.isCurrent,
    createdAt: version.createdAt,
  };
}

export function toFormDto(form: KvkkForm) {
  return {
    id: form.id,
    name: form.name,
    description: form.description ?? '',
    title: form.title,
    subtitle: form.subtitle ?? '',
    logoUrl: form.logoUrl ?? '',
    companyDisplayName: form.companyDisplayName ?? '',
    contactInfo: form.contactInfo ?? '',
    textDocumentId: form.textDocumentId ?? null,
    fields: form.fields ?? ['firstName', 'lastName', 'phone', 'email'],
    isActive: form.isActive,
    checkboxes: [...(form.checkboxes ?? [])]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => ({
        id: item.id,
        label: item.label,
        isRequired: item.isRequired,
        isActive: item.isActive,
        sortOrder: item.sortOrder,
      })),
    createdAt: form.createdAt,
  };
}

export function toQrDto(qr: KvkkQrCode, publicUrl: string) {
  return {
    id: qr.id,
    name: qr.name,
    description: qr.description ?? '',
    formId: qr.formId,
    formName: qr.form?.name,
    token: qr.token,
    publicUrl,
    isActive: qr.isActive,
    expiresAt: qr.expiresAt ?? null,
    createdAt: qr.createdAt,
  };
}

export function toConsentListDto(consent: KvkkConsent) {
  return {
    id: consent.id,
    firstName: consent.firstName ?? '',
    lastName: consent.lastName ?? '',
    mobilePhone: consent.mobilePhone,
    formattedPhone: formatTrMobile(consent.normalizedPhone),
    email: consent.email ?? '',
    status: consent.status,
    method: consent.method,
    formName: consent.formNameSnapshot ?? consent.form?.name ?? '',
    textVersionNumber: consent.textVersionNumber ?? null,
    approvedAt: consent.approvedAt ?? null,
    createdAt: consent.createdAt,
  };
}

export function toConsentDetailDto(consent: KvkkConsent) {
  return {
    ...toConsentListDto(consent),
    formId: consent.formId ?? null,
    textVersionId: consent.textVersionId ?? null,
    textTitle: consent.textTitleSnapshot ?? '',
    textBody: consent.textBodySnapshot ?? '',
    checkboxAnswers: consent.checkboxAnswers ?? [],
    formPayload: consent.formPayload ?? {},
    qrId: consent.qrId ?? null,
    qrName: consent.qr?.name ?? null,
    otpChallengeId: consent.otpChallengeId ?? null,
    formLinkId: consent.formLinkId ?? null,
    cancelledAt: consent.cancelledAt ?? null,
    cancelledBy: consent.cancelledBy ?? null,
    cancelSource: consent.cancelSource ?? null,
  };
}
