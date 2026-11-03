import { apiRequest } from "./auth";

export type TransactionType = "income" | "expense";
export type SummaryPeriod = "week" | "month" | "year";

export type TransactionRecord = {
  id: string;
  type: TransactionType;
  amount: string;
  currency: "RUB";
  category: string;
  description: string;
  occurred_at: string;
  created_at: string;
};

export type TransactionInput = {
  type: TransactionType;
  amount: string;
  category: string;
  description: string;
  occurred_at?: string;
};

export type SummaryPoint = {
  label: string;
  income: string;
  expenses: string;
};

export type CategoryExpense = {
  category: string;
  amount: string;
};

export type TransactionSummary = {
  balance: string;
  total_income: string;
  total_expenses: string;
  period_income: string;
  period_expenses: string;
  series: SummaryPoint[];
  expenses_by_category: CategoryExpense[];
};

export const transactionsApi = {
  list: (limit = 100) =>
    apiRequest<TransactionRecord[]>(`/api/v1/transactions?limit=${limit}`),

  create: (payload: TransactionInput) =>
    apiRequest<TransactionRecord>("/api/v1/transactions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  remove: (id: string) =>
    apiRequest<void>(`/api/v1/transactions/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  summary: (period: SummaryPeriod) =>
    apiRequest<TransactionSummary>(`/api/v1/transactions/summary?period=${period}`),
};
