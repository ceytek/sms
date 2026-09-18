"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CompanyWizardData } from "../types";
import { PriceList, PRICE_LIST_TYPE_LABELS } from "@/modules/pricing";
import { Service, DEFAULT_SERVICE_CODE } from "../services/reference.service";

interface StepPricingServicesProps {
  data: CompanyWizardData;
  onChange: (data: Partial<CompanyWizardData>) => void;
  priceLists: PriceList[];
  services: Service[];
}

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function StepPricing({
  data,
  onChange,
  priceLists,
  services,
}: StepPricingServicesProps) {
  const filteredLists = priceLists.filter((list) => {
    if (data.accountType === "DEALER" && list.listType === "DEALER") return true;
    if (data.accountType === "CUSTOMER" && list.listType === "CUSTOMER") return true;
    return false;
  });

  const selectedList = priceLists.find((l) => l.id === data.priceListId);
  const optionalServices = services.filter((s) => s.code !== DEFAULT_SERVICE_CODE);

  const toggleService = (serviceId: string) => {
    const enabled = data.enabledServiceIds.includes(serviceId);
    onChange({
      enabledServiceIds: enabled
        ? data.enabledServiceIds.filter((id) => id !== serviceId)
        : [...data.enabledServiceIds, serviceId],
    });
  };

  return (
    <div className="space-y-8">
      {/* Price List Selection */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-slate-700">Fiyat Listesi</h3>
        <p className="text-sm text-slate-500">
          Firmaya atanacak fiyat listesini seçin. Fiyat listesi, SMS ve AI kontör
          birim fiyatlarını belirler.
        </p>

        <div className="space-y-2">
          <Label>Fiyat Listesi</Label>
          <select
            value={data.priceListId}
            onChange={(e) => onChange({ priceListId: e.target.value })}
            className={selectClass}
          >
            <option value="">Fiyat listesi seçin (opsiyonel)</option>
            {filteredLists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name} ({PRICE_LIST_TYPE_LABELS[list.listType]})
              </option>
            ))}
          </select>
        </div>

        {selectedList && selectedList.items && selectedList.items.length > 0 && (
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
              Seçili Liste Önizleme
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-white">
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Ürün</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600">
                    Birim Fiyat ({selectedList.currency})
                  </th>
                </tr>
              </thead>
              <tbody>
                {selectedList.items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="px-4 py-2 text-slate-900">
                      {item.productName ?? item.productCode}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-700">
                      {item.unitPrice.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Services */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-slate-700">Hizmet Yetkileri</h3>
        <p className="text-sm text-slate-500">
          Firmaya tanımlanacak ek hizmetleri seçin. SMS tüm firmalarda zorunlu ve kapatılamaz.
          KVKK / İzin Yönetimi isteğe bağlıdır.
        </p>

        {optionalServices.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
            Hizmet listesi yüklenemedi.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {optionalServices.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 p-4"
              >
                <div>
                  <p className="font-medium text-slate-900">{service.name}</p>
                  {service.description && (
                    <p className="text-xs text-slate-500">{service.description}</p>
                  )}
                </div>
                <Switch
                  checked={data.enabledServiceIds.includes(service.id)}
                  onCheckedChange={() => toggleService(service.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
