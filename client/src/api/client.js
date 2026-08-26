import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  // WHY: without this the auth cookie is never sent and every request 401s.
  withCredentials: true,
  timeout: 90000, // a cold Render instance can take ~60s to wake
});

let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) onUnauthorized?.();
    return Promise.reject(err);
  }
);

/** Turns an axios error into a string the UI can render directly. */
export function errorMessage(err, fallback = 'Something went wrong') {
  const data = err?.response?.data;
  if (data?.details?.length) return data.details[0].message;
  if (data?.error) return data.error;
  if (err?.code === 'ECONNABORTED') return 'The server took too long to respond.';
  if (!err?.response) return 'Could not reach the server.';
  return fallback;
}
