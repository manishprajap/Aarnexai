// src/api.ts

const BASE_URL = 'https://aarnexai.com/aarnexai-backend/api';

const getToken = () =>
  localStorage.getItem('token') ||
  localStorage.getItem('auth_token') ||
  localStorage.getItem('delivery_token') ||
  localStorage.getItem('access_token');

const parseJsonSafely = async (response: Response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    console.error('Non-JSON response body:', text.slice(0, 500));
    throw new Error(
      `Server returned a non-JSON response (status ${response.status}). Check the console for details.`
    );
  }
};

export const apiPost = async (endpoint: string, data: unknown) => {
  const token = getToken();
  const isFormData = data instanceof FormData;

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      'Accept': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: isFormData ? (data as FormData) : JSON.stringify(data),
  });

  const json = await parseJsonSafely(response);

  if (!response.ok) {
    throw json ?? { message: `Request failed with status ${response.status}` };
  }

  return json;
};

export const apiGet = async (endpoint: string) => {
  const token = getToken();

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });

  const json = await parseJsonSafely(response);

  if (!response.ok) {
    throw json ?? { message: `Request failed with status ${response.status}` };
  }

  return json;
};