import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { DataSource, IsNull, Repository } from 'typeorm';
import { AuditService } from '../../audit/audit.service.js';
import { Company } from '../../companies/entities/company.entity.js';
import { KvkkSetting } from '../../kvkk/entities/kvkk-setting.entity.js';
import { toPublicLogoPath } from '../../kvkk/services/kvkk-presenter.js';
import { CreateTemplateDto, SaveQuestionsDto, UpdateSurveySettingsDto, UpsertSurveyDto } from '../dto/survey.dto.js';
import { SurveyAnswer } from '../entities/survey-answer.entity.js';
import { SurveyOption } from '../entities/survey-option.entity.js';
import { SurveyQuestion } from '../entities/survey-question.entity.js';
import { SurveyResponse } from '../entities/survey-response.entity.js';
import { SurveySetting } from '../entities/survey-setting.entity.js';
import { SurveyTemplate } from '../entities/survey-template.entity.js';
import { Survey } from '../entities/survey.entity.js';
import { CHOICE_TYPES, slugifySurveyName, type SurveyQuestionType } from '../survey.constants.js';
import type { SurveyActor } from './survey-access.service.js';

const DEFAULT_SMS = 'Görüşleriniz bizim için değerli. Anketimize katılmak için: {survey_link}';
const DEFAULT_THANKS = 'Teşekkür ederiz. Yanıtınız başarıyla kaydedildi.';

