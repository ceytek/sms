import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { Response } from 'express';
import { AuditService } from '../../audit/audit.service.js';
import { ResponseQueryDto } from '../dto/survey.dto.js';
import { SurveyService } from './survey.service.js';

@Injectable()
export class SurveyAnalyticsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly surveys: SurveyService,
    private readonly audit: AuditService,
  ) {}

  async dashboard(companyId: string) {
    await this.surveys.refreshCompany(companyId);
    const [summary] = await this.dataSource.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS active,
         COUNT(*) FILTER (WHERE status IN ('DRAFT', 'SCHEDULED'))::int AS draft
       FROM surveys WHERE company_id = $1`,
      [companyId],
    );
    const [flow] = await this.dataSource.query(
      `SELECT
         COUNT(DISTINCT rec.mobile_normalized) FILTER (WHERE rec.status IN ('ACCEPTED','SENT','DELIVERED'))::int AS sent,
         COUNT(DISTINCT resp.id) FILTER (WHERE resp.status = 'COMPLETED')::int AS completed,
         COUNT(DISTINCT resp.id) FILTER (WHERE resp.status = 'PARTIAL')::int AS partial
       FROM surveys s
       LEFT JOIN survey_campaigns sc ON sc.survey_id = s.id
       LEFT JOIN sms_campaign_recipients rec ON rec.campaign_id = sc.campaign_id
       LEFT JOIN survey_responses resp ON resp.survey_id = s.id
       WHERE s.company_id = $1`,
      [companyId],
    );
    const sent = Number(flow?.sent) || 0;
    const completed = Number(flow?.completed) || 0;
    const recent = await this.surveys.list(companyId);
    return {
      total: Number(summary?.total) || 0,
      active: Number(summary?.active) || 0,
      sent,
      responses: completed,
      responseRate: sent ? Math.round((completed / sent) * 1000) / 10 : 0,
      incomplete: Number(flow?.partial) || 0,
      recent: recent.slice(0, 8),
    };
  }

  async funnel(companyId: string, id: string) {
    await this.surveys.requireOwned(companyId, id);
    const [sms] = await this.dataSource.query(
      `SELECT
         COUNT(DISTINCT rec.mobile_normalized) FILTER (WHERE rec.status IN ('ACCEPTED','SENT','DELIVERED'))::int AS sent,
         COUNT(DISTINCT rec.mobile_normalized) FILTER (WHERE rec.status = 'DELIVERED')::int AS delivered
       FROM survey_campaigns sc
       JOIN sms_campaign_recipients rec ON rec.campaign_id = sc.campaign_id
       WHERE sc.survey_id = $1`,
      [id],
    );
    const [people] = await this.dataSource.query(
      `SELECT
         COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::int AS opened,
         COUNT(*) FILTER (WHERE started_at IS NOT NULL)::int AS started,
         COUNT(*) FILTER (WHERE completed_at IS NOT NULL)::int AS completed
       FROM survey_recipients WHERE survey_id = $1`,
      [id],
    );
    const [publicRows] = await this.dataSource.query(
      `SELECT
         COUNT(*) FILTER (WHERE recipient_id IS NULL)::int AS opened,
         COUNT(*) FILTER (WHERE recipient_id IS NULL AND started_at IS NOT NULL)::int AS started,
         COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed
       FROM survey_responses WHERE survey_id = $1`,
      [id],
    );
    const [views] = await this.dataSource.query(
      `SELECT public_open_count::int AS opens FROM surveys WHERE id = $1`,
      [id],
    );
    const sent = Number(sms?.sent) || 0;
    const delivered = Number(sms?.delivered) || 0;
    const publicSessions = Number(publicRows?.opened) || 0;
    const publicOpens = Math.max(Number(views?.opens) || 0, publicSessions);
    const opened = (Number(people?.opened) || 0) + publicOpens;
    const started = (Number(people?.started) || 0) + (Number(publicRows?.started) || 0);
    const completed = Number(publicRows?.completed) || 0;
    return {
      sent,
      delivered,
      opened,
      started,
      completed,
      responseRate: sent ? Math.round((completed / sent) * 1000) / 10 : completed ? 100 : 0,
    };
  }

  async results(companyId: string, id: string) {
    const survey = await this.surveys.get(companyId, id);
    const funnel = await this.funnel(companyId, id);
    const optionRows: { question_id: string; option_id: string; total: string }[] = await this.dataSource.query(
      `SELECT a.question_id, a.option_id, COUNT(*)::int AS total
       FROM survey_answers a
       JOIN survey_responses r ON r.id = a.response_id
       WHERE r.survey_id = $1 AND r.status = 'COMPLETED' AND a.option_id IS NOT NULL AND a.value_json IS NULL
       GROUP BY a.question_id, a.option_id`,
      [id],
    );
    const multiRows: { question_id: string; option_id: string; total: string }[] = await this.dataSource.query(
      `SELECT a.question_id, opt.value AS option_id, COUNT(*)::int AS total
       FROM survey_answers a
       JOIN survey_responses r ON r.id = a.response_id
       CROSS JOIN LATERAL jsonb_array_elements_text(a.value_json) AS opt(value)
       WHERE r.survey_id = $1 AND r.status = 'COMPLETED' AND a.value_json IS NOT NULL
       GROUP BY a.question_id, opt.value`,
      [id],
    );
    const numberRows: { question_id: string; value_number: string; total: string }[] = await this.dataSource.query(
      `SELECT a.question_id, a.value_number::text, COUNT(*)::int AS total
       FROM survey_answers a
       JOIN survey_responses r ON r.id = a.response_id
       WHERE r.survey_id = $1 AND r.status = 'COMPLETED' AND a.value_number IS NOT NULL
       GROUP BY a.question_id, a.value_number`,
      [id],
    );
    const textRows: { question_id: string; value_text: string; created_at: string; total: string }[] = await this.dataSource.query(
      `SELECT question_id, value_text, created_at, total FROM (
         SELECT a.question_id, a.value_text, r.completed_at AS created_at,
                COUNT(*) OVER (PARTITION BY a.question_id)::int AS total,
                ROW_NUMBER() OVER (PARTITION BY a.question_id ORDER BY r.completed_at DESC) AS rn
         FROM survey_answers a
         JOIN survey_responses r ON r.id = a.response_id
         JOIN survey_questions q ON q.id = a.question_id
         WHERE r.survey_id = $1 AND r.status = 'COMPLETED'
           AND q.type IN ('SHORT_TEXT','LONG_TEXT','DATE')
           AND a.value_text IS NOT NULL AND btrim(a.value_text) <> ''
       ) samples WHERE rn <= 8`,
      [id],
    );
    const respondentRows: { question_id: string; total: string }[] = await this.dataSource.query(
      `SELECT a.question_id, COUNT(DISTINCT r.id)::int AS total
       FROM survey_answers a
       JOIN survey_responses r ON r.id = a.response_id
       WHERE r.survey_id = $1 AND r.status = 'COMPLETED'
       GROUP BY a.question_id`,
      [id],
    );
    const comments = textRows.map((row) => ({
      question_id: row.question_id,
      value_text: row.value_text,
      created_at: row.created_at,
    }));
    const questions = survey.questions.map((question) => {
      const choiceCounts = [...optionRows, ...multiRows].filter((row) => row.question_id === question.id);
      const numbers = numberRows.filter((row) => row.question_id === question.id);
      const respondents = Number(respondentRows.find((row) => row.question_id === question.id)?.total) || 0;
      const options = question.options.map((option) => {
        const count = choiceCounts.filter((row) => row.option_id === option.id).reduce((sum, row) => sum + Number(row.total), 0);
        return { id: option.id, label: option.label, count, percent: respondents ? Math.round((count / respondents) * 1000) / 10 : 0 };
      });
      const scaleTotal = numbers.reduce((sum, row) => sum + Number(row.total), 0);
      const scale = fillScale(question.type, numbers, scaleTotal);
      const nps = question.type === 'NPS' ? npsFromCounts(numbers) : null;
      const texts = textRows
        .filter((row) => row.question_id === question.id)
        .map((row) => ({ text: row.value_text, createdAt: row.created_at }));
      return { ...question, options, scale, nps, texts, answers: respondents };
    });
    return { survey: { id: survey.id, name: survey.name, status: survey.status }, funnel, questions, comments };
  }

  async responses(companyId: string, query: ResponseQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 10, 100);
    const { where, params } = this.responseFilter(companyId, query, { status: false, ids: false });
    const scope = where.join(' AND ');
    const [summaryRow] = await this.dataSource.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE a.status = 'COMPLETED')::int AS completed,
         COUNT(*) FILTER (WHERE a.status = 'STARTED')::int AS partial,
         COUNT(*) FILTER (WHERE a.status = 'CANCELLED')::int AS cancelled
       FROM ${this.activityFrom()}
       WHERE ${scope}`,
      params,
    );
    const listed = this.responseFilter(companyId, query, { ids: false });
    const filter = listed.where.join(' AND ');
    const [countRow] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS total
       FROM ${this.activityFrom()}
       WHERE ${filter}`,
      listed.params,
    );
    listed.params.push(limit, (page - 1) * limit);
    const rows = await this.dataSource.query(
      `SELECT a.id, a.response_id, a.survey_id, a.survey_name, a.anonymous, a.status, a.channel,
              a.started_at, a.completed_at, a.duration_seconds, a.created_at,
              a.display_name, a.normalized_phone, a.has_response
       FROM ${this.activityFrom()}
       WHERE ${filter}
       ORDER BY a.created_at DESC
       LIMIT $${listed.params.length - 1} OFFSET $${listed.params.length}`,
      listed.params,
    );
    const total = Number(summaryRow?.total) || 0;
    const completed = Number(summaryRow?.completed) || 0;
    const partial = Number(summaryRow?.partial) || 0;
    const cancelled = Number(summaryRow?.cancelled) || 0;
    const share = (count: number) => (total ? Math.round((count / total) * 1000) / 10 : 0);
    return {
      page,
      limit,
      total: Number(countRow?.total) || 0,
      summary: {
        total,
        completed,
        partial,
        cancelled,
        completedRate: share(completed),
        partialRate: share(partial),
        cancelledRate: share(cancelled),
      },
      items: rows.map((row: Record<string, unknown>) => this.hideIdentity(row)),
    };
  }

  async cancelResponse(companyId: string, actorId: string, id: string) {
    const [row] = await this.dataSource.query(
      `SELECT r.id, r.status, r.survey_id
       FROM survey_responses r
       JOIN surveys s ON s.id = r.survey_id AND s.company_id = $1
       WHERE r.id = $2`,
      [companyId, id],
    );
    if (!row) throw new NotFoundException('Yanıt bulunamadı');
    if (row.status !== 'CANCELLED') {
      await this.dataSource.query(`UPDATE survey_responses SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1`, [id]);
    }
    await this.audit.log('SURVEY_RESPONSE_CANCEL', 'SurveyResponse', id, actorId, companyId, { status: row.status }, { status: 'CANCELLED' });
    return { id, status: 'CANCELLED' };
  }

  async exportResponses(companyId: string, query: ResponseQueryDto, format: string, res: Response) {
    const header = ['Ad Soyad', 'Telefon', 'Anket', 'Başlama', 'Tamamlanma', 'Süre', 'Durum', 'Yöntem'];
    if (format === 'xlsx') {
      const listed = this.responseFilter(companyId, query);
      const [countRow] = await this.dataSource.query(
        `SELECT COUNT(*)::int AS total
         FROM ${this.activityFrom()}
         WHERE ${listed.where.join(' AND ')}`,
        listed.params,
      );
      if ((Number(countRow?.total) || 0) > 20000) throw new BadRequestException('20.000 üzerindeki dışa aktarma için CSV kullanın');
      const rows = await this.responseExportRows(companyId, query);
      const XLSX = await import('xlsx');
      const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, 'Yanıtlar');
      const buffer = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="anket-yanitlari.xlsx"');
      res.end(buffer);
      return;
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="anket-yanitlari.csv"');
    res.write(`\uFEFF${header.map(csvCell).join(',')}\n`);
    let cursorAt: string | null = null;
    let cursorId: string | null = null;
    for (;;) {
      const batch = await this.responseExportBatch(companyId, query, cursorAt, cursorId);
      if (!batch.lines.length) break;
      for (const line of batch.lines) res.write(`${line.map(csvCell).join(',')}\n`);
      cursorAt = batch.cursorAt;
      cursorId = batch.cursorId;
      if (batch.lines.length < 500) break;
    }
    res.end();
  }

  async responseDetail(companyId: string, id: string) {
    const [row] = await this.dataSource.query(
      `SELECT r.id, r.survey_id, s.name AS survey_name, s.anonymous, r.status, r.channel,
              r.started_at, r.completed_at, r.duration_seconds,
              sr.display_name, sr.normalized_phone
       FROM survey_responses r
       JOIN surveys s ON s.id = r.survey_id AND s.company_id = $1
       LEFT JOIN survey_recipients sr ON sr.id = r.recipient_id
       WHERE r.id = $2`,
      [companyId, id],
    );
    if (!row) throw new NotFoundException('Yanıt bulunamadı');
    const optionRows: { id: string; label: string }[] = await this.dataSource.query(
      `SELECT o.id, o.label
       FROM survey_options o
       JOIN survey_questions q ON q.id = o.question_id
       WHERE q.survey_id = $1`,
      [row.survey_id],
    );
    const optionLabel = new Map(optionRows.map((option) => [option.id, option.label]));
    const answers = await this.dataSource.query(
      `SELECT q.position, q.text, q.type, a.option_id, a.value_text, a.value_number, a.value_json, o.label AS option_label
       FROM survey_answers a
       JOIN survey_questions q ON q.id = a.question_id
       LEFT JOIN survey_options o ON o.id = a.option_id
       WHERE a.response_id = $1
       ORDER BY q.position ASC`,
      [id],
    );
    return {
      ...this.hideIdentity(row),
      answers: answers.map((answer: Record<string, unknown>) => ({
        question: answer.text,
        type: answer.type,
        value: this.answerLabel(answer, optionLabel),
      })),
    };
  }

  async export(companyId: string, id: string, format: string, res: Response) {
    const survey = await this.surveys.get(companyId, id);
    const questions = survey.questions;
    const header = [
      ...(survey.anonymous ? [] : ['Ad Soyad', 'Telefon']),
      'Durum',
      'Kanal',
      'Başlangıç',
      'Bitiş',
      'Süre (sn)',
      ...questions.map((question) => question.text),
    ];
    if (format === 'xlsx') {
      const total = await this.countCompleted(id);
      if (total > 20000) throw new BadRequestException('20.000 üzerindeki dışa aktarma için CSV kullanın');
      const XLSX = await import('xlsx');
      const rows = await this.exportRows(id, survey.anonymous, questions.map(exportQuestion));
      const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, 'Yanıtlar');
      const buffer = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="anket-${id}.xlsx"`);
      res.end(buffer);
      return;
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="anket-${id}.csv"`);
    res.write(`\uFEFF${header.map(csvCell).join(',')}\n`);
    let lastId = '00000000-0000-0000-0000-000000000000';
    for (;;) {
      const batch = await this.exportBatch(id, survey.anonymous, questions.map(exportQuestion), lastId);
      if (!batch.length) break;
      for (const line of batch) res.write(`${line.slice(0, -1).map(csvCell).join(',')}\n`);
      lastId = batch[batch.length - 1].at(-1) as string;
      if (batch.length < 500) break;
    }
    res.end();
  }

  private async countCompleted(id: string) {
    const [row] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS total FROM survey_responses WHERE survey_id = $1 AND status = 'COMPLETED'`,
      [id],
    );
    return Number(row?.total) || 0;
  }

  private async exportRows(id: string, anonymous: boolean, questions: ExportQuestion[]) {
    const lines: string[][] = [];
    let lastId = '00000000-0000-0000-0000-000000000000';
    for (;;) {
      const batch = await this.exportBatch(id, anonymous, questions, lastId);
      if (!batch.length) break;
      lines.push(...batch.map((line) => line.slice(0, -1)));
      lastId = batch[batch.length - 1].at(-1) as string;
      if (batch.length < 500) break;
    }
    return lines;
  }

  private async exportBatch(id: string, anonymous: boolean, questions: ExportQuestion[], lastId: string) {
    const rows: Record<string, unknown>[] = await this.dataSource.query(
      `SELECT r.id, r.status, r.channel, r.started_at, r.completed_at, r.duration_seconds,
              sr.display_name, sr.normalized_phone
       FROM survey_responses r
       LEFT JOIN survey_recipients sr ON sr.id = r.recipient_id
       WHERE r.survey_id = $1 AND r.status = 'COMPLETED' AND r.id > $2
       ORDER BY r.id ASC
       LIMIT 500`,
      [id, lastId],
    );
    if (!rows.length) return [];
    const ids = rows.map((row) => row.id);
    const answers: Record<string, unknown>[] = await this.dataSource.query(
      `SELECT a.response_id, a.question_id, a.value_text, a.value_number, a.value_json, o.label
       FROM survey_answers a
       LEFT JOIN survey_options o ON o.id = a.option_id
       WHERE a.response_id = ANY($1::uuid[])`,
      [ids],
    );
    return rows.map((row) => {
      const mine = answers.filter((answer) => answer.response_id === row.id);
      const values = questions.map((question) => {
        const answer = mine.find((item) => item.question_id === question.id);
        if (!answer) return '';
        if (Array.isArray(answer.value_json)) {
          return (answer.value_json as string[])
            .map((optionId) => question.options.find((option) => option.id === optionId)?.label || optionId)
            .join(' | ');
        }
        return String(answer.label || answer.value_text || answer.value_number || '');
      });
      const identity = anonymous ? [] : [String(row.display_name || ''), String(row.normalized_phone || '')];
      return [
        ...identity,
        String(row.status || ''),
        String(row.channel || ''),
        row.started_at ? new Date(String(row.started_at)).toISOString() : '',
        row.completed_at ? new Date(String(row.completed_at)).toISOString() : '',
        row.duration_seconds != null ? String(row.duration_seconds) : '',
        ...values,
        String(row.id),
      ];
    });
  }

  private activityFrom() {
    return `(
      SELECT
        COALESCE(r.id, sr.id) AS id,
        r.id AS response_id,
        sr.survey_id,
        s.name AS survey_name,
        s.anonymous,
        s.company_id,
        CASE
          WHEN r.status = 'CANCELLED' THEN 'CANCELLED'
          WHEN r.status = 'COMPLETED' OR sr.completed_at IS NOT NULL THEN 'COMPLETED'
          WHEN sr.started_at IS NOT NULL OR r.status = 'PARTIAL' THEN 'STARTED'
          WHEN sr.opened_at IS NOT NULL THEN 'OPENED'
          WHEN sms.status = 'DELIVERED' THEN 'DELIVERED'
          WHEN sms.status IN ('FAILED', 'REJECTED', 'EXPIRED') THEN 'FAILED'
          ELSE 'SENT'
        END AS status,
        COALESCE(r.channel, 'SMS') AS channel,
        COALESCE(r.started_at, sr.started_at) AS started_at,
        COALESCE(r.completed_at, sr.completed_at) AS completed_at,
        r.duration_seconds,
        COALESCE(r.created_at, sr.updated_at, sr.created_at) AS created_at,
        sr.display_name,
        sr.normalized_phone,
        sr.contact_id,
        (r.id IS NOT NULL) AS has_response
      FROM survey_recipients sr
      JOIN surveys s ON s.id = sr.survey_id
      LEFT JOIN LATERAL (
        SELECT rr.id, rr.status, rr.channel, rr.started_at, rr.completed_at, rr.duration_seconds, rr.created_at
        FROM survey_responses rr
        WHERE rr.recipient_id = sr.id
        ORDER BY CASE rr.status WHEN 'COMPLETED' THEN 0 WHEN 'CANCELLED' THEN 1 ELSE 2 END, rr.created_at DESC
        LIMIT 1
      ) r ON true
      LEFT JOIN sms_campaign_recipients sms ON sms.id = sr.sms_recipient_id
      WHERE sms.status IN ('QUEUED', 'PROCESSING', 'ACCEPTED', 'SENT', 'DELIVERED', 'FAILED', 'REJECTED', 'EXPIRED')
         OR sr.opened_at IS NOT NULL
         OR r.id IS NOT NULL
      UNION ALL
      SELECT
        r.id,
        r.id,
        r.survey_id,
        s.name,
        s.anonymous,
        s.company_id,
        CASE r.status WHEN 'COMPLETED' THEN 'COMPLETED' WHEN 'CANCELLED' THEN 'CANCELLED' ELSE 'STARTED' END,
        r.channel,
        r.started_at,
        r.completed_at,
        r.duration_seconds,
        r.created_at,
        NULL::varchar,
        NULL::varchar,
        NULL::uuid,
        true
      FROM survey_responses r
      JOIN surveys s ON s.id = r.survey_id
      WHERE r.recipient_id IS NULL
    ) a`;
  }

  private responseFilter(companyId: string, query: ResponseQueryDto, options?: { status?: boolean; ids?: boolean }) {
    const params: unknown[] = [companyId];
    const where = ['a.company_id = $1'];
    if (query.surveyId) {
      params.push(query.surveyId);
      where.push(`a.survey_id = $${params.length}`);
    }
    if (options?.status !== false && query.status) {
      params.push(query.status === 'PARTIAL' ? 'STARTED' : query.status);
      where.push(`a.status = $${params.length}`);
    }
    if (query.channel) {
      params.push(query.channel);
      where.push(`a.channel = $${params.length}`);
    }
    if (query.q?.trim()) {
      params.push(`%${query.q.trim()}%`);
      where.push(`(a.anonymous = false AND (COALESCE(a.display_name, '') ILIKE $${params.length} OR COALESCE(a.normalized_phone, '') ILIKE $${params.length}))`);
    }
    if (query.from) {
      params.push(query.from.length <= 10 ? `${query.from}T00:00:00+03:00` : query.from);
      where.push(`COALESCE(a.started_at, a.created_at) >= $${params.length}`);
    }
    if (query.to) {
      params.push(query.to.length <= 10 ? `${query.to}T23:59:59.999+03:00` : query.to);
      where.push(`COALESCE(a.started_at, a.created_at) <= $${params.length}`);
    }
    if (query.groupId) {
      params.push(query.groupId);
      where.push(`EXISTS (SELECT 1 FROM contact_group_members m WHERE m.contact_id = a.contact_id AND m.group_id = $${params.length})`);
    }
    if (query.tagId) {
      params.push(query.tagId);
      where.push(`EXISTS (SELECT 1 FROM contact_tag_members m WHERE m.contact_id = a.contact_id AND m.tag_id = $${params.length})`);
    }
    const ids = options?.ids === false ? [] : this.parseResponseIds(query.ids);
    if (ids.length) {
      params.push(ids);
      where.push(`a.id = ANY($${params.length}::uuid[])`);
    }
    return { where, params };
  }

  private parseResponseIds(raw?: string) {
    if (!raw?.trim()) return [];
    const ids = raw.split(',').map((item) => item.trim()).filter(Boolean);
    if (ids.length > 500) throw new BadRequestException('En fazla 500 yanıt seçilebilir.');
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (ids.some((id) => !uuid.test(id))) throw new BadRequestException('Seçilen yanıtlar geçersiz.');
    return ids;
  }

  private async responseExportRows(companyId: string, query: ResponseQueryDto) {
    const lines: string[][] = [];
    let cursorAt: string | null = null;
    let cursorId: string | null = null;
    for (;;) {
      const batch = await this.responseExportBatch(companyId, query, cursorAt, cursorId);
      if (!batch.lines.length) break;
      lines.push(...batch.lines);
      cursorAt = batch.cursorAt;
      cursorId = batch.cursorId;
      if (batch.lines.length < 500) break;
    }
    return lines;
  }

  private async responseExportBatch(companyId: string, query: ResponseQueryDto, cursorAt: string | null, cursorId: string | null) {
    const listed = this.responseFilter(companyId, query);
    let cursorSql = '';
    if (cursorAt && cursorId) {
      listed.params.push(cursorAt, cursorId);
      cursorSql = ` AND (a.created_at, a.id) < ($${listed.params.length - 1}::timestamptz, $${listed.params.length}::uuid)`;
    }
    const rows: Record<string, unknown>[] = await this.dataSource.query(
      `SELECT a.id, a.response_id, a.survey_name, a.anonymous, a.status, a.channel,
              a.started_at, a.completed_at, a.duration_seconds, a.created_at,
              a.display_name, a.normalized_phone, a.has_response
       FROM ${this.activityFrom()}
       WHERE ${listed.where.join(' AND ')}${cursorSql}
       ORDER BY a.created_at DESC, a.id DESC
       LIMIT 500`,
      listed.params,
    );
    const lines = rows.map((row) => {
      const hidden = this.hideIdentity(row);
      return [
        hidden.anonymous ? 'Anonim' : String(hidden.name || ''),
        hidden.anonymous ? '' : String(hidden.phone || ''),
        String(hidden.surveyName || ''),
        hidden.startedAt ? new Date(String(hidden.startedAt)).toLocaleString('tr-TR') : '',
        hidden.completedAt ? new Date(String(hidden.completedAt)).toLocaleString('tr-TR') : '',
        hidden.durationSeconds != null && hidden.status === 'COMPLETED' ? `${Math.max(1, Math.round(Number(hidden.durationSeconds) / 60))} dk` : '',
        responseStatusLabel(String(hidden.status || '')),
        responseChannelLabel(String(hidden.channel || '')),
      ];
    });
    const last = rows[rows.length - 1];
    const created = last?.created_at instanceof Date ? last.created_at : last?.created_at ? new Date(String(last.created_at)) : null;
    return {
      lines,
      cursorAt: created ? created.toISOString() : cursorAt,
      cursorId: last ? String(last.id) : cursorId,
    };
  }

  private hideIdentity(row: Record<string, unknown>) {
    const anonymous = Boolean(row.anonymous);
    return {
      id: row.id,
      responseId: row.response_id || null,
      surveyId: row.survey_id,
      surveyName: row.survey_name,
      anonymous,
      hasResponse: Boolean(row.has_response),
      status: row.status,
      channel: row.channel,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      durationSeconds: row.duration_seconds,
      name: anonymous ? '' : row.display_name || '',
      phone: anonymous ? '' : row.normalized_phone || '',
    };
  }

  private answerLabel(answer: Record<string, unknown>, optionLabel = new Map<string, string>()) {
    if (Array.isArray(answer.value_json)) {
      return (answer.value_json as string[]).map((id) => optionLabel.get(id) || id).join(', ');
    }
    if (answer.option_label) return String(answer.option_label);
    if (answer.value_number != null) return String(answer.value_number);
    return String(answer.value_text || '');
  }
}

