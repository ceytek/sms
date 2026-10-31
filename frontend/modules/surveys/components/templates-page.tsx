"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Box,
  CalendarRange,
  Clock3,
  FileText,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  Star,
  Tag,
  UserRound,
  Users,
} from "lucide-react";
import { surveyService, type SurveyTemplateCard } from "../services/survey.service";
import { QUESTION_TYPE_LABELS, type SurveyQuestionType } from "../types";

const CATEGORIES = ["Etkinlik", "Hizmet", "Müşteri Deneyimi", "İnsan Kaynakları", "Ürün"];
const ORDER = ["Etkinlik Sonrası", "Hizmet Değerlendirme", "Müşteri Memnuniyeti", "NPS", "Çalışan Memnuniyeti", "Ürün Memnuniyeti"];

const NAMED_ICONS: Record<string, { icon: typeof Star; wrap: string }> = {
  "Etkinlik Sonrası": { icon: CalendarRange, wrap: "bg-orange-50 text-orange-500" },
  "Hizmet Değerlendirme": { icon: Star, wrap: "bg-emerald-50 text-emerald-500" },
  "Müşteri Memnuniyeti": { icon: Users, wrap: "bg-rose-50 text-rose-500" },
  NPS: { icon: BarChart3, wrap: "bg-amber-50 text-amber-500" },
  "Çalışan Memnuniyeti": { icon: UserRound, wrap: "bg-blue-50 text-blue-600" },
  "Ürün Memnuniyeti": { icon: Box, wrap: "bg-violet-50 text-violet-600" },
};

const CATEGORY_ICONS: Record<string, { icon: typeof Star; wrap: string }> = {
  Etkinlik: NAMED_ICONS["Etkinlik Sonrası"],
  Hizmet: NAMED_ICONS["Hizmet Değerlendirme"],
  "Müşteri Deneyimi": NAMED_ICONS["Müşteri Memnuniyeti"],
  "İnsan Kaynakları": NAMED_ICONS["Çalışan Memnuniyeti"],
  Ürün: NAMED_ICONS["Ürün Memnuniyeti"],
};

type DraftQuestion = { type: SurveyQuestionType; text: string; required: boolean; options: string };

