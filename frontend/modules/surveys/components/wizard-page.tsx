"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { contactGroupsService } from "@/modules/contacts/services/groups.service";
import { contactTagsService } from "@/modules/contacts/services/tags.service";
import { contactsService } from "@/modules/contacts/services/contacts.service";
import { analyzeSms } from "@/modules/messaging/sms-text";
import { smsSendService } from "@/modules/messaging/services/sms-send.service";
import { surveyService } from "../services/survey.service";
import { QUESTION_TYPE_LABELS, type SurveyQuestion, type SurveyQuestionType, type SurveyRecord, type SurveySource } from "../types";

const STEPS = ["Genel Bilgiler", "Sorular", "Anket Ayarları", "Dağıtım", "Önizleme", "Yayınla"];

function questionProblems(questions: SurveyQuestion[]) {
  const emptyText = questions.flatMap((question, index) => (question.text.trim() ? [] : [index + 1]));
  const emptyOptions = questions.flatMap((question, index) =>
    CHOICE.has(question.type)
      ? question.options.flatMap((option, optionIndex) => (option.label.trim() ? [] : [`${index + 1}. sorunun ${optionIndex + 1}. seçeneği`]))
      : [],
  );
  if (emptyText.length === 1) return `${emptyText[0]}. sorunun metnini yazın.`;
  if (emptyText.length > 1) return `${joinNumbers(emptyText)}. soruların metnini yazın.`;
  if (emptyOptions.length) return `${emptyOptions.join(", ")} boş bırakılamaz.`;
  return "";
}

function joinNumbers(values: number[]) {
  const labels = values.map(String);
  if (labels.length === 2) return `${labels[0]} ve ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} ve ${labels[labels.length - 1]}`;
}

function normalizeQuestion(question: SurveyQuestion, index: number): SurveyQuestion {
  return {
    ...question,
    position: index,
    showWhen: question.showWhen || undefined,
    options: question.options.filter((option) => option.label.trim()).map((option, optionIndex) => ({ ...option, position: optionIndex })),
  };
}
const CHOICE = new Set<SurveyQuestionType>(["SINGLE", "MULTI", "DROPDOWN"]);

