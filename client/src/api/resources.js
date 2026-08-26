import { api } from './client';

export const categoriesApi = {
  list: (includeArchived = false) =>
    api.get('/categories', { params: { includeArchived } }).then((r) => r.data.categories),
  create: (data) => api.post('/categories', data).then((r) => r.data.category),
  update: (id, data) => api.patch(`/categories/${id}`, data).then((r) => r.data.category),
  remove: (id) => api.delete(`/categories/${id}`),
};

export const expensesApi = {
  list: (params) => api.get('/expenses', { params }).then((r) => r.data),
  create: (data) => api.post('/expenses', data).then((r) => r.data.expense),
  update: (id, data) => api.patch(`/expenses/${id}`, data).then((r) => r.data.expense),
  remove: (id) => api.delete(`/expenses/${id}`),
};

export const budgetsApi = {
  list: () => api.get('/budgets').then((r) => r.data.budgets),
  get: (id) => api.get(`/budgets/${id}`).then((r) => r.data.budget),
  progress: (id) => api.get(`/budgets/${id}/progress`).then((r) => r.data),
  create: (data) => api.post('/budgets', data).then((r) => r.data.budget),
  update: (id, data) => api.patch(`/budgets/${id}`, data).then((r) => r.data.budget),
  remove: (id) => api.delete(`/budgets/${id}`),
};

export const analyticsApi = {
  summary: (params) => api.get('/analytics/summary', { params }).then((r) => r.data),
  byCategory: (params) => api.get('/analytics/by-category', { params }).then((r) => r.data.categories),
  trend: (params) => api.get('/analytics/trend', { params }).then((r) => r.data),
  compare: (months = 6) => api.get('/analytics/compare', { params: { months } }).then((r) => r.data.months),
  activeBudget: () => api.get('/analytics/active-budget').then((r) => r.data.budgetId),
};
