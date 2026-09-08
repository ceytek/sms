import { LoginForm } from "./login-form";
import {
  Send,
  Users,
  Sparkles,
  BarChart3,
  ShieldCheck,
  MessageSquare,
  CalendarHeart,
  BellRing,
} from "lucide-react";

export function LoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* Sol Panel - Marka Alanı */}
      <div className="hidden lg:flex lg:w-[55%] flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-12 text-white relative overflow-hidden">
        {/* Dekoratif arka plan */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-blue-500 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-blue-400 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600 blur-3xl" />
        </div>

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500">
              <Send className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Toplu SMS</h1>
              <p className="text-xs text-blue-300">Mesajınız Her Yerde.</p>
            </div>
          </div>

          {/* Slogan */}
          <div className="mb-12">
            <h2 className="text-4xl font-bold leading-tight tracking-tight">
              Daha Güçlü
              <br />
              İletişim,
              <br />
              <span className="text-blue-400">Daha Büyük</span>
              <br />
              <span className="text-blue-400">Fırsatlar.</span>
            </h2>
            <p className="mt-6 max-w-md text-base leading-relaxed text-slate-300">
              Müşterilerinize hızlı, güvenilir ve etkili şekilde ulaşın.
              Toplu SMS ile iletişiminizi bir üst seviyeye taşıyın.
            </p>
          </div>

          {/* Özellikler */}
          <div className="space-y-5">
            <FeatureItem
              icon={<MessageSquare className="h-5 w-5" />}
              title="Toplu SMS Gönderimi"
              description="Binlerce kişiye tek tıkla ulaşın."
            />
            <FeatureItem
              icon={<Sparkles className="h-5 w-5" />}
              title="AI Destekli Mesajlar"
              description="Profesyonel ve etkili içerikler oluşturun."
            />
            <FeatureItem
              icon={<BarChart3 className="h-5 w-5" />}
              title="Detaylı Raporlama"
              description="Tüm gönderimlerinizi anlık takip edin."
            />
            <FeatureItem
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Güvenli ve Stabil Altyapı"
              description="Kesintisiz ve güvenilir hizmet."
            />
          </div>
        </div>

        {/* Alt Bölüm - Kategoriler ve İstatistikler */}
        <div className="relative z-10">
          {/* Kategori Etiketleri */}
          <div className="mb-8 flex flex-wrap gap-3">
            <CategoryBadge icon={<Users className="h-3.5 w-3.5" />} label="Müşteriler" />
            <CategoryBadge icon={<Send className="h-3.5 w-3.5" />} label="Kampanyalar" />
            <CategoryBadge icon={<CalendarHeart className="h-3.5 w-3.5" />} label="Özel Günler" />
            <CategoryBadge icon={<BellRing className="h-3.5 w-3.5" />} label="Hatırlatmalar" />
          </div>

          {/* İstatistikler */}
          <div className="flex gap-12">
            <StatItem value="10M+" label="Aylık SMS" />
            <StatItem value="1.500+" label="Aktif Müşteri" />
            <StatItem value="%99.9" label="Sistem Uptime" />
          </div>
        </div>
      </div>

      {/* Sağ Panel - Login Formu */}
      <div className="flex w-full lg:w-[45%] flex-col items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-md">
          {/* Mobil Logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500">
              <Send className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Toplu SMS</h1>
              <p className="text-xs text-slate-500">Mesajınız Her Yerde.</p>
            </div>
          </div>

          {/* Hoşgeldin */}
          <div className="mb-8">
            <div className="mb-2 flex items-center gap-2">
              <Send className="h-6 w-6 text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              Tekrar Hoş Geldiniz
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Hesabınıza giriş yaparak kaldığınız yerden devam edin.
            </p>
          </div>

          {/* Login Form */}
          <LoginForm />

          {/* Footer */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
            <span>&copy; 2025 Toplu SMS. Tüm hakları saklıdır.</span>
            <span className="hidden sm:inline">|</span>
            <button type="button" className="hover:text-slate-600 transition-colors">
              Gizlilik Politikası
            </button>
            <span>|</span>
            <button type="button" className="hover:text-slate-600 transition-colors">
              Kullanım Şartları
            </button>
            <span>|</span>
            <button type="button" className="hover:text-slate-600 transition-colors">
              Destek
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-blue-300">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-white">{title}</h3>
        <p className="text-sm text-slate-400">{description}</p>
      </div>
    </div>
  );
}

function CategoryBadge({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-blue-200 backdrop-blur-sm">
      {icon}
      {label}
    </span>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}
