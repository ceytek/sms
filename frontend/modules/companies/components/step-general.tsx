"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CompanyWizardData, COMPANY_TYPE_LABELS } from "../types";
import { City, District } from "../services/reference.service";
import { ClassificationFields } from "./classification-fields";

interface StepCompanyInfoProps {
  data: CompanyWizardData;
  onChange: (data: Partial<CompanyWizardData>) => void;
  cities: City[];
  districts: District[];
  onCityChange: (cityId: number | undefined) => void;
}

const isEmailValid = (email: string) => {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function StepGeneral({
  data,
  onChange,
  cities,
  districts,
  onCityChange,
}: StepCompanyInfoProps) {
  const isCorporate = data.companyType === "CORPORATE";

  return (
    <div className="space-y-6">
      {/* Company Type & Name */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="companyType">Firma Tipi</Label>
          <select
            id="companyType"
            value={data.companyType}
            onChange={(e) =>
              onChange({ companyType: e.target.value as CompanyWizardData["companyType"] })
            }
            className={selectClass}
          >
            {Object.entries(COMPANY_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Firma Adı *</Label>
          <Input
            id="name"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Firma adını girin"
          />
        </div>
      </div>

      <ClassificationFields
        value={{
          customerType: data.customerType,
          categoryId: data.categoryId,
          subcategoryId: data.subcategoryId,
        }}
        onChange={(patch) => onChange(patch)}
      />

      {/* Tax / Identity Info */}
      {isCorporate ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="taxOffice">Vergi Dairesi</Label>
            <Input
              id="taxOffice"
              value={data.taxOffice}
              onChange={(e) => onChange({ taxOffice: e.target.value })}
              placeholder="Vergi dairesi"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="taxNumber">Vergi Numarası</Label>
            <Input
              id="taxNumber"
              value={data.taxNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                onChange({ taxNumber: value });
              }}
              placeholder="10 haneli vergi no"
              maxLength={10}
            />
            {data.taxNumber && data.taxNumber.length !== 10 && (
              <p className="text-xs text-red-500">Vergi numarası 10 haneli olmalıdır</p>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="nationalId">TC Kimlik No</Label>
            <Input
              id="nationalId"
              value={data.nationalId}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                onChange({ nationalId: value });
              }}
              placeholder="11 haneli TC"
              maxLength={11}
            />
            {data.nationalId && data.nationalId.length !== 11 && (
              <p className="text-xs text-red-500">TC Kimlik No 11 haneli olmalıdır</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthDate">Doğum Tarihi</Label>
            <Input
              id="birthDate"
              type="date"
              value={data.birthDate}
              onChange={(e) => onChange({ birthDate: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="serialNumber">Seri No</Label>
            <Input
              id="serialNumber"
              value={data.serialNumber}
              onChange={(e) => onChange({ serialNumber: e.target.value })}
              placeholder="Kimlik seri no"
            />
          </div>
        </div>
      )}

      {/* Address Section */}
      <div className="space-y-4 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
        <h3 className="text-sm font-medium text-slate-700">Adres ve İletişim</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="city">İl</Label>
            <select
              id="city"
              value={data.cityId ? String(data.cityId) : ""}
              onChange={(e) => {
                const cityId = e.target.value ? Number(e.target.value) : undefined;
                onChange({ cityId, districtId: undefined });
                onCityChange(cityId);
              }}
              className={selectClass}
            >
              <option value="">İl seçin</option>
              {cities.map((city) => (
                <option key={city.id} value={String(city.id)}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="district">İlçe</Label>
            <select
              id="district"
              value={data.districtId ? String(data.districtId) : ""}
              onChange={(e) =>
                onChange({ districtId: e.target.value ? Number(e.target.value) : undefined })
              }
              disabled={!data.cityId}
              className={selectClass}
            >
              <option value="">İlçe seçin</option>
              {districts.map((district) => (
                <option key={district.id} value={String(district.id)}>
                  {district.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Adres</Label>
            <Textarea
              id="address"
              value={data.address}
              onChange={(e) => onChange({ address: e.target.value })}
              placeholder="Açık adres"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefon</Label>
            <Input
              id="phone"
              value={data.phone}
              onChange={(e) => {
                const value = e.target.value.replace(/[^\d\s\-\+\(\)]/g, "");
                onChange({ phone: value });
              }}
              placeholder="0212 xxx xx xx"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile">Cep Telefonu</Label>
            <Input
              id="mobile"
              value={data.mobile}
              onChange={(e) => {
                const value = e.target.value.replace(/[^\d\s\-\+\(\)]/g, "");
                onChange({ mobile: value });
              }}
              placeholder="05xx xxx xx xx"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="email">E-posta</Label>
            <Input
              id="email"
              type="email"
              value={data.email}
              onChange={(e) => onChange({ email: e.target.value })}
              placeholder="info@firma.com"
              className={data.email && !isEmailValid(data.email) ? "border-red-300" : ""}
            />
            {data.email && !isEmailValid(data.email) && (
              <p className="text-xs text-red-500">Geçerli bir e-posta adresi girin</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
