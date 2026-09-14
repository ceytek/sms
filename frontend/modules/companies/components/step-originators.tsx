"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { CompanyWizardData } from "../types";

interface StepOriginatorsProps {
  data: CompanyWizardData;
  onChange: (data: Partial<CompanyWizardData>) => void;
  isDealer?: boolean;
}

export function StepOriginators({ data, onChange, isDealer }: StepOriginatorsProps) {
  const addOriginator = () => {
    onChange({ originators: [...data.originators, ""] });
  };

  const updateOriginator = (index: number, value: string) => {
    const originators = [...data.originators];
    originators[index] = value;
    onChange({ originators });
  };

  const removeOriginator = (index: number) => {
    onChange({ originators: data.originators.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-slate-700">SMS Başlıkları (Originator)</h3>
          <p className="text-sm text-slate-500">Firma adına tanımlanacak SMS başlıklarını ekleyin. Her başlık en fazla 11 karakter olabilir.</p>
          {isDealer && (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Girdiğiniz başlıklar pasif olarak kaydedilir. Ana bayi onayından sonra aktif edilecektir; onay için ana bayi ile iletişime geçin.
            </p>
          )}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addOriginator}>
          <Plus className="mr-1 h-4 w-4" />
          Başlık Ekle
        </Button>
      </div>

      {data.originators.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-slate-200 p-8 text-center">
          <p className="text-sm text-slate-500">Henüz başlık eklenmedi.</p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={addOriginator}>
            <Plus className="mr-1 h-4 w-4" />
            İlk Başlığı Ekle
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {data.originators.map((originator, index) => (
            <div key={index} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-600">
                {index + 1}
              </div>
              <div className="flex-1">
                <Input
                  value={originator}
                  onChange={(e) => updateOriginator(index, e.target.value.toUpperCase())}
                  maxLength={11}
                  placeholder="FIRMAADI"
                  className="font-mono"
                />
              </div>
              <span className="text-xs text-slate-400">{originator.length}/11</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeOriginator(index)} className="text-red-500 hover:text-red-700">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
