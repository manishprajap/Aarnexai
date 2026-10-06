// src/api.ts

const BASE_URL = 'https://aarnexai.com/aarnexai-backend/api';

/* -------------------------------------------------------------------------- */
/* Token                                                                      */
/* -------------------------------------------------------------------------- */

const getToken = (): string | null =>
  localStorage.getItem('token') ||
  localStorage.getItem('auth_token') ||
  localStorage.getItem('delivery_token') ||
  localStorage.getItem('access_token');

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type ApiErrorData = {
  success?: boolean;
  state?: string;
  code?: string;
  message?: string;
  error?: string;
  step?: string;

  detail?: unknown;

  [key: string]: unknown;
};

export class ApiError extends Error {
  status: number;
  data: ApiErrorData | null;

  constructor(message: string, status: number, data: ApiErrorData | null = null) {
    super(message);

    this.name = 'ApiError';
    this.status = status;
    this.data = data;

    // Required when extending Error in some JS/TS targets.
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/* -------------------------------------------------------------------------- */
/* JSON parser                                                                */
/* -------------------------------------------------------------------------- */

const parseJsonSafely = async (response: Response): Promise<unknown> => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    console.error('Non-JSON response body:', text.slice(0, 500));

    throw new ApiError(
      `Server returned a non-JSON response (status ${response.status}). Check the console for details.`,
      response.status
    );
  }
};

/* -------------------------------------------------------------------------- */
/* Error helper                                                               */
/* -------------------------------------------------------------------------- */

const createApiError = (response: Response, json: unknown): ApiError => {
  // If the backend returned an object, preserve it on `error.data`.
  const data: ApiErrorData | null =
    json && typeof json === 'object' ? (json as ApiErrorData) : null;

  // Prefer the backend's own message.
  const message =
    data?.message || `Request failed with status ${response.status}`;

  return new ApiError(message, response.status, data);
};

/* -------------------------------------------------------------------------- */
/* Shared request helper                                                      */
/* -------------------------------------------------------------------------- */

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

async function request<T>(
  method: HttpMethod,
  endpoint: string,
  data?: unknown
): Promise<T> {
  const token = getToken();

  const hasBody = data !== undefined;
  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,

    headers: {
      // Let the browser set the multipart boundary for FormData.
      ...(hasBody && !isFormData ? { 'Content-Type': 'application/json' } : {}),

      Accept: 'application/json',

      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },

    ...(hasBody
      ? { body: isFormData ? (data as FormData) : JSON.stringify(data) }
      : {}),
  });

  const json = await parseJsonSafely(response);

  // Preserve BOTH response.status AND the backend JSON body.
  if (!response.ok) {
    throw createApiError(response, json);
  }

  return json as T;
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/*                                                                            */
/* T defaults to `any` so existing call sites such as `res.banners` or        */
/* `res.success` type-check. Pass a type to opt into stricter checking:       */
/*   const res = await apiGet<{ banners: Banner[] }>('/banners');             */
/* -------------------------------------------------------------------------- */

export const apiGet = <T = any>(endpoint: string): Promise<T> =>
  request<T>('GET', endpoint);

export const apiPost = <T = any>(endpoint: string, data?: unknown): Promise<T> =>
  request<T>('POST', endpoint, data);

export const apiPut = <T = any>(endpoint: string, data?: unknown): Promise<T> =>
  request<T>('PUT', endpoint, data);

export const apiDelete = <T = any>(endpoint: string): Promise<T> =>
  request<T>('DELETE', endpoint);