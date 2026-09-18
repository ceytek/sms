"use client";

import { Label } from "@/components/ui/label";
import { CompanyWizardData } from "../types";
import { SmsProvider } from "../services/reference.service";
import { CreditRefundFields } from "./credit-refund-fields";

interface StepSmsProps {
  data: CompanyWizardData;
  onChange: (data: Partial<CompanyWizardData>) => void;
  providers: SmsProvider[];
}

export function StepSms({ data, onChange, providers }: StepSmsProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-slate-700">SMS Sağlayıcı</h3>
        <div className="space-y-2">
          <Label htmlFor="smsProvider">SMS Sağlayıcı *</Label>
          <select
            id="smsProvider"
            value={data.smsProviderId}
            onChange={(e) => onChange({ smsProviderId: e.target.value })}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Sağlayıcı seçin</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <CreditRefundFields
        enabled={data.enableCreditRefund}
        rate={data.creditRefundRate}
        onEnabledChange={(enableCreditRefund) => onChange({ enableCreditRefund })}
        onRateChange={(creditRefundRate) => onChange({ creditRefundRate })}
      />
    </div>
  );
}
