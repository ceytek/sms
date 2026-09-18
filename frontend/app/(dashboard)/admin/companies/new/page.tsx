"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authService } from "@/modules/auth";
import {
  WizardShell,
  StepGeneral,
  StepSms,
  StepPricing,
  StepReview,
  StepContacts,
  StepOriginators,
  StepUser,
  companyService,
  referenceService,
  defaultWizardData,
  CompanyWizardData,
  City,
  District,
  SmsProvider,
  Service,
  CustomerCategory,
  CustomerSubcategory,
} from "@/modules/companies";
import { GeneratedCredentials, WizardContact } from "@/modules/companies/types";
import { buildCreateCompanyPayload } from "@/modules/companies/utils/build-create-payload";
import { parseCreditRefundRate } from "@/modules/companies/utils/credit-refund";
import { pricingService, PriceList } from "@/modules/pricing";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Copy } from "lucide-react";

const TOTAL_STEPS = 7;

export default function NewCompanyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const user = authService.getUser();
  const isDealer = user?.role === "DEALER";

  const [step, setStep] = useState(1);
  const [unlockedStep, setUnlockedStep] = useState(1);
  const [data, setData] = useState<CompanyWizardData>({
    ...defaultWizardData,
    accountType: isDealer
      ? "CUSTOMER"
      : typeParam === "dealer"
        ? "DEALER"
        : "CUSTOMER",
  });
  const [credentials, setCredentials] = useState<GeneratedCredentials | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [providers, setProviders] = useState<SmsProvider[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [categories, setCategories] = useState<CustomerCategory[]>([]);
  const [subcategories, setSubcategories] = useState<CustomerSubcategory[]>([]);

  useEffect(() => {
    if (!user || (user.role !== "ADMIN" && user.role !== "DEALER")) {
      router.push("/");
      return;
    }
    if (user.role === "DEALER" && typeParam === "dealer") {
      router.push("/admin/companies/new?type=customer");
    }
  }, [router, user, typeParam]);

  useEffect(() => {
    async function loadReferenceData() {
      try {
        const [citiesData, providersData, servicesData, listsData, categoriesData] =
          await Promise.allSettled([
            referenceService.getCities(),
            referenceService.getSmsProviders(),
            referenceService.getServices(),
            pricingService.listPriceLists(),
            referenceService.getCustomerCategories(),
          ]);

        if (citiesData.status === "fulfilled") setCities(citiesData.value);
        if (providersData.status === "fulfilled") setProviders(providersData.value);
        if (servicesData.status === "fulfilled") setServices(servicesData.value);
        if (listsData.status === "fulfilled") setPriceLists(listsData.value);
        if (categoriesData.status === "fulfilled") setCategories(categoriesData.value);
      } catch {
        // Reference data optional for wizard display
      }
    }
    loadReferenceData();
  }, []);

  useEffect(() => {
    if (!data.categoryId) {
      setSubcategories([]);
      return;
    }
    referenceService
      .getCustomerSubcategories(data.categoryId)
      .then(setSubcategories)
      .catch(() => setSubcategories([]));
  }, [data.categoryId]);

  const handleCityChange = async (cityId: number | undefined) => {
    if (!cityId) {
      setDistricts([]);
      return;
    }
    try {
      const districtData = await referenceService.getDistricts(cityId);
      setDistricts(districtData);
    } catch {
      setDistricts([]);
    }
  };

  const updateData = (patch: Partial<CompanyWizardData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  };

  const updateContacts = (contacts: WizardContact[]) => {
    setData((prev) => ({ ...prev, contacts }));
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return data.name.trim().length > 0;
      case 2:
        return true;
      case 3:
        if (!data.smsProviderId) return false;
        if (!data.enableCreditRefund) return true;
        return parseCreditRefundRate(data.creditRefundRate) != null;
      case 4:
        return true;
      case 5:
        return data.accountUsername.length >= 3 && data.accountPassword.length >= 6;
      case 6:
        return true;
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError("");
    try {
      const result = await companyService.create(buildCreateCompanyPayload(data));
      if (result.generatedCredentials) {
        setCredentials(result.generatedCredentials);
      } else {
        router.push(`/admin/companies/${result.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Firma oluşturulamadı");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    if (!credentials) return;
    const text = [
      `Firma Kodu: ${credentials.companyCode}`,
      `Kullanıcı Adı: ${credentials.username}`,
      `Şifre: ${credentials.password}`,
      `Rol: ${credentials.role === "DEALER" ? "Bayi" : "Müşteri"}`,
    ].join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pageTitle = data.accountType === "DEALER" ? "Yeni Bayi Oluştur" : "Yeni Müşteri Oluştur";

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6">
        <Link href="/admin/companies">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Firma Listesine Dön
          </Button>
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">{pageTitle}</h1>
        <p className="mt-1 text-sm text-slate-500">
          7 adımlı sihirbaz ile firma kaydını tamamlayın
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <WizardShell
        currentStep={step}
        unlockedStep={unlockedStep}
        onNext={() => {
          const next = Math.min(step + 1, TOTAL_STEPS);
          setStep(next);
          setUnlockedStep((current) => Math.max(current, next));
        }}
        onBack={() => setStep((s) => Math.max(s - 1, 1))}
        onStepSelect={(target) => {
          if (target <= unlockedStep) setStep(target);
        }}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        canProceed={canProceed()}
      >
        {step === 1 && (
          <StepGeneral
            data={data}
            onChange={updateData}
            cities={cities}
            districts={districts}
            onCityChange={handleCityChange}
          />
        )}
        {step === 2 && (
          <StepContacts contacts={data.contacts} onChange={updateContacts} />
        )}
        {step === 3 && (
          <StepSms data={data} onChange={updateData} providers={providers} />
        )}
        {step === 4 && (
          <StepOriginators data={data} onChange={updateData} isDealer={isDealer} />
        )}
        {step === 5 && (
          <StepUser data={data} onChange={updateData} />
        )}
        {step === 6 && (
          <StepPricing
            data={data}
            onChange={updateData}
            priceLists={priceLists}
            services={services}
          />
        )}
        {step === 7 && (
          <StepReview
            data={data}
            providers={providers}
            services={services}
            priceLists={priceLists}
            cities={cities}
            districts={districts}
            categories={categories}
            subcategories={subcategories}
          />
        )}
      </WizardShell>

      {/* Success Credentials Modal */}
      {credentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                <Check className="h-5 w-5 text-emerald-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                Firma Başarıyla Oluşturuldu
              </h2>
            </div>

            <p className="mb-4 text-sm text-slate-600">
              Aşağıdaki giriş bilgilerini kaydedin. Şifre bir daha gösterilmeyecektir.
            </p>

            <div className="space-y-3 rounded-lg bg-slate-50 p-4">
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Firma Kodu</span>
                <span className="font-mono font-medium">{credentials.companyCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Kullanıcı Adı</span>
                <span className="font-mono font-medium">{credentials.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Şifre</span>
                <span className="font-mono font-medium">{credentials.password}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Rol</span>
                <span className="font-medium">
                  {credentials.role === "DEALER" ? "Bayi" : "Müşteri"}
                </span>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={copyToClipboard} className="flex-1">
                <Copy className="mr-2 h-4 w-4" />
                {copied ? "Kopyalandı!" : "Kopyala"}
              </Button>
              <Button
                onClick={() => router.push("/admin/companies")}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Firma Listesine Git
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
