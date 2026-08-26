import { api } from './client';

export const authApi = {
  register: (data) => api.post('/auth/register', data).then((r) => r.data.user),
  login: (data) => api.post('/auth/login', data).then((r) => r.data.user),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me').then((r) => r.data.user),
  updateCurrency: (currency) => api.patch('/auth/me', { currency }).then((r) => r.data.user),
};
