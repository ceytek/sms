"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

const STEPS = [
  { id: 1, label: "Firma Bilgileri" },
  { id: 2, label: "Yetkili Kişiler" },
  { id: 3, label: "SMS Sağlayıcı" },
  { id: 4, label: "Başlıklar" },
  { id: 5, label: "Kullanıcı Hesabı" },
  { id: 6, label: "Fiyat ve Hizmetler" },
  { id: 7, label: "Özet" },
];

interface WizardShellProps {
  currentStep: number;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  canProceed?: boolean;
  children: React.ReactNode;
}

export function WizardShell({
  currentStep,
  onNext,
  onBack,
  onSubmit,
  isSubmitting = false,
  canProceed = true,
  children,
}: WizardShellProps) {
  const isFirst = currentStep === 1;
  const isLast = currentStep === STEPS.length;

  return (
    <div className="space-y-8">
      {/* Step indicator */}
      <nav aria-label="Sihirbaz adımları">
        <ol className="flex flex-wrap items-center gap-2">
          {STEPS.map((step, index) => {
            const isCompleted = step.id < currentStep;
            const isCurrent = step.id === currentStep;

            return (
              <li key={step.id} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    isCompleted && "bg-blue-100 text-blue-700",
                    isCurrent && "bg-blue-600 text-white",
                    !isCompleted && !isCurrent && "bg-slate-100 text-slate-500"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                      isCompleted && "bg-blue-600 text-white",
                      isCurrent && "bg-white text-blue-600",
                      !isCompleted && !isCurrent && "bg-slate-300 text-slate-600"
                    )}
                  >
                    {isCompleted ? <Check className="h-3 w-3" /> : step.id}
                  </span>
                  <span className="hidden sm:inline">{step.label}</span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className="hidden h-px w-4 bg-slate-200 sm:block" />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step content */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold text-slate-900">
          {STEPS[currentStep - 1]?.label}
        </h2>
        {children}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isFirst || isSubmitting}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Geri
        </Button>

        {isLast ? (
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || !canProceed}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              "Firmayı Oluştur"
            )}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onNext}
            disabled={!canProceed}
            className="bg-blue-600 hover:bg-blue-700"
          >
            İleri
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
