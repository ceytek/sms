import { Logger } from '@nestjs/common';
import { RetryableProviderError } from './sms-provider.adapter.js';

const log = new Logger('ProviderHttp');

export function basicAuthorizationHeader(username: string, password: string) {
  return `Basic ${Buffer.from(`${username}:${password}`, 'utf8').toString('base64')}`;
}

export function maskAuthorization(value?: string | null) {
  if (!value) return value;
  return value.replace(/^(Basic)\s+.+$/i, '$1 ***');
}

export function sanitizeProviderError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return message
    .replace(/Authorization:\s*Basic\s+\S+/gi, 'Authorization: Basic ***')
    .replace(/Basic\s+[A-Za-z0-9+/=]{8,}/g, 'Basic ***')
    .replace(/([?&]sifre=)[^&]*/gi, '$1***')
    .replace(/([?&]kullanici=)[^&]*/gi, '$1***');
}

export async function providerJsonRequest(input: {
  method: 'GET' | 'POST';
  url: string;
  username: string;
  password: string;
  body?: unknown;
  timeoutMs: number;
}): Promise<{ status: number; json: Record<string, unknown> | null; raw: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1000, input.timeoutMs));
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: basicAuthorizationHeader(input.username, input.password),
  };
  if (input.body !== undefined) headers['Content-Type'] = 'application/json';

  try {
    const response = await fetch(input.url, {
      method: input.method,
      headers,
      body: input.body === undefined ? undefined : JSON.stringify(input.body),
      signal: controller.signal,
    });
    const raw = await response.text();
    let json: Record<string, unknown> | null = null;
    if (raw) {
      try {
        json = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        json = null;
      }
    }
    log.debug(`Provider HTTP ${input.method} ${safeUrl(input.url)} -> ${response.status}`);
    return { status: response.status, json, raw: raw.slice(0, 4000) };
  } catch (err) {
    const message = sanitizeProviderError(err);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new RetryableProviderError('Provider timeout');
    }
    if (/timeout|ECONNRESET|ENOTFOUND|ECONNREFUSED|fetch failed/i.test(message)) {
      throw new RetryableProviderError(message);
    }
    throw new RetryableProviderError(message || 'Provider baglanti hatasi');
  } finally {
    clearTimeout(timer);
  }
}

function safeUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.search = '';
    parsed.username = '';
    parsed.password = '';
    return parsed.toString();
  } catch {
    return '[invalid-url]';
  }
}