export function SurveyWizardPage({ surveyId, initialStep = 0 }: { surveyId?: string; initialStep?: number }) {
  const router = useRouter();
  const [step, setStep] = useState(initialStep);
  const [id, setId] = useState(surveyId ?? "");
  const [survey, setSurvey] = useState<Partial<SurveyRecord>>({
    name: "",
    formTitle: "",
    description: "",
    anonymous: false,
    personalized: true,
    singleResponse: true,
    allowEdit: false,
    smsBody: "Görüşleriniz bizim için değerli. Anketimize katılmak için: {survey_link}",
    thankYouMessage: "Teşekkür ederiz. Yanıtınız başarıyla kaydedildi.",
  });
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [sources, setSources] = useState<SurveySource[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!surveyId) return;
    surveyService.get(surveyId).then((row) => {
      setSurvey(row);
      setQuestions(row.questions ?? []);
      setSources(row.audience?.sources ?? []);
      setId(row.id);
    }).catch((err) => setError(err.message));
  }, [surveyId]);

  const saveGeneral = async () => {
    const body = {
      name: survey.name,
      formTitle: survey.formTitle || survey.name,
      description: survey.description,
      logoUrl: survey.logoUrl,
      companyNameOverride: survey.companyNameOverride,
      thankYouMessage: survey.thankYouMessage,
      anonymous: survey.anonymous,
      personalized: survey.personalized,
      singleResponse: survey.singleResponse,
      allowEdit: survey.allowEdit,
      startsAt: survey.startsAt || undefined,
      endsAt: survey.endsAt || undefined,
      smsBody: survey.smsBody,
      originatorId: survey.originatorId || undefined,
      audience: { sources },
    };
    const saved = id ? await surveyService.update(id, body) : await surveyService.create(body);
    setId(saved.id);
    setSurvey(saved);
    return saved.id;
  };

  const next = async () => {
    setError("");
    const problem = step === 1 ? questionProblems(questions) : "";
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    try {
      const currentId = await saveGeneral();
      if (step === 1) await surveyService.saveQuestions(currentId, questions.map(normalizeQuestion));
      const nextStep = Math.min(step + 1, STEPS.length - 1);
      router.replace(`/customer/surveys/${currentId}?step=${nextStep}`);
      if (surveyId) setStep(nextStep);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi");
    } finally {
      setBusy(false);
    }
  };

  const publish = async (send: boolean) => {
    setBusy(true);
    setError("");
    const problem = questionProblems(questions);
    if (problem) {
      setError(problem);
      setBusy(false);
      return;
    }
    try {
      const currentId = await saveGeneral();
      await surveyService.saveQuestions(currentId, questions.map(normalizeQuestion));
      if (send) {
        if (!survey.originatorId) throw new Error("SMS başlığı seçin");
        await surveyService.publish(currentId, false);
        await surveyService.distribute(currentId, {
          originatorId: survey.originatorId,
          body: survey.smsBody || "{survey_link}",
          sources,
        });
      } else {
        await surveyService.publish(currentId, false);
      }
      router.push(`/customer/surveys/${currentId}/results`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yayınlanamadı");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-bold text-slate-900">{survey.name || "Yeni anket"}</h1>
      <ol className="mt-4 flex flex-wrap gap-2">
        {STEPS.map((label, index) => (
          <li key={label} className={`rounded-full px-3 py-1 text-xs font-medium ${index === step ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
            {index + 1}. {label}
          </li>
        ))}
      </ol>
      {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {step === 0 && <GeneralStep survey={survey} onChange={setSurvey} />}
        {step === 1 && <QuestionStep questions={questions} onChange={setQuestions} />}
        {step === 2 && <SettingsStep survey={survey} onChange={setSurvey} />}
        {step === 3 && <DistributionStep survey={survey} sources={sources} onSurvey={setSurvey} onSources={setSources} />}
        {step === 4 && <PreviewStep survey={survey} questions={questions} sources={sources} />}
        {step === 5 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Anket yayına alınır. SMS seçtiyseniz mevcut gönderim kuyruğuna bırakılır.</p>
            <div className="flex flex-wrap gap-2">
              <button disabled={busy} onClick={() => publish(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">Yayınla</button>
              <button disabled={busy} onClick={() => publish(true)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white">Yayınla ve SMS gönder</button>
            </div>
          </div>
        )}
      </div>
      <div className="mt-4 flex justify-between">
        <button type="button" disabled={step === 0 || busy} onClick={() => {
          const previous = Math.max(step - 1, 0);
          if (id) router.replace(`/customer/surveys/${id}?step=${previous}`);
          setStep(previous);
        }} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">Geri</button>
        {step < 5 && (
          <button type="button" disabled={busy} onClick={next} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white">{busy ? "Kaydediliyor" : "Devam"}</button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

const inputClass = "flex h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400";

function GeneralStep({ survey, onChange }: { survey: Partial<SurveyRecord>; onChange: (value: Partial<SurveyRecord>) => void }) {
  return (
    <div className="grid gap-4">
      <Field label="Anket adı"><input className={inputClass} value={survey.name || ""} onChange={(event) => onChange({ ...survey, name: event.target.value })} placeholder="Müşteri Memnuniyeti 2026" /></Field>
      <Field label="Form başlığı"><input className={inputClass} value={survey.formTitle || ""} onChange={(event) => onChange({ ...survey, formTitle: event.target.value })} placeholder="Hizmetlerimiz hakkında görüşünüzü paylaşın" /></Field>
      <Field label="Açıklama"><textarea className={`${inputClass} h-24 py-2`} value={survey.description || ""} onChange={(event) => onChange({ ...survey, description: event.target.value })} placeholder="Bu anket yaklaşık 2 dakika sürmektedir." /></Field>
      <Field label="Firma adı"><input className={inputClass} value={survey.companyNameOverride || ""} onChange={(event) => onChange({ ...survey, companyNameOverride: event.target.value })} placeholder="Boş bırakılırsa firma kartındaki ad kullanılır" /></Field>
      <Field label="Logo adresi"><input className={inputClass} value={survey.logoUrl || ""} onChange={(event) => onChange({ ...survey, logoUrl: event.target.value })} placeholder="Boş bırakılırsa firma logosu kullanılır" /></Field>
    </div>
  );
}

function QuestionStep({ questions, onChange }: { questions: SurveyQuestion[]; onChange: (value: SurveyQuestion[]) => void }) {
  const add = (type: SurveyQuestionType) => {
    onChange([...questions, { type, text: "", required: true, position: questions.length, options: CHOICE.has(type) ? [{ label: "", position: 0 }, { label: "", position: 1 }] : [] }]);
  };
  const move = (index: number, direction: -1 | 1) => {
    const next = [...questions];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(next);
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(QUESTION_TYPE_LABELS) as SurveyQuestionType[]).map((type) => {
          const count = questions.filter((question) => question.type === type).length;
          return (
            <button key={type} type="button" onClick={() => add(type)} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700">
              {QUESTION_TYPE_LABELS[type]}
              {count > 0 && <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold text-white">{count}</span>}
            </button>
          );
        })}
      </div>
      {questions.map((question, index) => (
        <div
          key={`${question.id || "new"}-${index}`}
          draggable
          onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            const from = Number(event.dataTransfer.getData("text/plain"));
            if (Number.isNaN(from) || from === index) return;
            const next = [...questions];
            const [item] = next.splice(from, 1);
            next.splice(index, 0, item);
            onChange(next);
          }}
          className="rounded-2xl border border-slate-200 p-4"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500">{QUESTION_TYPE_LABELS[question.type]} · sürükleyerek sırala</span>
            <div className="flex gap-2 text-xs">
              <button type="button" onClick={() => move(index, -1)}>Yukarı</button>
              <button type="button" onClick={() => move(index, 1)}>Aşağı</button>
              <button type="button" className="text-red-600" onClick={() => onChange(questions.filter((_, item) => item !== index))}>Sil</button>
            </div>
          </div>
          <input className={inputClass} value={question.text} placeholder="Soru metni" onChange={(event) => onChange(questions.map((item, itemIndex) => itemIndex === index ? { ...item, text: event.target.value } : item))} />
          <input className={`${inputClass} mt-2`} value={question.description || ""} placeholder="Açıklama (isteğe bağlı)" onChange={(event) => onChange(questions.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item))} />
          <label className="mt-2 flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={question.required} onChange={(event) => onChange(questions.map((item, itemIndex) => itemIndex === index ? { ...item, required: event.target.checked } : item))} />
            Zorunlu
          </label>
          {CHOICE.has(question.type) && (
            <div className="mt-3 space-y-2">
              {question.options.map((option, optionIndex) => (
                <input key={optionIndex} className={inputClass} value={option.label} placeholder={`Seçenek ${optionIndex + 1}`} onChange={(event) => onChange(questions.map((item, itemIndex) => itemIndex === index ? { ...item, options: item.options.map((current, currentIndex) => currentIndex === optionIndex ? { ...current, label: event.target.value } : current) } : item))} />
              ))}
              <button type="button" className="text-sm text-blue-600" onClick={() => onChange(questions.map((item, itemIndex) => itemIndex === index ? { ...item, options: [...item.options, { label: "", position: item.options.length }] } : item))}>Seçenek ekle</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SettingsStep({ survey, onChange }: { survey: Partial<SurveyRecord>; onChange: (value: Partial<SurveyRecord>) => void }) {
  return (
    <div className="grid gap-4">
      <Toggle label="Anonim anket" checked={Boolean(survey.anonymous)} onChange={(anonymous) => onChange({ ...survey, anonymous })} hint="Sonuçlarda kişi bilgisi görünmez." />
      <Toggle label="Kişiye özel anket" checked={Boolean(survey.personalized)} onChange={(personalized) => onChange({ ...survey, personalized })} hint="Her alıcıya ayrı bağlantı gider." />
      <Toggle label="Tek yanıt" checked={survey.singleResponse !== false} onChange={(singleResponse) => onChange({ ...survey, singleResponse })} hint="Bir kişi ankete bir kez katılır." />
      <Toggle label="Yanıt değiştirme" checked={Boolean(survey.allowEdit)} onChange={(allowEdit) => onChange({ ...survey, allowEdit })} hint="Gönderilen cevap daha sonra güncellenebilir." />
      <Field label="Başlangıç"><input type="datetime-local" className={inputClass} value={toLocal(survey.startsAt)} onChange={(event) => onChange({ ...survey, startsAt: event.target.value ? new Date(event.target.value).toISOString() : null })} /></Field>
      <Field label="Bitiş"><input type="datetime-local" className={inputClass} value={toLocal(survey.endsAt)} onChange={(event) => onChange({ ...survey, endsAt: event.target.value ? new Date(event.target.value).toISOString() : null })} /></Field>
      <Field label="Teşekkür mesajı"><textarea className={`${inputClass} h-20 py-2`} value={survey.thankYouMessage || ""} onChange={(event) => onChange({ ...survey, thankYouMessage: event.target.value })} /></Field>
    </div>
  );
}

function DistributionStep({
  survey,
  sources,
  onSurvey,
  onSources,
}: {
  survey: Partial<SurveyRecord>;
  sources: SurveySource[];
  onSurvey: (value: Partial<SurveyRecord>) => void;
  onSources: (value: SurveySource[]) => void;
}) {
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
  const [originators, setOriginators] = useState<{ id: string; name: string }[]>([]);
  const [manual, setManual] = useState("");
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    contactGroupsService.list().then((rows) => setGroups(rows.map((row) => ({ id: row.id, name: row.name })))).catch(() => undefined);
    contactTagsService.list().then((rows) => setTags(rows.map((row) => ({ id: row.id, name: row.name })))).catch(() => undefined);
    smsSendService.originators().then((rows) => setOriginators(rows.items ?? [])).catch(() => undefined);
  }, []);

  const summary = useMemo(
    () => sources.map((source, index) => ({
      key: `${index}:${source.type}:${source.groupId || source.tagId || source.contactIds?.[0] || "satir"}`,
      label: source.label || source.type,
    })),
    [sources],
  );

  return (
    <div className="grid gap-4">
      <Field label="SMS metni">
        <textarea className={`${inputClass} h-24 py-2`} value={survey.smsBody || ""} onChange={(event) => onSurvey({ ...survey, smsBody: event.target.value })} />
        <SmsMeter body={survey.smsBody || ""} onApply={(smsBody) => onSurvey({ ...survey, smsBody })} />
      </Field>
      <p className="text-xs text-slate-500">Kişiye özel ankette {"{survey_link}"} her alıcının kendi bağlantısı olur. Gönderim mevcut SMS kuyruğunu kullanır.</p>
      <Field label="SMS başlığı">
        <select className={inputClass} value={survey.originatorId || ""} onChange={(event) => onSurvey({ ...survey, originatorId: event.target.value })}>
          <option value="">Başlık seçin</option>
          {originators.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <select className={inputClass} defaultValue="" onChange={(event) => {
          const group = groups.find((item) => item.id === event.target.value);
          if (!group || sources.some((source) => source.type === "CONTACT_GROUP" && source.groupId === group.id)) return;
          onSources([...sources, { type: "CONTACT_GROUP", groupId: group.id, label: group.name }]);
          event.target.value = "";
        }}>
          <option value="">Rehber grubu ekle</option>
          {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
        </select>
        <select className={inputClass} defaultValue="" onChange={(event) => {
          const tag = tags.find((item) => item.id === event.target.value);
          if (!tag || sources.some((source) => source.type === "TAG" && source.tagId === tag.id)) return;
          onSources([...sources, { type: "TAG", tagId: tag.id, label: tag.name }]);
          event.target.value = "";
        }}>
          <option value="">Etiket ekle</option>
          {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
        </select>
      </div>
      <button type="button" className="w-fit rounded-xl border border-slate-200 px-3 py-2 text-sm" onClick={() => { if (!sources.some((source) => source.type === "CONTACT_BOOK")) onSources([...sources, { type: "CONTACT_BOOK", label: "Tüm rehber" }]); }}>Tüm rehberi ekle</button>
      <Field label="Manuel numara">
        <textarea className={`${inputClass} h-20 py-2`} value={manual} onChange={(event) => setManual(event.target.value)} placeholder="Her satıra bir numara" />
      </Field>
      <button type="button" className="w-fit text-sm text-blue-600" onClick={() => {
        const phones = manual.split(/\s|,|;/).map((item) => item.trim()).filter(Boolean);
        if (!phones.length) return;
        onSources([...sources, { type: "MANUAL", label: `Manuel ${phones.length}`, phones }]);
        setManual("");
      }}>Numaraları ekle</button>
      <Field label="Excel / CSV">
        <input type="file" accept=".xlsx,.xls,.csv" onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          const XLSX = await import("xlsx");
          const book = XLSX.read(await file.arrayBuffer(), { type: "array" });
          const rows = XLSX.utils.sheet_to_json<(string | number)[]>(book.Sheets[book.SheetNames[0]], { header: 1 });
          const phones = rows.flat().map((cell) => String(cell ?? "").trim()).filter((value) => /\d{10,}/.test(value.replace(/\D/g, "")));
          onSources([...sources, { type: "FILE", label: file.name, phones }]);
        }} />
      </Field>
      <Field label="Kişi ara">
        <input className={inputClass} value={query} onChange={async (event) => {
          setQuery(event.target.value);
          if (event.target.value.trim().length < 2) return;
          const result = await contactsService.list({ search: event.target.value, limit: 8 });
          setPeople(result.items.map((item) => ({ id: item.id, label: `${item.firstName || ""} ${item.lastName || ""} ${item.mobilePhone}`.trim() })));
        }} />
      </Field>
      <div className="flex flex-wrap gap-2">
        {people.map((person) => (
          <button key={person.id} type="button" className="rounded-full bg-slate-100 px-3 py-1 text-xs" onClick={() => { if (!sources.some((source) => source.contactIds?.includes(person.id))) onSources([...sources, { type: "CONTACT_PICK", label: person.label, contactIds: [person.id] }]); }}>{person.label}</button>
        ))}
      </div>
      <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
        {summary.length ? summary.map((item) => <p key={item.key}>{item.label}</p>) : "Henüz alıcı seçilmedi. Nihai sayı gönderimde mükerrer ve geçersiz numaralar düşülerek hesaplanır."}
        {sources.length > 0 && <button type="button" className="mt-2 text-xs text-red-600" onClick={() => onSources([])}>Listeyi temizle</button>}
      </div>
    </div>
  );
}

function PreviewStep({ survey, questions, sources }: { survey: Partial<SurveyRecord>; questions: SurveyQuestion[]; sources: SurveySource[] }) {
  return (
    <div className="space-y-3 text-sm text-slate-700">
      <p className="text-lg font-semibold text-slate-900">{survey.formTitle || survey.name}</p>
      <p>{survey.description}</p>
      <p>{questions.length} soru · {sources.length} alıcı kaynağı</p>
      <p>{survey.personalized ? "Kişiye özel bağlantı" : "Herkese açık bağlantı"} · {survey.anonymous ? "Anonim" : "Kimlikli"}</p>
      <ol className="list-decimal space-y-1 pl-5">
        {questions.map((question) => <li key={question.text}>{question.text || "Adsız soru"}</li>)}
      </ol>
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3">
      <span>
        <span className="block text-sm font-medium text-slate-900">{label}</span>
        <span className="block text-xs text-slate-500">{hint}</span>
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function SmsMeter({ body, onApply }: { body: string; onApply: (value: string) => void }) {
  const analysis = analyzeSms(body);
  return (
    <div className="mt-1.5 space-y-2 text-xs text-slate-500">
      <p className="text-right">
        Karakter: {analysis.length.toLocaleString("tr-TR")} · {analysis.encoding === "UCS2" ? "Unicode" : "GSM-7"} · {analysis.parts} SMS
      </p>
      {analysis.saving > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-left text-amber-900">
          <p className="font-medium">Optimize edilmiş alternatif · {analysis.saving} SMS kazanç</p>
          <p className="mt-1 whitespace-pre-wrap text-amber-800">{analysis.optimized}</p>
          <button type="button" className="mt-2 font-medium text-blue-700" onClick={() => onApply(analysis.optimized)}>Metne uygula</button>
        </div>
      )}
    </div>
  );
}

function toLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
