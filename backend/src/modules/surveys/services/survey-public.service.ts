import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { StartSurveyDto, SubmitSurveyDto } from '../dto/survey.dto.js';
import { SurveyAnswer } from '../entities/survey-answer.entity.js';
import { SurveyOption } from '../entities/survey-option.entity.js';
import { SurveyQuestion } from '../entities/survey-question.entity.js';
import { SurveyRecipient } from '../entities/survey-recipient.entity.js';
import { SurveyResponse } from '../entities/survey-response.entity.js';
import { Survey } from '../entities/survey.entity.js';
import { CHOICE_TYPES, type SurveyQuestionType } from '../survey.constants.js';
import { SurveyService } from './survey.service.js';

@Injectable()
export class SurveyPublicService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly surveys: SurveyService,
    @InjectRepository(Survey) private readonly surveyRepo: Repository<Survey>,
    @InjectRepository(SurveyQuestion) private readonly questions: Repository<SurveyQuestion>,
    @InjectRepository(SurveyOption) private readonly options: Repository<SurveyOption>,
    @InjectRepository(SurveyRecipient) private readonly recipients: Repository<SurveyRecipient>,
    @InjectRepository(SurveyResponse) private readonly responses: Repository<SurveyResponse>,
    @InjectRepository(SurveyAnswer) private readonly answers: Repository<SurveyAnswer>,
  ) {}

  async bySlug(slug: string) {
    const survey = await this.surveyRepo.findOne({ where: { publicSlug: slug } });
    if (!survey) throw new NotFoundException('Anket bulunamadı');
    await this.surveys.refreshCompany(survey.companyId);
    const fresh = await this.surveyRepo.findOne({ where: { id: survey.id } });
    if (!fresh) throw new NotFoundException('Anket bulunamadı');
    this.assertOpen(fresh);
    await this.dataSource.query(`UPDATE surveys SET public_open_count = public_open_count + 1 WHERE id = $1`, [fresh.id]);
    return this.present(fresh, null);
  }

  async byToken(token: string) {
    const recipient = await this.recipients.findOne({ where: { token } });
    if (!recipient) throw new NotFoundException('Anket bağlantısı geçersiz');
    const survey = await this.surveyRepo.findOne({ where: { id: recipient.surveyId, companyId: recipient.companyId } });
    if (!survey) throw new NotFoundException('Anket bulunamadı');
    await this.surveys.refreshCompany(survey.companyId);
    const fresh = await this.surveyRepo.findOneByOrFail({ id: survey.id });
    this.assertOpen(fresh);
    if (!['STARTED', 'COMPLETED'].includes(recipient.inviteStatus)) {
      recipient.inviteStatus = 'OPENED';
    }
    recipient.openedAt = recipient.openedAt ?? new Date();
    await this.recipients.save(recipient);
    const completed = await this.responses.findOne({
      where: { surveyId: survey.id, recipientId: recipient.id, status: 'COMPLETED' },
    });
    return {
      ...(await this.present(fresh, recipient.id)),
      alreadyCompleted: Boolean(completed) && !fresh.allowEdit,
      allowEdit: fresh.allowEdit,
    };
  }

  async start(token: string | null, slug: string | null, dto: StartSurveyDto) {
    const { survey, recipient } = await this.resolve(token, slug);
    this.assertOpen(survey);
    if (recipient) {
      if (recipient.inviteStatus !== 'COMPLETED') recipient.inviteStatus = 'STARTED';
      recipient.startedAt = recipient.startedAt ?? new Date();
      recipient.openedAt = recipient.openedAt ?? new Date();
      await this.recipients.save(recipient);
    }
    if (!recipient && !dto.sessionKey?.trim()) return { ok: true };
    const existing = await this.findResponse(survey, recipient, dto.sessionKey);
    if (existing?.status === 'COMPLETED' && survey.singleResponse && !survey.allowEdit) {
      throw new BadRequestException('Bu anket bir kez yanıtlanabilir');
    }
    if (existing && (existing.status === 'PARTIAL' || survey.singleResponse)) return { responseId: existing.id };
    const channel = dto.channel || (recipient ? 'SMS' : 'PUBLIC');
    const inserted: { id: string }[] = await this.dataSource.query(
      recipient
        ? `INSERT INTO survey_responses (survey_id, company_id, recipient_id, channel, status, started_at)
           VALUES ($1, $2, $3, $4, 'PARTIAL', now())
           ON CONFLICT (survey_id, recipient_id) WHERE recipient_id IS NOT NULL AND status = 'PARTIAL'
           DO NOTHING
           RETURNING id`
        : `INSERT INTO survey_responses (survey_id, company_id, session_key, channel, status, started_at)
           VALUES ($1, $2, $3, $4, 'PARTIAL', now())
           ON CONFLICT (survey_id, session_key) WHERE session_key IS NOT NULL
           DO NOTHING
           RETURNING id`,
      recipient ? [survey.id, survey.companyId, recipient.id, channel] : [survey.id, survey.companyId, dto.sessionKey, channel],
    );
    if (inserted[0]?.id) return { responseId: inserted[0].id };
    const again = await this.findResponse(survey, recipient, dto.sessionKey);
    return { responseId: again?.id };
  }

  async submit(token: string | null, slug: string | null, dto: SubmitSurveyDto) {
    const { survey, recipient } = await this.resolve(token, slug);
    this.assertOpen(survey);
    const questions = await this.questions.find({ where: { surveyId: survey.id }, order: { position: 'ASC' } });
    const options = questions.length
      ? await this.options
          .createQueryBuilder('option')
          .where('option.questionId IN (:...ids)', { ids: questions.map((item) => item.id) })
          .getMany()
      : [];
    const existing = await this.findResponse(survey, recipient, dto.sessionKey);
    if (existing?.status === 'COMPLETED' && survey.singleResponse && !survey.allowEdit) {
      throw new BadRequestException('Bu anket bir kez yanıtlanabilir');
    }
    const visible = questions.filter((question) => this.isVisible(question, questions, dto.answers));
    const normalized = this.normalizeAnswers(visible, options, dto.answers);
    const response =
      existing ??
      (await this.responses.save(
        this.responses.create({
          surveyId: survey.id,
          companyId: survey.companyId,
          recipientId: recipient?.id,
          sessionKey: recipient ? undefined : dto.sessionKey,
          channel: dto.channel || (recipient ? 'SMS' : 'PUBLIC'),
          status: 'PARTIAL',
          startedAt: new Date(),
        }),
      ));
    const startedAt = response.startedAt ?? new Date();
    const completedAt = new Date();
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(SurveyAnswer).delete({ responseId: response.id });
      if (normalized.length) {
        await manager.getRepository(SurveyAnswer).save(
          normalized.map((answer) => manager.getRepository(SurveyAnswer).create({ ...answer, responseId: response.id })),
        );
      }
      response.status = 'COMPLETED';
      response.startedAt = startedAt;
      response.completedAt = completedAt;
      response.durationSeconds = Math.max(0, Math.round((completedAt.getTime() - startedAt.getTime()) / 1000));
      response.channel = dto.channel || response.channel;
      await manager.getRepository(SurveyResponse).save(response);
      if (recipient) {
        recipient.inviteStatus = 'COMPLETED';
        recipient.startedAt = recipient.startedAt ?? startedAt;
        recipient.completedAt = completedAt;
        recipient.openedAt = recipient.openedAt ?? startedAt;
        await manager.getRepository(SurveyRecipient).save(recipient);
      }
      await manager.query(
        `DELETE FROM survey_responses r
         WHERE r.survey_id = $1
           AND r.status = 'PARTIAL'
           AND r.id <> $2
           AND NOT EXISTS (SELECT 1 FROM survey_answers a WHERE a.response_id = r.id)
           AND (
             ($3::uuid IS NOT NULL AND r.recipient_id = $3)
             OR ($4::varchar IS NOT NULL AND r.session_key = $4)
           )`,
        [survey.id, response.id, recipient?.id ?? null, recipient ? null : dto.sessionKey ?? null],
      );
    });
    const branding = await this.surveys.branding(survey);
    return { ok: true, message: branding.thankYouMessage };
  }

  private async resolve(token: string | null, slug: string | null) {
    if (token) {
      const recipient = await this.recipients.findOne({ where: { token } });
      if (!recipient) throw new NotFoundException('Anket bağlantısı geçersiz');
      const survey = await this.surveyRepo.findOne({ where: { id: recipient.surveyId, companyId: recipient.companyId } });
      if (!survey) throw new NotFoundException('Anket bulunamadı');
      await this.surveys.refreshCompany(survey.companyId);
      return { survey: await this.surveyRepo.findOneByOrFail({ id: survey.id }), recipient };
    }
    const survey = await this.surveyRepo.findOne({ where: { publicSlug: slug ?? '' } });
    if (!survey) throw new NotFoundException('Anket bulunamadı');
    await this.surveys.refreshCompany(survey.companyId);
    return { survey: await this.surveyRepo.findOneByOrFail({ id: survey.id }), recipient: null };
  }

  private assertOpen(survey: Survey) {
    if (survey.status === 'CANCELLED') throw new BadRequestException('Bu anket iptal edildi');
    if (survey.status === 'COMPLETED' || survey.status === 'EXPIRED') throw new BadRequestException('Bu anketin süresi doldu');
    if (survey.status === 'DRAFT' || survey.status === 'SCHEDULED') throw new BadRequestException('Bu anket henüz yayında değil');
    if (survey.status !== 'ACTIVE') throw new BadRequestException('Bu anket yanıt kabul etmiyor');
  }

  private async present(survey: Survey, recipientId: string | null) {
    const questions = await this.questions.find({ where: { surveyId: survey.id }, order: { position: 'ASC' } });
    const options = questions.length
      ? await this.options
          .createQueryBuilder('option')
          .where('option.questionId IN (:...ids)', { ids: questions.map((item) => item.id) })
          .orderBy('option.position', 'ASC')
          .getMany()
      : [];
    const branding = await this.surveys.branding(survey);
    return {
      id: survey.id,
      title: survey.formTitle || survey.name,
      description: survey.description ?? '',
      anonymous: survey.anonymous,
      companyName: branding.companyName,
      logoUrl: branding.logoUrl,
      thankYouMessage: branding.thankYouMessage,
      recipientId,
      questions: questions.map((question) => ({
        id: question.id,
        type: question.type,
        text: question.text,
        description: question.description ?? '',
        required: question.required,
        showWhen: question.showWhen ?? null,
        options:
          question.type === 'NPS'
            ? Array.from({ length: 11 }, (_, value) => ({ id: String(value), label: String(value) }))
            : options
                .filter((option) => option.questionId === question.id)
                .map((option) => ({ id: option.id, label: option.label })),
      })),
    };
  }

  private async findResponse(survey: Survey, recipient: SurveyRecipient | null, sessionKey?: string) {
    if (recipient) {
      return this.responses.findOne({ where: { surveyId: survey.id, recipientId: recipient.id }, order: { createdAt: 'DESC' } });
    }
    if (!sessionKey) return null;
    return this.responses.findOne({ where: { surveyId: survey.id, sessionKey } });
  }

  private isVisible(
    question: SurveyQuestion,
    questions: SurveyQuestion[],
    answers: SubmitSurveyDto['answers'],
  ) {
    const rule = question.showWhen;
    if (!rule?.questionId) return true;
    const parent = questions.find((item) => item.id === rule.questionId);
    const answer = answers.find((item) => item.questionId === rule.questionId);
    if (!parent || !answer) return false;
    if (rule.optionId) return (answer.optionIds ?? []).includes(rule.optionId);
    if (rule.value != null) {
      return String(answer.number ?? answer.text ?? '') === rule.value;
    }
    return true;
  }

  private normalizeAnswers(
    questions: SurveyQuestion[],
    options: SurveyOption[],
    answers: SubmitSurveyDto['answers'],
  ) {
    const rows: Partial<SurveyAnswer>[] = [];
    for (const question of questions) {
      const answer = answers.find((item) => item.questionId === question.id);
      const type = question.type as SurveyQuestionType;
      if (!answer) {
        if (question.required) throw new BadRequestException('Zorunlu sorular yanıtlanmalı');
        continue;
      }
      if (type === 'NPS' || type === 'RATING' || type === 'STARS') {
        const max = type === 'NPS' ? 10 : 5;
        const min = type === 'NPS' ? 0 : 1;
        if (answer.number == null || answer.number < min || answer.number > max) {
          if (question.required) throw new BadRequestException('Puan sorusu eksik');
          continue;
        }
        rows.push({ questionId: question.id, valueNumber: String(answer.number) });
        continue;
      }
      if (CHOICE_TYPES.has(type)) {
        const allowed = new Set(options.filter((option) => option.questionId === question.id).map((option) => option.id));
        const picked = (answer.optionIds ?? []).filter((id) => allowed.has(id));
        if (!picked.length) {
          if (question.required) throw new BadRequestException('Seçenekli soru eksik');
          continue;
        }
        if (type === 'MULTI') rows.push({ questionId: question.id, valueJson: picked, optionId: picked[0] });
        else rows.push({ questionId: question.id, optionId: picked[0] });
        continue;
      }
      const text = answer.text?.trim() ?? '';
      if (!text) {
        if (question.required) throw new BadRequestException('Metin sorusu eksik');
        continue;
      }
      rows.push({ questionId: question.id, valueText: text });
    }
    return rows;
  }
}
