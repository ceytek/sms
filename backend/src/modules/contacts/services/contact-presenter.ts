import { formatTrMobile } from '../../../common/phone/normalize-tr-mobile.js';
import { Contact } from '../entities/contact.entity.js';
import { ContactGroup } from '../entities/contact-group.entity.js';
import { ContactTag } from '../entities/contact-tag.entity.js';
import { ContactCustomField } from '../entities/contact-custom-field.entity.js';

export function toContactDto(
  contact: Contact,
  groups: { id: string; name: string }[] = [],
  tags: { id: string; name: string }[] = [],
) {
  return {
    id: contact.id,
    firstName: contact.firstName ?? '',
    lastName: contact.lastName ?? '',
    mobilePhone: contact.mobilePhone,
    normalizedPhone: contact.normalizedPhone,
    formattedPhone: formatTrMobile(contact.normalizedPhone),
    email: contact.email ?? '',
    companyName: contact.companyName ?? '',
    sourceCompanyId: contact.sourceCompanyId ?? null,
    source: contact.source,
    status: contact.status,
    notes: contact.notes ?? '',
    customFields: contact.customFields ?? {},
    groups,
    tags,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
  };
}

export function toGroupDto(group: ContactGroup, memberCount = 0) {
  return {
    id: group.id,
    name: group.name,
    description: group.description ?? '',
    parentId: group.parentId ?? null,
    isActive: group.isActive,
    memberCount,
    createdAt: group.createdAt,
  };
}

export function toTagDto(tag: ContactTag, memberCount = 0) {
  return {
    id: tag.id,
    name: tag.name,
    isActive: tag.isActive,
    memberCount,
    createdAt: tag.createdAt,
  };
}

export function toCustomFieldDto(field: ContactCustomField) {
  return {
    id: field.id,
    name: field.name,
    fieldType: field.fieldType,
    sortOrder: field.sortOrder,
    isActive: field.isActive,
    createdAt: field.createdAt,
  };
}
