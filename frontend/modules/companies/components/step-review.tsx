"use client";

import { CompanyWizardData, COMPANY_TYPE_LABELS, CONTACT_TYPE_LABELS, CUSTOMER_TYPE_LABELS } from "../types";
import { PriceList, PRICE_LIST_TYPE_LABELS } from "@/modules/pricing";
import { SmsProvider, Service, City, District, DEFAULT_SERVICE_CODE, CustomerCategory, CustomerSubcategory } from "../services/reference.service";

interface StepReviewProps {
  data: CompanyWizardData;
  providers: SmsProvider[];
  services: Service[];
  priceLists: PriceList[];
  cities: City[];
  districts: District[];
  categories: CustomerCategory[];
  subcategories: CustomerSubcategory[];
}

function ReviewSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
        {title}
      </div>
      <div className="p-4 space-y-2 text-sm">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value?: string | number | boolean }) {
  if (value === undefined || value === "" || value === false) return null;
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900 text-right">
        {typeof value === "boolean" ? (value ? "Evet" : "Hayır") : value}
      </span>
    </div>
  );
}

export function StepReview({
  data,
  providers,
  services,
  priceLists,
  cities,
  districts,
  categories,
  subcategories,
}: StepReviewProps) {
  const provider = providers.find((p) => p.id === data.smsProviderId);
  const city = cities.find((c) => c.id === data.cityId);
  const district = districts.find((d) => d.id === data.districtId);
  const category = categories.find((item) => item.id === data.categoryId);
  const subcategory = subcategories.find((item) => item.id === data.subcategoryId);
  const priceList = priceLists.find((l) => l.id === data.priceListId);
  const enabledServices = services.filter(
    (s) => data.enabledServiceIds.includes(s.id) && s.code !== DEFAULT_SERVICE_CODE
  );
  const smsService = services.find((s) => s.code === DEFAULT_SERVICE_CODE);
  const validOriginators = data.originators.filter((o) => o.trim().length > 0);
  const validContacts = data.contacts.filter((c) => c.name.trim().length > 0);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Lütfen tüm bilgileri kontrol edin. Onayladığınızda firma oluşturulacaktır.
      </p>

      <ReviewSection title="Firma Bilgileri">
        <ReviewRow
          label="Hesap Türü"
          value={data.accountType === "DEALER" ? "Bayi" : "Müşteri"}
        />
        <ReviewRow label="Firma Tipi" value={COMPANY_TYPE_LABELS[data.companyType]} />
        <ReviewRow
          label="Müşteri Tipi"
          value={data.customerType ? CUSTOMER_TYPE_LABELS[data.customerType] : undefined}
        />
        <ReviewRow label="Ana Kategori" value={category?.name} />
        <ReviewRow label="Alt Kategori" value={subcategory?.name} />
        <ReviewRow label="Firma Adı" value={data.name} />
        {data.companyType === "CORPORATE" ? (
          <>
            <ReviewRow label="Vergi Dairesi" value={data.taxOffice} />
            <ReviewRow label="Vergi No" value={data.taxNumber} />
          </>
        ) : (
          <>
            <ReviewRow label="TC Kimlik No" value={data.nationalId} />
            <ReviewRow label="Doğum Tarihi" value={data.birthDate} />
            <ReviewRow label="Seri No" value={data.serialNumber} />
          </>
        )}
      </ReviewSection>

      <ReviewSection title="İletişim Bilgileri">
        <ReviewRow label="İl" value={city?.name} />
        <ReviewRow label="İlçe" value={district?.name} />
        <ReviewRow label="Adres" value={data.address} />
        <ReviewRow label="Telefon" value={data.phone} />
        <ReviewRow label="Cep" value={data.mobile} />
        <ReviewRow label="E-posta" value={data.email} />
      </ReviewSection>

      {validContacts.length > 0 && (
        <ReviewSection title="Yetkili Kişiler">
          {validContacts.map((contact, i) => (
            <div key={i} className="space-y-1">
              {i > 0 && <div className="my-2 border-t border-slate-100" />}
              <ReviewRow label="Ad Soyad" value={contact.name} />
              <ReviewRow label="Görev" value={CONTACT_TYPE_LABELS[contact.contactType]} />
              <ReviewRow label="Telefon" value={contact.phone} />
              <ReviewRow label="Cep" value={contact.mobile} />
              <ReviewRow label="E-posta" value={contact.email} />
            </div>
          ))}
        </ReviewSection>
      )}

      <ReviewSection title="SMS Sağlayıcı">
        <ReviewRow label="Sağlayıcı" value={provider?.name} />
        {validOriginators.length > 0 && (
          <>
            <ReviewRow label="Başlık Sayısı" value={validOriginators.length} />
            {validOriginators.map((name, i) => (
              <ReviewRow key={i} label={`Başlık ${i + 1}`} value={name} />
            ))}
          </>
        )}
      </ReviewSection>

      <ReviewSection title="Kullanıcı Hesabı">
        <ReviewRow label="Kullanıcı Adı" value={data.accountUsername} />
        <ReviewRow label="Şifre" value={data.accountPassword ? "*****" : undefined} />
      </ReviewSection>

      <ReviewSection title="Fiyat ve Hizmetler">
        {priceList ? (
          <>
            <ReviewRow label="Fiyat Listesi" value={priceList.name} />
            <ReviewRow
              label="Liste Tipi"
              value={PRICE_LIST_TYPE_LABELS[priceList.listType]}
            />
          </>
        ) : (
          <p className="text-xs text-slate-400">Fiyat listesi atanmadı</p>
        )}
        <div className="mt-2 flex flex-wrap gap-1">
          {(smsService ? [smsService, ...enabledServices] : enabledServices).map((s) => (
            <span
              key={s.id}
              className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700"
            >
              {s.name}
              {s.code === DEFAULT_SERVICE_CODE ? " (varsayılan)" : ""}
            </span>
          ))}
        </div>
      </ReviewSection>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Firma oluşturulduğunda otomatik kullanıcı hesabı oluşturulacaktır.
      </div>
    </div>
  );
}
