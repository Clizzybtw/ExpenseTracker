import { z } from 'zod';

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const HEX = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a 6-digit hex colour');

const AMOUNT = z.coerce
  .number({ invalid_type_error: 'Amount must be a number' })
  .positive('Amount must be greater than 0')
  .max(9999999999.99, 'Amount is too large')
  .refine((n) => Number.isFinite(n), 'Amount must be a number');

/* ---------- auth ---------- */
export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  currency: z.string().trim().toUpperCase().length(3).default('INR'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, 'Password is required'),
});

/* ---------- categories ---------- */
export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(40),
  color: HEX.default('#64748b'),
});

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(40).optional(),
    color: HEX.optional(),
    isArchived: z.boolean().optional(),
  })
  .refine((o) => Object.keys(o).length > 0, 'Nothing to update');

/* ---------- expenses ---------- */
export const createExpenseSchema = z.object({
  amount: AMOUNT,
  date: DATE,
  categoryId: z.string().min(1, 'Pick a category'),
  note: z.string().trim().max(255).optional().or(z.literal('')),
});

export const updateExpenseSchema = z
  .object({
    amount: AMOUNT.optional(),
    date: DATE.optional(),
    categoryId: z.string().min(1).optional(),
    note: z.string().trim().max(255).optional().or(z.literal('')),
  })
  .refine((o) => Object.keys(o).length > 0, 'Nothing to update');

export const listExpensesSchema = z.object({
  from: DATE.optional(),
  to: DATE.optional(),
  categoryId: z.string().optional(),
  search: z.string().trim().max(100).optional(),
  sort: z.enum(['date', 'amount']).default('date'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

/* ---------- budgets ---------- */
const allocationSchema = z.object({
  categoryId: z.string().min(1),
  limit: AMOUNT,
});

const budgetBase = {
  name: z.string().trim().min(1, 'Name is required').max(60),
  periodType: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM']).default('MONTHLY'),
  startDate: DATE,
  endDate: DATE,
  totalLimit: AMOUNT.nullable().optional(),
  allocations: z.array(allocationSchema).max(50).default([]),
};

const noDuplicateCategories = (data, ctx) => {
  const ids = data.allocations?.map((a) => a.categoryId) ?? [];
  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['allocations'],
      message: 'Each category can only be allocated once',
    });
  }
  if (data.startDate && data.endDate && data.endDate < data.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endDate'],
      message: 'End date must be on or after the start date',
    });
  }
};

export const createBudgetSchema = z.object(budgetBase).superRefine(noDuplicateCategories);

export const updateBudgetSchema = z
  .object({
    name: budgetBase.name.optional(),
    periodType: budgetBase.periodType.optional(),
    startDate: DATE.optional(),
    endDate: DATE.optional(),
    totalLimit: AMOUNT.nullable().optional(),
    allocations: z.array(allocationSchema).max(50).optional(),
  })
  .superRefine(noDuplicateCategories);

/* ---------- analytics ---------- */
export const rangeSchema = z.object({
  from: DATE.optional(),
  to: DATE.optional(),
});

export const trendSchema = z.object({
  from: DATE.optional(),
  to: DATE.optional(),
  groupBy: z.enum(['day', 'month']).default('day'),
});

export const compareSchema = z.object({
  months: z.coerce.number().int().min(2).max(24).default(6),
});
