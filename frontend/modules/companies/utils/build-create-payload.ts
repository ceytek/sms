import { CompanyWizardData, CreateCompanyDto } from "../types";

export function buildCreateCompanyPayload(data: CompanyWizardData): CreateCompanyDto {
  const payload: CreateCompanyDto = {
    companyType: data.companyType,
    name: data.name.trim(),
    isDealer: data.accountType === "DEALER",
  };

  if (data.taxOffice?.trim()) payload.taxOffice = data.taxOffice.trim();
  if (data.taxNumber?.trim()) payload.taxNumber = data.taxNumber.trim();
  if (data.nationalId?.trim()) payload.nationalId = data.nationalId.trim();
  if (data.birthDate) payload.birthDate = data.birthDate;
  if (data.serialNumber?.trim()) payload.serialNumber = data.serialNumber.trim();
  if (data.cityId) payload.cityId = data.cityId;
  if (data.districtId) payload.districtId = data.districtId;
  if (data.address?.trim()) payload.address = data.address.trim();
  if (data.phone?.trim()) payload.phone = data.phone.trim();
  if (data.mobile?.trim()) payload.mobile = data.mobile.trim();
  if (data.email?.trim()) payload.email = data.email.trim();
  if (data.customerType) payload.customerType = data.customerType;
  if (data.categoryId) payload.categoryId = data.categoryId;
  if (data.subcategoryId) payload.subcategoryId = data.subcategoryId;

  if (data.smsProviderId) {
    payload.smsAccounts = [{
      providerId: data.smsProviderId,
      isActive: true,
      applyToSubAccounts: false,
      noRouting: false,
    }];
  }

  const validOriginators = data.originators
    .map(name => name.trim())
    .filter(name => name.length > 0);
  if (validOriginators.length > 0) {
    payload.originators = validOriginators.map(name => ({ name }));
  }

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (data.priceListId && UUID_REGEX.test(data.priceListId)) {
    payload.priceListId = data.priceListId;
  }

  if (data.enabledServiceIds.length > 0) {
    payload.services = data.enabledServiceIds.map(serviceId => ({
      serviceId,
      isActive: true,
    }));
  }

  if (data.accountUsername?.trim()) payload.accountUsername = data.accountUsername.trim();
  if (data.accountPassword) payload.accountPassword = data.accountPassword;

  const validContacts = data.contacts.filter(c => c.name.trim().length > 0);
  if (validContacts.length > 0) {
    payload.contacts = validContacts.map(c => ({
      name: c.name.trim(),
      contactType: c.contactType,
      mobile: c.mobile?.trim() || undefined,
      phone: c.phone?.trim() || undefined,
      email: c.email?.trim() || undefined,
    }));
  }

  return payload;
}
