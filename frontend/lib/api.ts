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
    const message = Array.isArray(error.message) ? error.message.join(', ') : error.message;
    throw new Error(message || `HTTP ${response.status}`);
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
    const message = Array.isArray(error.message) ? error.message.join(', ') : error.message;
    throw new Error(message || `HTTP ${response.status}`);
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
    const message = Array.isArray(error.message) ? error.message.join(', ') : error.message;
    throw new Error(message || `HTTP ${response.status}`);
  }

  return response.blob();
}