@Injectable()
export class SurveyService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
    @InjectRepository(Survey) private readonly surveys: Repository<Survey>,
    @InjectRepository(SurveyQuestion) private readonly questions: Repository<SurveyQuestion>,
    @InjectRepository(SurveyOption) private readonly options: Repository<SurveyOption>,
    @InjectRepository(SurveyResponse) private readonly responses: Repository<SurveyResponse>,
    @InjectRepository(SurveyTemplate) private readonly templates: Repository<SurveyTemplate>,
    @InjectRepository(SurveySetting) private readonly settings: Repository<SurveySetting>,
    @InjectRepository(Company) private readonly companies: Repository<Company>,
    @InjectRepository(KvkkSetting) private readonly kvkkSettings: Repository<KvkkSetting>,
  ) {}

  async refreshCompany(companyId: string) {
    await this.dataSource.query(
      `UPDATE surveys SET status = 'EXPIRED', updated_at = now()
       WHERE company_id = $1 AND status IN ('ACTIVE', 'SCHEDULED') AND ends_at IS NOT NULL AND ends_at <= now()`,
      [companyId],
    );
    await this.dataSource.query(
      `UPDATE surveys SET status = 'ACTIVE', updated_at = now()
       WHERE company_id = $1 AND status = 'SCHEDULED' AND starts_at IS NOT NULL AND starts_at <= now()
         AND (ends_at IS NULL OR ends_at > now())`,
      [companyId],
    );
  }

  async list(companyId: string) {
    await this.refreshCompany(companyId);
    const rows = await this.surveys.find({
      where: { companyId },
      order: { updatedAt: 'DESC' },
      take: 200,
    });
    const stats = await this.statsBySurvey(rows.map((row) => row.id));
    return rows.map((row) => this.toListItem(row, stats.get(row.id)));
  }

  async get(companyId: string, id: string) {
    await this.refreshCompany(companyId);
    const survey = await this.requireOwned(companyId, id);
    const questions = await this.questions.find({ where: { surveyId: id }, order: { position: 'ASC' } });
    const options = questions.length
      ? await this.options
          .createQueryBuilder('option')
          .where('option.questionId IN (:...ids)', { ids: questions.map((item) => item.id) })
          .orderBy('option.position', 'ASC')
          .getMany()
      : [];
    const branding = await this.branding(survey);
    return {
      ...this.toListItem(survey),
      ...branding,
      questions: questions.map((question) => ({
        id: question.id,
        type: question.type,
        text: question.text,
        description: question.description ?? '',
        required: question.required,
        position: question.position,
        showWhen: question.showWhen ?? null,
        options: options
          .filter((option) => option.questionId === question.id)
          .map((option) => ({ id: option.id, label: option.label, position: option.position })),
      })),
    };
  }

  async create(actor: SurveyActor, companyId: string, dto: UpsertSurveyDto) {
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Anket adı zorunludur');
    const settings = await this.ensureSettings(companyId);
    const survey = await this.surveys.save(
      this.surveys.create({
        companyId,
        name,
        formTitle: dto.formTitle?.trim() || name,
        description: dto.description?.trim() || undefined,
        thankYouMessage: dto.thankYouMessage?.trim() || settings.defaultThankYou || DEFAULT_THANKS,
        smsBody: dto.smsBody?.trim() || settings.defaultSmsBody || DEFAULT_SMS,
        anonymous: dto.anonymous ?? false,
        personalized: dto.personalized ?? true,
        singleResponse: dto.singleResponse ?? true,
        allowEdit: dto.allowEdit ?? false,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        createdBy: actor.id,
        status: 'DRAFT',
      }),
    );
    await this.audit.log('SURVEY_CREATE', 'Survey', survey.id, actor.id, companyId, null, { name: survey.name });
    return this.get(companyId, survey.id);
  }

  async update(actor: SurveyActor, companyId: string, id: string, dto: UpsertSurveyDto) {
    const survey = await this.requireOwned(companyId, id);
    if (survey.status === 'CANCELLED' || survey.status === 'COMPLETED' || survey.status === 'EXPIRED') {
      throw new BadRequestException('Bu ankette düzenleme yapılamaz');
    }
    this.applyGeneral(survey, dto);
    if (dto.audience !== undefined) survey.audience = dto.audience;
    if (dto.smsBody !== undefined) survey.smsBody = dto.smsBody.trim();
    if (dto.originatorId !== undefined) survey.originatorId = dto.originatorId;
    await this.surveys.save(survey);
    await this.audit.log('SURVEY_UPDATE', 'Survey', survey.id, actor.id, companyId, null, { name: survey.name });
    return this.get(companyId, id);
  }

  async saveQuestions(actor: SurveyActor, companyId: string, id: string, dto: SaveQuestionsDto) {
    const survey = await this.requireOwned(companyId, id);
    if (survey.status === 'CANCELLED' || survey.status === 'COMPLETED' || survey.status === 'EXPIRED') {
      throw new BadRequestException('Bu ankette soru düzenlenemez');
    }
    const responseCount = await this.responses.count({ where: { surveyId: id } });
    const existing = await this.questions.find({ where: { surveyId: id } });
    if (responseCount > 0) {
      await this.updateLockedQuestions(existing, dto);
    } else {
      await this.replaceQuestions(id, dto);
    }
    await this.audit.log('SURVEY_UPDATE', 'Survey', id, actor.id, companyId, null, { questions: dto.questions.length });
    return this.get(companyId, id);
  }

  async publish(actor: SurveyActor, companyId: string, id: string) {
    const survey = await this.requireOwned(companyId, id);
    if (survey.status === 'CANCELLED') throw new BadRequestException('İptal edilmiş anket yayınlanamaz');
    const count = await this.questions.count({ where: { surveyId: id } });
    if (!count) throw new BadRequestException('Yayınlamak için en az bir soru ekleyin');
    if (!survey.publicSlug) survey.publicSlug = await this.uniqueSlug(survey.name);
    const now = new Date();
    if (survey.endsAt && survey.endsAt.getTime() <= now.getTime()) {
      throw new BadRequestException('Bitiş tarihi geçmiş bir anket yayınlanamaz');
    }
    survey.status = survey.startsAt && survey.startsAt.getTime() > now.getTime() ? 'SCHEDULED' : 'ACTIVE';
    survey.publishedAt = survey.publishedAt ?? now;
    await this.surveys.save(survey);
    await this.audit.log('SURVEY_PUBLISH', 'Survey', id, actor.id, companyId, null, { status: survey.status });
    return this.get(companyId, id);
  }

  async close(actor: SurveyActor, companyId: string, id: string) {
    const survey = await this.requireOwned(companyId, id);
    survey.status = 'COMPLETED';
    survey.closedAt = new Date();
    await this.surveys.save(survey);
    await this.audit.log('SURVEY_CLOSE', 'Survey', id, actor.id, companyId, null, null);
    return this.get(companyId, id);
  }

  async cancel(actor: SurveyActor, companyId: string, id: string) {
    const survey = await this.requireOwned(companyId, id);
    survey.status = 'CANCELLED';
    survey.closedAt = new Date();
    await this.surveys.save(survey);
    await this.audit.log('SURVEY_CANCEL', 'Survey', id, actor.id, companyId, null, null);
    return this.get(companyId, id);
  }

  async remove(actor: SurveyActor, companyId: string, id: string) {
    const survey = await this.requireOwned(companyId, id);
    if (survey.status !== 'DRAFT') throw new BadRequestException('Yalnızca taslak anket silinebilir');
    await this.surveys.delete({ id, companyId });
    await this.audit.log('SURVEY_DELETE', 'Survey', id, actor.id, companyId, { name: survey.name }, null);
    return { id };
  }

  async copy(actor: SurveyActor, companyId: string, id: string) {
    const source = await this.get(companyId, id);
    const created = await this.surveys.save(
      this.surveys.create({
        companyId,
        name: `${source.name} kopya`.slice(0, 160),
        formTitle: source.formTitle,
        description: source.description || undefined,
        logoUrl: source.logoUrl || undefined,
        companyNameOverride: source.companyNameOverride || undefined,
        thankYouMessage: source.thankYouMessage || undefined,
        anonymous: source.anonymous,
        personalized: source.personalized,
        singleResponse: source.singleResponse,
        allowEdit: source.allowEdit,
        smsBody: source.smsBody || undefined,
        originatorId: source.originatorId || undefined,
        audience: source.audience ?? undefined,
        status: 'DRAFT',
        createdBy: actor.id,
      }),
    );
    await this.replaceQuestions(created.id, {
      questions: source.questions.map((question, index) => ({
        type: question.type,
        text: question.text,
        description: question.description,
        required: question.required,
        position: index,
        showWhen: question.showWhen?.questionId
          ? { questionId: question.showWhen.questionId, optionId: question.showWhen.optionId, value: question.showWhen.value }
          : undefined,
        options: question.options.map((option) => ({ label: option.label, position: option.position })),
      })),
    });
    await this.audit.log('SURVEY_COPY', 'Survey', created.id, actor.id, companyId, null, { from: id });
    return this.get(companyId, created.id);
  }

  async templatesFor(companyId: string) {
    const rows = await this.templates.find({
      where: [{ isSystem: true, companyId: IsNull() }, { companyId }],
      order: { isSystem: 'DESC', name: 'ASC' },
    });
    return rows.map((row) => this.presentTemplate(row));
  }

  async createTemplate(actor: SurveyActor, companyId: string, dto: CreateTemplateDto) {
    if (!dto.questions.length) throw new BadRequestException('Şablonda en az bir soru olmalı.');
    const saved = await this.templates.save(
      this.templates.create({
        companyId,
        name: dto.name.trim(),
        description: dto.description?.trim() || undefined,
        category: dto.category,
        isSystem: false,
        definition: { questions: dto.questions.map((question) => this.templateQuestion(question)) },
      }),
    );
    await this.audit.log('SURVEY_TEMPLATE_CREATE', 'SurveyTemplate', saved.id, actor.id, companyId, null, { name: saved.name });
    return this.presentTemplate(saved);
  }

  async removeTemplate(actor: SurveyActor, companyId: string, id: string) {
    const template = await this.templates.findOne({ where: { id, companyId } });
    if (!template || template.isSystem) throw new NotFoundException('Şablon bulunamadı');
    await this.templates.delete({ id });
    await this.audit.log('SURVEY_TEMPLATE_DELETE', 'SurveyTemplate', id, actor.id, companyId, { name: template.name }, null);
    return { id };
  }

  async createFromTemplate(actor: SurveyActor, companyId: string, templateId: string) {
    const template = await this.templates.findOne({ where: { id: templateId } });
    if (!template || (template.companyId && template.companyId !== companyId)) {
      throw new NotFoundException('Şablon bulunamadı');
    }
    const created = await this.create(actor, companyId, { name: template.name, formTitle: template.name, description: template.description });
    const questions = template.definition?.questions ?? [];
    await this.replaceQuestions(created.id, {
      questions: questions.map((question, index) => ({
        type: question.type,
        text: question.text,
        description: question.description,
        required: Boolean(question.required),
        position: index,
        options: (question.options ?? []).map((label, optionIndex) => ({ label, position: optionIndex })),
      })),
    });
    return this.get(companyId, created.id);
  }

  private presentTemplate(row: SurveyTemplate) {
    const questions = row.definition?.questions ?? [];
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? '',
      category: row.category || 'Genel',
      isSystem: row.isSystem,
      questionCount: questions.length,
      minutes: Math.max(1, Math.ceil(questions.length / 2)),
      questions: questions.map((question) => ({
        type: question.type,
        text: question.text,
        required: Boolean(question.required),
        options: question.options ?? [],
      })),
    };
  }

  private templateQuestion(question: CreateTemplateDto['questions'][number]) {
    const type = question.type as SurveyQuestionType;
    const options = CHOICE_TYPES.has(type)
      ? (question.options ?? []).map((option) => option.label.trim()).filter(Boolean)
      : [];
    if (type === 'YES_NO' && !options.length) options.push('Evet', 'Hayır');
    if (CHOICE_TYPES.has(type) && type !== 'YES_NO' && options.length < 2) {
      throw new BadRequestException('Seçenekli soruda en az iki seçenek yazın.');
    }
    return {
      type,
      text: question.text.trim(),
      description: question.description?.trim() || undefined,
      required: question.required,
      options,
    };
  }

  async getSettings(companyId: string) {
    const row = await this.ensureSettings(companyId);
    return {
      defaultThankYou: row.defaultThankYou || DEFAULT_THANKS,
      defaultSmsBody: row.defaultSmsBody || DEFAULT_SMS,
    };
  }

  async updateSettings(companyId: string, dto: UpdateSurveySettingsDto) {
    const row = await this.ensureSettings(companyId);
    if (dto.defaultThankYou !== undefined) row.defaultThankYou = dto.defaultThankYou.trim();
    if (dto.defaultSmsBody !== undefined) row.defaultSmsBody = dto.defaultSmsBody.trim();
    await this.settings.save(row);
    return this.getSettings(companyId);
  }

  async requireOwned(companyId: string, id: string) {
    const survey = await this.surveys.findOne({ where: { id, companyId } });
    if (!survey) throw new NotFoundException('Anket bulunamadı');
    return survey;
  }

  async branding(survey: Survey) {
    const company = await this.companies.findOne({ where: { id: survey.companyId } });
    const kvkk = await this.kvkkSettings.findOne({ where: { ownerCompanyId: survey.companyId } });
    const logo = survey.logoUrl || (kvkk?.logoUrl ? toPublicLogoPath(survey.companyId, kvkk.logoUrl) : '');
    return {
      companyName: survey.companyNameOverride || company?.name || '',
      logoUrl: logo,
      thankYouMessage: survey.thankYouMessage || DEFAULT_THANKS,
    };
  }

  private applyGeneral(survey: Survey, dto: UpsertSurveyDto) {
    if (dto.name !== undefined) survey.name = dto.name.trim();
    if (dto.formTitle !== undefined) survey.formTitle = dto.formTitle.trim();
    if (dto.description !== undefined) survey.description = dto.description.trim() || undefined;
    if (dto.logoUrl !== undefined) survey.logoUrl = dto.logoUrl.trim() || undefined;
    if (dto.companyNameOverride !== undefined) survey.companyNameOverride = dto.companyNameOverride.trim() || undefined;
    if (dto.thankYouMessage !== undefined) survey.thankYouMessage = dto.thankYouMessage.trim() || undefined;
    if (dto.anonymous !== undefined) survey.anonymous = dto.anonymous;
    if (dto.personalized !== undefined) survey.personalized = dto.personalized;
    if (dto.singleResponse !== undefined) survey.singleResponse = dto.singleResponse;
    if (dto.allowEdit !== undefined) survey.allowEdit = dto.allowEdit;
    if (dto.startsAt !== undefined) survey.startsAt = dto.startsAt ? new Date(dto.startsAt) : undefined;
    if (dto.endsAt !== undefined) survey.endsAt = dto.endsAt ? new Date(dto.endsAt) : undefined;
    if (survey.startsAt && survey.endsAt && survey.endsAt.getTime() <= survey.startsAt.getTime()) {
      throw new BadRequestException('Bitiş tarihi başlangıçtan sonra olmalı');
    }
  }

  private async replaceQuestions(surveyId: string, dto: SaveQuestionsDto) {
    await this.dataSource.query(`DELETE FROM survey_questions WHERE survey_id = $1`, [surveyId]);
    for (const [index, question] of dto.questions.entries()) {
      this.assertQuestion(question.type as SurveyQuestionType, question.options ?? []);
      const saved = await this.questions.save(
        this.questions.create({
          surveyId,
          type: question.type,
          text: question.text.trim(),
          description: question.description?.trim() || undefined,
          required: question.required,
          position: question.position ?? index,
          showWhen: question.showWhen ?? null,
        }),
      );
      await this.saveOptions(saved.id, question.type as SurveyQuestionType, question.options ?? []);
    }
  }

  private async updateLockedQuestions(existing: SurveyQuestion[], dto: SaveQuestionsDto) {
    const byId = new Map(existing.map((item) => [item.id, item]));
    const incomingIds = new Set(dto.questions.map((item) => item.id).filter(Boolean));
    if (existing.some((item) => !incomingIds.has(item.id))) {
      throw new BadRequestException('Yanıt toplanmış ankette soru silinemez');
    }
    for (const question of dto.questions) {
      if (!question.id || !byId.has(question.id)) {
        this.assertQuestion(question.type as SurveyQuestionType, question.options ?? []);
        const saved = await this.questions.save(
          this.questions.create({
            surveyId: existing[0]?.surveyId,
            type: question.type,
            text: question.text.trim(),
            description: question.description?.trim() || undefined,
            required: question.required,
            position: question.position,
            showWhen: question.showWhen ?? null,
          }),
        );
        await this.saveOptions(saved.id, question.type as SurveyQuestionType, question.options ?? []);
        continue;
      }
      const current = byId.get(question.id)!;
      if (current.type !== question.type) {
        throw new BadRequestException('Yanıt toplanmış ankette soru tipi değiştirilemez');
      }
      current.text = question.text.trim();
      current.description = question.description?.trim() || undefined;
      current.required = question.required;
      current.position = question.position;
      current.showWhen = question.showWhen ?? null;
      await this.questions.save(current);
      if (CHOICE_TYPES.has(current.type as SurveyQuestionType)) {
        const answerCount = await this.dataSource.getRepository(SurveyAnswer).count({ where: { questionId: current.id } });
        if (answerCount > 0) {
          const options = question.options ?? [];
          for (const option of options) {
            if (!option.id) continue;
            await this.options.update({ id: option.id, questionId: current.id }, { label: option.label.trim(), position: option.position });
          }
        } else {
          await this.options.delete({ questionId: current.id });
          await this.saveOptions(current.id, current.type as SurveyQuestionType, question.options ?? []);
        }
      }
    }
  }

  private assertQuestion(type: SurveyQuestionType, options: { label: string }[]) {
    if (type === 'YES_NO' || type === 'NPS' || !CHOICE_TYPES.has(type)) return;
    if (options.filter((option) => option.label.trim()).length < 2) {
      throw new BadRequestException('Seçenekli sorularda en az iki cevap olmalı');
    }
  }

  private async saveOptions(questionId: string, type: SurveyQuestionType, options: { label: string; position: number }[]) {
    const labels =
      type === 'YES_NO'
        ? [{ label: 'Evet', position: 0 }, { label: 'Hayır', position: 1 }]
        : type === 'NPS' || !CHOICE_TYPES.has(type)
          ? []
          : options;
    if (!labels.length) return;
    await this.options.save(
      labels.map((option, index) =>
        this.options.create({
          questionId,
          label: option.label.trim(),
          position: option.position ?? index,
        }),
      ),
    );
  }

  private async uniqueSlug(name: string) {
    const base = slugifySurveyName(name);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const slug = attempt === 0 ? base : `${base}-${randomBytes(2).toString('hex')}`;
      const exists = await this.surveys.findOne({ where: { publicSlug: slug } });
      if (!exists) return slug;
    }
    return `${base}-${randomBytes(4).toString('hex')}`;
  }

  private async ensureSettings(companyId: string) {
    const found = await this.settings.findOne({ where: { companyId } });
    if (found) return found;
    return this.settings.save(
      this.settings.create({
        companyId,
        defaultThankYou: DEFAULT_THANKS,
        defaultSmsBody: DEFAULT_SMS,
      }),
    );
  }

  private async statsBySurvey(ids: string[]) {
    const map = new Map<string, { sent: number; completed: number }>();
    if (!ids.length) return map;
    const rows: { survey_id: string; sent: string; completed: string }[] = await this.dataSource.query(
      `SELECT s.id AS survey_id,
              COUNT(DISTINCT r.mobile_normalized) FILTER (WHERE rec.status IN ('ACCEPTED', 'SENT', 'DELIVERED')) AS sent,
              COUNT(DISTINCT resp.id) FILTER (WHERE resp.status = 'COMPLETED') AS completed
       FROM surveys s
       LEFT JOIN survey_campaigns sc ON sc.survey_id = s.id
       LEFT JOIN sms_campaign_recipients rec ON rec.campaign_id = sc.campaign_id
       LEFT JOIN sms_campaign_recipients r ON r.id = rec.id
       LEFT JOIN survey_responses resp ON resp.survey_id = s.id
       WHERE s.id = ANY($1::uuid[])
       GROUP BY s.id`,
      [ids],
    );
    for (const row of rows) {
      map.set(row.survey_id, { sent: Number(row.sent) || 0, completed: Number(row.completed) || 0 });
    }
    return map;
  }

  private toListItem(
    survey: Survey,
    stats?: { sent: number; completed: number },
  ) {
    const sent = stats?.sent ?? 0;
    const completed = stats?.completed ?? 0;
    return {
      id: survey.id,
      name: survey.name,
      formTitle: survey.formTitle,
      description: survey.description ?? '',
      status: survey.status,
      anonymous: survey.anonymous,
      personalized: survey.personalized,
      singleResponse: survey.singleResponse,
      allowEdit: survey.allowEdit,
      startsAt: survey.startsAt ?? null,
      endsAt: survey.endsAt ?? null,
      publicSlug: survey.publicSlug ?? '',
      smsBody: survey.smsBody ?? '',
      originatorId: survey.originatorId ?? '',
      audience: survey.audience ?? null,
      logoUrl: survey.logoUrl ?? '',
      companyNameOverride: survey.companyNameOverride ?? '',
      thankYouMessage: survey.thankYouMessage ?? '',
      sent,
      completed,
      responseRate: sent ? Math.round((completed / sent) * 1000) / 10 : 0,
    };
  }
}
