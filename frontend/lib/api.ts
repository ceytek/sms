import { getAccessToken } from "@/lib/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', headers = {}, body } = options;

  const token = getAccessToken();

  const config: RequestInit = {
    method,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}/${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Bir hata oluştu' }));
    throw new Error(readableError(error.message) || 'Bir hata oluştu');
  }

  return response.json();
}

export async function apiUpload<T>(endpoint: string, formData: FormData): Promise<T> {
  const token = getAccessToken();
  const response = await fetch(`${API_URL}/${endpoint}`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Bir hata oluştu' }));
    throw new Error(readableError(error.message) || 'Bir hata oluştu');
  }

  return response.json();
}

export async function apiBlob(endpoint: string): Promise<Blob> {
  const token = getAccessToken();
  const response = await fetch(`${API_URL}/${endpoint}`, {
    cache: 'no-store',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Bir hata oluştu' }));
    throw new Error(readableError(error.message) || 'Bir hata oluştu');
  }

  return response.blob();
}

function readableError(message: unknown) {
  const text = Array.isArray(message) ? message.map(String).join(', ') : String(message ?? '');
  const empty = [...text.matchAll(/questions\.(\d+)\.text\b/gi)].map((item) => Number(item[1]) + 1);
  if (empty.length === 1) return `${empty[0]}. sorunun metnini yazın.`;
  if (empty.length > 1) {
    const labels = empty.map(String);
    const list = labels.length === 2 ? `${labels[0]} ve ${labels[1]}` : `${labels.slice(0, -1).join(', ')} ve ${labels[labels.length - 1]}`;
    return `${list}. soruların metnini yazın.`;
  }
  if (/\bmust be\b|\bshould not\b|Internal server error/i.test(text)) {
    return 'Bazı alanlar eksik veya hatalı. Kontrol edip tekrar deneyin.';
  }
  return text;
}
