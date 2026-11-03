import { apiRequest } from "./auth";

export type BudgetRecord = {
  id: string;
  category: string;
  limit_amount: string;
  spent_amount: string;
  remaining_amount: string;
  usage_percent: string;
  is_over_limit: boolean;
  currency: "RUB";
  year: number;
  month: number;
};

export type BudgetCreateInput = {
  category: string;
  limit_amount: string;
  year: number;
  month: number;
};

export type BudgetUpdateInput = {
  limit_amount: string;
};

export const budgetsApi = {
  list: (year: number, month: number) =>
    apiRequest<BudgetRecord[]>(`/api/v1/budgets?year=${year}&month=${month}`),

  create: (payload: BudgetCreateInput) =>
    apiRequest<BudgetRecord>("/api/v1/budgets", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: BudgetUpdateInput) =>
    apiRequest<BudgetRecord>(`/api/v1/budgets/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  remove: (id: string) =>
    apiRequest<void>(`/api/v1/budgets/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
};