export function SurveyTemplatesPage() {
  const router = useRouter();
  const [items, setItems] = useState<SurveyTemplateCard[]>([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [menuId, setMenuId] = useState("");
  const [preview, setPreview] = useState<SurveyTemplateCard | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState("");
  const [draft, setDraft] = useState({ name: "", description: "", category: "Müşteri Deneyimi", questions: [emptyQuestion()] });

  const load = () => {
    surveyService.templates().then(setItems).catch((err) => setError(err instanceof Error ? err.message : "Şablonlar yüklenemedi"));
  };

  useEffect(() => { load(); }, []);

  const visible = useMemo(() => {
    const filtered = items.filter((item) => {
      if (category && item.category !== category) return false;
      if (query && !`${item.name} ${item.description}`.toLocaleLowerCase("tr-TR").includes(query.toLocaleLowerCase("tr-TR"))) return false;
      return true;
    });
    return filtered.sort((a, b) => {
      const left = ORDER.indexOf(a.name);
      const right = ORDER.indexOf(b.name);
      if (left === -1 && right === -1) return a.name.localeCompare(b.name, "tr");
      if (left === -1) return 1;
      if (right === -1) return -1;
      return left - right;
    });
  }, [items, query, category]);

  const useTemplate = (id: string) => {
    setBusy(id);
    setError("");
    surveyService.fromTemplate(id)
      .then((survey) => router.push(`/customer/surveys/${survey.id}`))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Şablon kullanılamadı");
        setBusy("");
      });
  };

  const remove = (item: SurveyTemplateCard) => {
    setMenuId("");
    if (!window.confirm(`“${item.name}” şablonu silinsin mi?`)) return;
    surveyService.removeTemplate(item.id)
      .then(load)
      .catch((err) => setError(err instanceof Error ? err.message : "Şablon silinemedi"));
  };

  const saveTemplate = () => {
    const questions = draft.questions
      .map((question, index) => ({
        type: question.type,
        text: question.text.trim(),
        required: question.required,
        position: index,
        options: question.options.split("\n").map((label) => label.trim()).filter(Boolean).map((label, optionIndex) => ({ label, position: optionIndex })),
      }))
      .filter((question) => question.text);
    if (draft.name.trim().length < 2) {
      setError("Şablon adı en az 2 karakter olmalı.");
      return;
    }
    if (!questions.length) {
      setError("En az bir soru yazın.");
      return;
    }
    setBusy("create");
    setError("");
    surveyService.createTemplate({
      name: draft.name.trim(),
      description: draft.description.trim(),
      category: draft.category,
      questions,
    }).then(() => {
      setCreating(false);
      setDraft({ name: "", description: "", category: "Müşteri Deneyimi", questions: [emptyQuestion()] });
      load();
    }).catch((err) => setError(err instanceof Error ? err.message : "Şablon kaydedilemedi"))
      .finally(() => setBusy(""));
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-8" onClick={() => setMenuId("")}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Şablonlar</h1>
          <p className="mt-1 text-sm text-slate-500">Hazır bir anketle başlayın veya sıfırdan oluşturun.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/customer/surveys/new" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
            <FileText className="h-4 w-4" /> Sıfırdan Başla
          </Link>
          <button type="button" onClick={() => setCreating(true)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Yeni Şablon Oluştur
          </button>
        </div>
      </div>

      {error && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="mb-4 flex flex-wrap gap-2">
        <label className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Şablon ara..." className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-400" />
        </label>
        <label className="relative min-w-52">
          <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-sm text-slate-700">
            <option value="">Tüm kategoriler</option>
            {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {visible.map((item) => {
          const visual = NAMED_ICONS[item.name] || CATEGORY_ICONS[item.category] || NAMED_ICONS["Hizmet Değerlendirme"];
          const Icon = visual.icon;
          return (
            <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${visual.wrap}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="font-semibold text-slate-900">{item.name}</h2>
                      <p className="mt-0.5 text-sm text-slate-500">{item.description}</p>
                    </div>
                    <div className="relative">
                      <button
                        type="button"
                        aria-label="Şablon işlemleri"
                        onClick={(event) => {
                          event.stopPropagation();
                          setMenuId(menuId === item.id ? "" : item.id);
                        }}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-50"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {menuId === item.id && (
                        <div className="absolute right-0 z-10 mt-1 w-36 rounded-xl border border-slate-200 bg-white p-1 text-sm shadow-lg" onClick={(event) => event.stopPropagation()}>
                          <button type="button" className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-50" onClick={() => { setMenuId(""); setPreview(item); }}>Önizle</button>
                          {!item.isSystem && (
                            <button type="button" className="block w-full rounded-lg px-3 py-2 text-left text-rose-600 hover:bg-rose-50" onClick={() => remove(item)}>Sil</button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1"><FileText className="h-3.5 w-3.5" /> {item.questionCount} soru</span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1"><Clock3 className="h-3.5 w-3.5" /> {item.minutes} dk</span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1"><Tag className="h-3.5 w-3.5" /> {item.category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setPreview(item)} className="h-9 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">Önizle</button>
                  <button type="button" disabled={busy === item.id} onClick={() => useTemplate(item.id)} className="inline-flex h-9 items-center gap-1 rounded-xl bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
                    Kullan <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
        {visible.length === 0 && <p className="col-span-full rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">Bu filtrede şablon yok.</p>}
      </div>

      {preview && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/30 p-4" onClick={() => setPreview(null)}>
          <div className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-900">{preview.name}</h2>
            <p className="mt-1 text-sm text-slate-500">{preview.description}</p>
            <ol className="mt-4 space-y-3">
              {preview.questions.map((question, index) => (
                <li key={`${question.text}-${index}`} className="rounded-xl bg-slate-50 px-3 py-2">
                  <p className="text-sm font-medium text-slate-800">{index + 1}. {question.text}</p>
                  <p className="mt-1 text-xs text-slate-400">{QUESTION_TYPE_LABELS[question.type as SurveyQuestionType] || question.type}{question.required ? " · Zorunlu" : ""}</p>
                  {!!question.options.length && <p className="mt-1 text-xs text-slate-500">{question.options.join(" · ")}</p>}
                </li>
              ))}
            </ol>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setPreview(null)} className="h-9 rounded-xl border border-slate-200 px-3 text-sm">Kapat</button>
              <button type="button" onClick={() => useTemplate(preview.id)} className="h-9 rounded-xl bg-blue-600 px-3 text-sm font-medium text-white">Kullan</button>
            </div>
          </div>
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/30 p-4" onClick={() => setCreating(false)}>
          <div className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-900">Yeni şablon</h2>
            <div className="mt-4 space-y-3">
              <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Şablon adı" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm" />
              <input value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Kısa açıklama" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm" />
              <select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm">
                {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              {draft.questions.map((question, index) => (
                <div key={index} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex gap-2">
                    <input value={question.text} onChange={(event) => updateQuestion(draft.questions, index, { text: event.target.value }, setDraft, draft)} placeholder={`${index + 1}. soru`} className="h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm" />
                    <select value={question.type} onChange={(event) => updateQuestion(draft.questions, index, { type: event.target.value as SurveyQuestionType }, setDraft, draft)} className="h-10 rounded-xl border border-slate-200 px-2 text-sm">
                      {(Object.keys(QUESTION_TYPE_LABELS) as SurveyQuestionType[]).map((type) => <option key={type} value={type}>{QUESTION_TYPE_LABELS[type]}</option>)}
                    </select>
                  </div>
                  {["SINGLE", "MULTI", "DROPDOWN", "YES_NO"].includes(question.type) && (
                    <textarea value={question.options} onChange={(event) => updateQuestion(draft.questions, index, { options: event.target.value }, setDraft, draft)} placeholder={"Seçenekler, her satıra bir tane"} className="mt-2 h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setDraft({ ...draft, questions: [...draft.questions, emptyQuestion()] })} className="text-sm font-medium text-blue-600">Soru ekle</button>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setCreating(false)} className="h-9 rounded-xl border border-slate-200 px-3 text-sm">Vazgeç</button>
              <button type="button" disabled={busy === "create"} onClick={saveTemplate} className="h-9 rounded-xl bg-blue-600 px-3 text-sm font-medium text-white disabled:opacity-60">Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function emptyQuestion(): DraftQuestion {
  return { type: "SINGLE", text: "", required: true, options: "" };
}

function updateQuestion(
  questions: DraftQuestion[],
  index: number,
  patch: Partial<DraftQuestion>,
  setDraft: (value: { name: string; description: string; category: string; questions: DraftQuestion[] }) => void,
  draft: { name: string; description: string; category: string; questions: DraftQuestion[] },
) {
  setDraft({
    ...draft,
    questions: questions.map((question, itemIndex) => itemIndex === index ? { ...question, ...patch } : question),
  });
}