type ExportQuestion = { id: string; type: string; options: { id: string; label: string }[] };

function exportQuestion(question: { id: string; type: string; options: { id: string; label: string }[] }): ExportQuestion {
  return { id: question.id, type: question.type, options: question.options };
}

function csvCell(value: string) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function responseStatusLabel(status: string) {
  if (status === 'COMPLETED') return 'Tamamlandı';
  if (status === 'CANCELLED') return 'Geçersiz / İptal';
  if (status === 'STARTED') return 'Başlayan';
  if (status === 'OPENED') return 'Açılan';
  if (status === 'DELIVERED') return 'Teslim edildi';
  if (status === 'FAILED') return 'İletilemedi';
  if (status === 'SENT') return 'Gönderildi';
  return 'Yarım Kaldı';
}

function responseChannelLabel(channel: string) {
  if (channel === 'SMS') return 'SMS';
  if (channel === 'QR') return 'QR Kod';
  return 'Link';
}

function npsFromCounts(rows: { value_number: string; total: string }[]) {
  let detractors = 0;
  let passives = 0;
  let promoters = 0;
  let total = 0;
  for (const row of rows) {
    const value = Number(row.value_number);
    const count = Number(row.total);
    total += count;
    if (value <= 6) detractors += count;
    else if (value <= 8) passives += count;
    else promoters += count;
  }
  const score = total ? Math.round(((promoters - detractors) / total) * 100) : 0;
  return { total, detractors, passives, promoters, score };
}

function fillScale(type: string, rows: { value_number: string; total: string }[], scaleTotal: number) {
  const span = type === 'NPS' ? [0, 10] : type === 'RATING' || type === 'STARS' ? [1, 5] : null;
  if (!span) return [];
  const counts = new Map(rows.map((row) => [Number(row.value_number), Number(row.total)]));
  const points = [];
  for (let value = span[0]; value <= span[1]; value += 1) {
    const count = counts.get(value) ?? 0;
    points.push({
      label: String(value),
      count,
      percent: scaleTotal ? Math.round((count / scaleTotal) * 1000) / 10 : 0,
    });
  }
  return points;
}
