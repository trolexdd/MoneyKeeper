import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Activity, ArrowDownLeft, ArrowUpRight, Bell, BriefcaseBusiness,
  CarFront, ChevronDown, CircleHelp, Coffee, CreditCard, Download, Ellipsis,
  FileText, House, LayoutDashboard, LogOut, Plus, Search, Settings2, ShoppingBag,
  SlidersHorizontal, Sparkles, Wallet, X, Trash2, ChevronLeft, ChevronRight,
  Pencil, CircleAlert, CheckCircle2, CalendarDays, Target
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import AuthPage from "./AuthPage";
import { authApi, clearSession, restoreSession, saveSession, signOut, type User } from "./lib/auth";
import {
  transactionsApi,
  type TransactionRecord,
  type TransactionSummary,
  type TransactionType,
  type SummaryPeriod
} from "./lib/transactions";
import { budgetsApi, type BudgetRecord } from "./lib/budgets";

type Period = "Week" | "Month" | "Year";
type Transaction = {
  id: string;
  name: string;
  category: string;
  date: string;
  amount: number;
  type: TransactionType;
  icon: "home" | "food" | "shopping" | "transport" | "work";
};

function money(value: number) {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 2 }).format(value);
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
  }).format(new Date(value));
}

function mapTransaction(record: TransactionRecord): Transaction {
  const category = record.category.toLowerCase();
  let icon: Transaction["icon"] = record.type === "income" ? "work" : "shopping";
  if (category.includes("жиль") || category.includes("дом")) icon = "home";
  else if (category.includes("продукт") || category.includes("каф")) icon = "food";
  else if (category.includes("транспорт")) icon = "transport";
  return {
    id: record.id,
    name: record.description,
    category: record.category,
    date: dateLabel(record.occurred_at),
    amount: Number(record.amount),
    type: record.type,
    icon
  };
}

function TransactionIcon({ type }: { type: Transaction["icon"] }) {
  const icons = { home: House, food: Coffee, shopping: ShoppingBag, transport: CarFront, work: BriefcaseBusiness };
  const Icon = icons[type];
  return <Icon size={17} strokeWidth={1.8} />;
}

type ChartPoint = { label: string; income: number; expenses: number };

type CashflowPanelProps = {
  data: ChartPoint[];
  period: Period;
  onPeriodChange: (period: Period) => void;
  income: number;
  expenses: number;
  loading: boolean;
};

function CashflowPanel({
  data,
  period,
  onPeriodChange,
  income,
  expenses,
  loading,
}: CashflowPanelProps) {
  return (
    <article className="panel cashflow-panel">
      <div className="panel-heading">
        <div>
          <div className="panel-kicker">ДВИЖЕНИЕ ДЕНЕГ</div>
          <h2>Движение средств</h2>
          <p>Следите за доходами и расходами.</p>
        </div>
        <div className="period-switch" role="group" aria-label="Период графика">
          {(["Week", "Month", "Year"] as Period[]).map((item) => (
            <button
              key={item}
              className={period === item ? "selected" : ""}
              onClick={() => onPeriodChange(item)}
            >
              {({ Week: "Неделя", Month: "Месяц", Year: "Год" })[item]}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-summary">
        <div><span className="chart-legend income-legend" /><span>Доход</span><strong>{money(income)}</strong></div>
        <div><span className="chart-legend expense-legend" /><span>Расходы</span><strong>{money(expenses)}</strong></div>
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c7f36b" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#c7f36b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#55d6ff" stopOpacity={0.13} />
                <stop offset="100%" stopColor="#55d6ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#26323d" strokeDasharray="3 5" vertical={false} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#778592", fontSize: 11 }} dy={12} />
            <Tooltip
              contentStyle={{ background: "#18232d", border: "1px solid #30404e", borderRadius: 12, color: "#f3f6f8", fontSize: 12 }}
              formatter={(value) => money(Number(value))}
            />
            <Area type="monotone" dataKey="income" stroke="#c7f36b" strokeWidth={2.4} fill="url(#incomeGradient)" />
            <Area type="monotone" dataKey="expenses" stroke="#55d6ff" strokeWidth={2.1} fill="url(#expenseGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-bottom-note">
        <span><span className="note-pulse" /> {loading ? "Обновляем данные..." : "Данные аккаунта"}</span>
        <span>Чистый поток <strong>{money(income - expenses)}</strong></span>
      </div>
    </article>
  );
}

type CategoryBreakdownProps = {
  items: { category: string; amount: string }[];
  total: number;
  periodName: string;
};

function CategoryBreakdownPanel({ items, total, periodName }: CategoryBreakdownProps) {
  const maxAmount = Math.max(0, ...items.map((item) => Number(item.amount)));
  return (
    <article className="panel budget-panel">
      <div className="panel-heading budget-heading">
        <div>
          <div className="panel-kicker">СТРУКТУРА РАСХОДОВ</div>
          <h2>По категориям</h2>
          <p>Распределение расходов за {periodName}.</p>
        </div>
      </div>
      <div className="budget-total-row">
        <div><strong>{money(total)}</strong><span> всего за период</span></div>
        <span className="budget-percent">{items.length} кат.</span>
      </div>
      <div className="budget-list">
        {items.length === 0 ? (
          <div className="empty-state">Пока нет расходов за выбранный период.</div>
        ) : items.slice(0, 8).map((item, index) => {
          const color = ["lime", "cyan", "violet"][index % 3];
          const amount = Number(item.amount);
          const percent = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
          return (
            <div className="budget-item" key={item.category}>
              <div className="budget-item-top">
                <span className={"budget-category-icon " + color}>₽</span>
                <strong>{item.category}</strong>
                <span className="budget-amount">{money(amount)}</span>
              </div>
              <div className={"budget-track " + color}>
                <span style={{ width: percent + "%" }} />
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

type TransactionsPanelProps = {
  items: Transaction[];
  loading: boolean;
  query: string;
  compact?: boolean;
  onDelete: (id: string) => void;
  onViewAll?: () => void;
};

function TransactionsPanel({
  items,
  loading,
  query,
  compact = false,
  onDelete,
  onViewAll,
}: TransactionsPanelProps) {
  return (
    <section className="panel transactions-panel">
      <div className="panel-heading transactions-heading">
        <div>
          <div className="panel-kicker">{compact ? "ПОСЛЕДНИЕ ОПЕРАЦИИ" : "ВАША ФИНАНСОВАЯ ИСТОРИЯ"}</div>
          <h2>{compact ? "Последние операции" : "Все операции"}</h2>
          <p>{compact ? "Недавние движения средств в вашем аккаунте." : "Полная история доходов и расходов."}</p>
        </div>
        {compact && onViewAll && (
          <button className="secondary-button compact-button" onClick={onViewAll}>
            Все операции <ArrowUpRight size={14} />
          </button>
        )}
      </div>
      <div className="transaction-table">
        <div className="transaction-table-head">
          <span>ОПЕРАЦИЯ</span><span>КАТЕГОРИЯ</span><span>ДАТА</span><span className="amount-heading">СУММА</span>
        </div>
        {loading ? (
          <div className="empty-state">Загружаем операции...</div>
        ) : items.length > 0 ? items.map((item) => (
          <div className="transaction-row" key={item.id}>
            <div className="transaction-name">
              <span className={"transaction-icon " + item.icon}><TransactionIcon type={item.icon} /></span>
              <strong>{item.name}</strong>
              <button
                className="transaction-delete"
                type="button"
                title="Удалить операцию"
                aria-label={"Удалить " + item.name}
                onClick={() => onDelete(item.id)}
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="transaction-category">{item.category}</div>
            <div className="transaction-date">{item.date}</div>
            <div className={"transaction-amount " + (item.type === "income" ? "credit" : "")}>
              {item.type === "income" ? "+" : "−"}{money(item.amount)}
            </div>
          </div>
        )) : (
          <div className="empty-state">
            {query ? "По этому запросу операций нет." : "Операций пока нет. Добавьте первую через кнопку выше."}
          </div>
        )}
      </div>
    </section>
  );
}

const navItems = [
  { label: "Обзор", icon: LayoutDashboard },
  { label: "Операции", icon: Activity },
  { label: "Бюджеты", icon: SlidersHorizontal },
  { label: "Карты", icon: CreditCard }
];

const mobileNavItems = [
  ...navItems,
  { label: "Умная аналитика", icon: Sparkles },
  { label: "Отчёты", icon: FileText },
  { label: "Настройки", icon: Settings2 }
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("Month");
  const [activeNav, setActiveNav] = useState("Обзор");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  const [query, setQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [formName, setFormName] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formType, setFormType] = useState<TransactionType>("expense");
  const [formCategory, setFormCategory] = useState("Продукты");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [budgets, setBudgets] = useState<BudgetRecord[]>([]);
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [budgetError, setBudgetError] = useState("");
  const [budgetMonth, setBudgetMonth] = useState(() => {
    const today = new Date();
    return `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}`;
  });
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetRecord | null>(null);
  const [budgetCategory, setBudgetCategory] = useState("Продукты");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetModalError, setBudgetModalError] = useState("");
  const [budgetSaving, setBudgetSaving] = useState(false);

  useEffect(() => {
    let active = true;
    restoreSession()
      .then((restoredUser) => { if (active) setUser(restoredUser); })
      .finally(() => { if (active) setAuthLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setSummary(null);
      setDataLoading(false);
      return;
    }
    let active = true;
    setTransactions([]);
    setSummary(null);
    setDataLoading(true);
    setDataError("");
    const selectedPeriod = period.toLowerCase() as SummaryPeriod;

    Promise.all([transactionsApi.list(500), transactionsApi.summary(selectedPeriod)])
      .then(([records, nextSummary]) => {
        if (!active) return;
        setTransactions(records.map(mapTransaction));
        setSummary(nextSummary);
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof Error && error.message.includes("Сессия истекла")) {
          setUser(null);
          return;
        }
        setDataError(error instanceof Error ? error.message : "Не удалось загрузить данные.");
      })
      .finally(() => {
        if (active) setDataLoading(false);
      });

    return () => { active = false; };
  }, [user, period]);

  useEffect(() => {
    if (!user || activeNav !== "Бюджеты") {
      if (!user) setBudgets([]);
      return;
    }

    let active = true;
    const [year, month] = budgetMonth.split("-").map(Number);
    setBudgetLoading(true);
    setBudgets([]);
    setBudgetError("");

    budgetsApi.list(year, month)
      .then((records) => {
        if (active) setBudgets(records);
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof Error && error.message.includes("Сессия истекла")) {
          setUser(null);
          return;
        }
        setBudgetError(error instanceof Error ? error.message : "Не удалось загрузить бюджеты.");
      })
      .finally(() => {
        if (active) setBudgetLoading(false);
      });

    return () => { active = false; };
  }, [user, activeNav, budgetMonth]);

  async function handleLogin(email: string, password: string) {
    const session = await authApi.login({ email, password });
    saveSession(session);
    setUser(session.user);
  }

  async function handleRegister(email: string, password: string) {
    const session = await authApi.register({ email, password });
    saveSession(session);
    setUser(session.user);
  }

  async function handleLogout() {
    await signOut();
    clearSession();
    setUser(null);
  }

  const visibleTransactions = useMemo(
    () => transactions.filter((item) => (item.name + " " + item.category).toLowerCase().includes(query.toLowerCase())),
    [transactions, query]
  );
  const chartData = useMemo(
    () => summary?.series.map((point) => ({
      label: point.label,
      income: Number(point.income),
      expenses: Number(point.expenses)
    })) ?? [],
    [summary]
  );
  const categoryExpenses = summary?.expenses_by_category ?? [];
  const periodName = ({ Week: "неделю", Month: "месяц", Year: "год" })[period];
  const periodLabel = ({ Week: "НЕДЕЛЮ", Month: "МЕСЯЦ", Year: "ГОД" })[period];
  const pageCopy: Record<string, { eyebrow: string; title: string; accent: string; subtitle: string }> = {
    "Обзор": { eyebrow: "ВАШИ ФИНАНСЫ", title: "Ваши деньги —", accent: "под контролем.", subtitle: "Все важные показатели и последние движения средств в одном месте." },
    "Операции": { eyebrow: "ЛИЧНЫЙ ЖУРНАЛ", title: "История", accent: "операций.", subtitle: "Все доходы и расходы, сохранённые в вашем аккаунте." },
    "Бюджеты": { eyebrow: "ПЛАНИРОВАНИЕ", title: "Расходы под", accent: "контролем.", subtitle: "Следите за распределением расходов и готовьте лимиты на категории." },
    "Карты": { eyebrow: "ВАШИ СЧЕТА", title: "Деньги в одном", accent: "месте.", subtitle: "Раздел счетов и банковских карт будет подключён следующим этапом." },
    "Умная аналитика": { eyebrow: "АНАЛИТИКА", title: "Понимайте свои", accent: "финансы глубже.", subtitle: "Фактические доходы, расходы и динамика за выбранный период." },
    "Отчёты": { eyebrow: "ЭКСПОРТ ДАННЫХ", title: "Финансовые", accent: "отчёты.", subtitle: "Скачивайте историю операций для собственных расчётов и хранения." },
    "Настройки": { eyebrow: "ПРОФИЛЬ", title: "Настройки", accent: "аккаунта.", subtitle: "Информация о вашем аккаунте и текущей сессии." }
  };
  const currentPage = pageCopy[activeNav] ?? pageCopy["Обзор"];
  const [budgetYear, budgetMonthNumber] = budgetMonth.split("-").map(Number);
  const budgetMonthTitle = new Date(budgetYear, budgetMonthNumber - 1, 1)
    .toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  const budgetTotals = useMemo(() => {
    const limit = budgets.reduce((total, item) => total + Number(item.limit_amount), 0);
    const spent = budgets.reduce((total, item) => total + Number(item.spent_amount), 0);
    return {
      limit,
      spent,
      remaining: limit - spent,
      overLimitCount: budgets.filter((item) => item.is_over_limit).length
    };
  }, [budgets]);

  function moveBudgetMonth(offset: number) {
    const next = new Date(budgetYear, budgetMonthNumber - 1 + offset, 1);
    setBudgetMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
  }

  function openBudgetEditor(budget?: BudgetRecord) {
    setEditingBudget(budget ?? null);
    setBudgetCategory(budget?.category ?? "Продукты");
    setBudgetAmount(budget?.limit_amount ?? "");
    setBudgetModalError("");
    setShowBudgetModal(true);
  }

  async function saveBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(budgetAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setBudgetModalError("Укажите положительный лимит.");
      return;
    }

    setBudgetSaving(true);
    setBudgetModalError("");
    try {
      if (editingBudget) {
        await budgetsApi.update(editingBudget.id, { limit_amount: budgetAmount });
      } else {
        await budgetsApi.create({
          category: budgetCategory,
          limit_amount: budgetAmount,
          year: budgetYear,
          month: budgetMonthNumber
        });
      }
      const refreshed = await budgetsApi.list(budgetYear, budgetMonthNumber);
      setBudgets(refreshed);
      setShowBudgetModal(false);
    } catch (error) {
      setBudgetModalError(error instanceof Error ? error.message : "Не удалось сохранить бюджет.");
    } finally {
      setBudgetSaving(false);
    }
  }

  async function deleteBudget(budget: BudgetRecord) {
    if (!window.confirm(`Удалить бюджет «${budget.category}» за ${budgetMonthTitle}?`)) return;
    setBudgetError("");
    try {
      await budgetsApi.remove(budget.id);
      setBudgets((current) => current.filter((item) => item.id !== budget.id));
    } catch (error) {
      if (error instanceof Error && error.message.includes("Сессия истекла")) setUser(null);
      setBudgetError(error instanceof Error ? error.message : "Не удалось удалить бюджет.");
    }
  }

  function exportTransactionsCsv() {
    const safeText = (value: string) => {
      const normalized = value.replace(/\r?\n/g, " ").trim();
      const protectedValue = /^[=+@	\r-]/.test(normalized) ? "'" + normalized : normalized;
      return '"' + protectedValue.replace(/"/g, '""') + '"';
    };
    const rows = [
      ["Дата", "Тип", "Описание", "Категория", "Сумма", "Валюта"],
      ...transactions.map((item) => [
        item.date,
        item.type === "income" ? "Доход" : "Расход",
        item.name,
        item.category,
        String(item.amount),
        "RUB"
      ])
    ];
    const csv = "\uFEFF" + rows.map((row) => row.map((value, index) =>
      index === 4 ? String(value) : safeText(String(value))
    ).join(";")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "moneykeeper-transactions.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(formAmount);
    if (!formName.trim() || !Number.isFinite(amount) || amount <= 0) {
      setFormError("Укажите описание и положительную сумму.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const created = await transactionsApi.create({
        type: formType,
        amount: formAmount,
        category: formCategory,
        description: formName.trim(),
        occurred_at: new Date().toISOString()
      });
      setTransactions((current) => [mapTransaction(created), ...current]);
      setSummary(await transactionsApi.summary(period.toLowerCase() as SummaryPeriod));
      setFormName("");
      setFormAmount("");
      setShowModal(false);
    } catch (error) {
      if (error instanceof Error && error.message.includes("Сессия истекла")) setUser(null);
      setFormError(error instanceof Error ? error.message : "Не удалось сохранить операцию.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTransaction(id: string) {
    if (!window.confirm("Удалить эту операцию?")) return;
    setDataError("");
    try {
      await transactionsApi.remove(id);
      setTransactions((current) => current.filter((item) => item.id !== id));
      setSummary(await transactionsApi.summary(period.toLowerCase() as SummaryPeriod));
    } catch (error) {
      if (error instanceof Error && error.message.includes("Сессия истекла")) setUser(null);
      setDataError(error instanceof Error ? error.message : "Не удалось удалить операцию.");
    }
  }

  if (authLoading) return <main className="auth-screen"><section className="auth-card"><div className="auth-eyebrow"><span className="live-dot" /> MONEYKEEPER</div><h1>Загружаем аккаунт<span>.</span></h1><p className="auth-subtitle">Проверяем вашу сессию...</p></section></main>;
  if (!user) return <AuthPage onLogin={handleLogin} onRegister={handleRegister} />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" aria-label="MoneyKeeper — обзор" onClick={(event) => { event.preventDefault(); setActiveNav("Обзор"); }}>
          <span className="brand-mark"><Wallet size={19} strokeWidth={2.2} /></span>
          <span className="brand-name">money<span>keeper</span><i>.</i></span>
        </a>
        <button className="workspace-switcher" type="button" onClick={() => setActiveNav("Настройки")}>
          <div className="workspace-avatar">P</div>
          <div className="workspace-copy"><strong>Личный кабинет</strong><span>Бесплатный план</span></div>
          <ChevronDown size={15} />
        </button>
        <div className="nav-label">РАБОЧЕЕ ПРОСТРАНСТВО</div>
        <nav className="main-nav" aria-label="Основная навигация">
          {navItems.map(({ label, icon: Icon }) => (
            <button key={label} title={label} aria-label={label} className={"nav-link " + (activeNav === label ? "active" : "")} onClick={() => setActiveNav(label)}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              {label === "Операции" && <span className="nav-count">{transactions.length}</span>}
            </button>
          ))}
        </nav>
        <div className="nav-label tools-label">ИНСТРУМЕНТЫ</div>
        <nav className="main-nav" aria-label="Инструменты">
          <button title="Умная аналитика" aria-label="Умная аналитика" className={"nav-link " + (activeNav === "Умная аналитика" ? "active" : "")} onClick={() => setActiveNav("Умная аналитика")}><Sparkles size={18} /><span>Умная аналитика</span><span className="new-pill">NEW</span></button>
          <button title="Отчёты" aria-label="Отчёты" className={"nav-link " + (activeNav === "Отчёты" ? "active" : "")} onClick={() => setActiveNav("Отчёты")}><FileText size={18} /><span>Отчёты</span></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <div className="upgrade-icon"><Sparkles size={16} /></div>
            <strong>Держите финансы под контролем.</strong>
            <p>Анализируйте расходы и принимайте решения увереннее.</p>
            <button onClick={() => setActiveNav("Умная аналитика")}>Открыть аналитику <ArrowUpRight size={14} /></button>
            <div className="upgrade-orb" />
          </div>
          <button title="Настройки" aria-label="Настройки" className={"nav-link settings-link " + (activeNav === "Настройки" ? "active" : "")} onClick={() => setActiveNav("Настройки")}><Settings2 size={18} /><span>Настройки</span></button>
          <div className="profile-row">
            <div className="profile-avatar">П</div>
            <div className="profile-copy"><strong>{user.email}</strong><span>Личный аккаунт</span></div>
            <button className="icon-button" type="button" aria-label="Выйти из аккаунта" title="Выйти" onClick={handleLogout}><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      <nav className="mobile-nav" aria-label="Мобильная навигация">
        {mobileNavItems.map(({ label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            title={label}
            aria-label={label}
            className={activeNav === label ? "active" : ""}
            onClick={() => setActiveNav(label)}
          >
            <Icon size={19} strokeWidth={1.8} />
            <span className="mobile-nav-label">
              {label === "Умная аналитика" ? "Аналитика" : label === "Настройки" ? "Профиль" : label}
            </span>
            {label === "Операции" && transactions.length > 0 && <span className="mobile-nav-count">{transactions.length}</span>}
          </button>
        ))}
      </nav>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>Рабочее пространство</span><span className="crumb-slash">/</span><strong>{activeNav}</strong></div>
          <div className="topbar-actions">
            {(activeNav === "Обзор" || activeNav === "Операции") && (
              <label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск операций..." aria-label="Поиск операций" /><kbd>⌘ K</kbd></label>
            )}
            <div className="notification-wrap">
              <button className="icon-button notification-button" aria-label="Уведомления" onClick={() => setShowNotifications((value) => !value)}><Bell size={18} /><i /></button>
              {showNotifications && <div className="notification-popover"><strong>Новых уведомлений нет</strong><span>Здесь появятся новые события.</span></div>}
            </div>
            <button className="help-button" aria-label="Помощь"><CircleHelp size={18} /></button>
          </div>
        </header>

        <div className="page-wrap">
          {dataError && <div className="auth-error dashboard-error" role="alert">{dataError}</div>}
          <section className="page-heading">
            <div>
              <div className="eyebrow"><span className="live-dot" /> {currentPage.eyebrow}</div>
              <h1>{currentPage.title} <em>{currentPage.accent}</em></h1>
              <p className="heading-subtitle">{currentPage.subtitle}</p>
            </div>
            <div className="heading-actions">
              {activeNav !== "Отчёты" && (
                <button className="secondary-button" onClick={() => setActiveNav("Отчёты")}><Download size={16} /> Экспорт</button>
              )}
              {activeNav === "Бюджеты" ? (
                <button className="primary-button" onClick={() => openBudgetEditor()}><Plus size={17} strokeWidth={2.4} /> Создать бюджет</button>
              ) : activeNav !== "Настройки" && activeNav !== "Отчёты" && activeNav !== "Карты" ? (
                <button className="primary-button" onClick={() => { setFormError(""); setShowModal(true); }}><Plus size={17} strokeWidth={2.4} /> Добавить операцию</button>
              ) : null}
            </div>
          </section>

          {activeNav === "Обзор" && (
            <>
              <section className="overview-grid">
                <article className="balance-card">
                  <div className="balance-card-glow" />
                  <div className="balance-topline">
                    <span className="balance-label"><span className="balance-icon"><Wallet size={15} /></span> ОБЩИЙ БАЛАНС</span>
                    <button className="balance-menu" aria-label="Настройки аккаунта" onClick={() => setActiveNav("Настройки")}><Ellipsis size={20} /></button>
                  </div>
                  <div className="balance-value">{money(Number(summary?.balance ?? 0))}</div>
                  <div className="balance-foot"><span className="positive-chip"><ArrowUpRight size={13} /> RUB</span><span className="balance-period">баланс по всем операциям</span></div>
                  <div className="balance-divider" />
                  <div className="balance-breakdown">
                    <div><span className="breakdown-dot income-dot" /><span>Доходы всего</span><strong>{money(Number(summary?.total_income ?? 0))}</strong></div>
                    <div><span className="breakdown-dot expense-dot" /><span>Расходы всего</span><strong>{money(Number(summary?.total_expenses ?? 0))}</strong></div>
                    <div className="balance-card-link">За всё время</div>
                  </div>
                  <div className="balance-decoration">₽</div>
                </article>
                <article className="stat-card income-stat">
                  <div className="stat-card-head"><span>ДОХОДЫ ЗА {periodLabel}</span><span className="stat-icon"><ArrowDownLeft size={17} /></span></div>
                  <div className="stat-value">{money(Number(summary?.period_income ?? 0))}</div>
                  <div className="stat-foot"><span className="positive-text">Поступления</span><span>за выбранный период</span></div>
                </article>
                <article className="stat-card expense-stat">
                  <div className="stat-card-head"><span>РАСХОДЫ ЗА {periodLabel}</span><span className="stat-icon expense-icon"><ArrowUpRight size={17} /></span></div>
                  <div className="stat-value">{money(Number(summary?.period_expenses ?? 0))}</div>
                  <div className="stat-foot"><span className="positive-text">Списания</span><span>за выбранный период</span></div>
                </article>
              </section>
              <section className="content-grid">
                <CashflowPanel
                  data={chartData}
                  period={period}
                  onPeriodChange={setPeriod}
                  income={Number(summary?.period_income ?? 0)}
                  expenses={Number(summary?.period_expenses ?? 0)}
                  loading={dataLoading}
                />
                <CategoryBreakdownPanel items={categoryExpenses} total={Number(summary?.period_expenses ?? 0)} periodName={periodName} />
              </section>
              <TransactionsPanel
                items={visibleTransactions.slice(0, 5)}
                loading={dataLoading}
                query={query}
                compact
                onDelete={(id) => void deleteTransaction(id)}
                onViewAll={() => setActiveNav("Операции")}
              />
            </>
          )}

          {activeNav === "Операции" && (
            <TransactionsPanel
              items={visibleTransactions}
              loading={dataLoading}
              query={query}
              onDelete={(id) => void deleteTransaction(id)}
            />
          )}

          {activeNav === "Бюджеты" && (
            <>
              <section className="budget-period-bar panel">
                <div className="budget-period-title">
                  <div className="panel-kicker">БЮДЖЕТНЫЙ ПЕРИОД</div>
                  <h2>{budgetMonthTitle}</h2>
                </div>
                <div className="budget-period-actions">
                  <button className="icon-button" type="button" aria-label="Предыдущий месяц" onClick={() => moveBudgetMonth(-1)}>
                    <ChevronLeft size={18} />
                  </button>
                  <label className="budget-month-picker">
                    <CalendarDays size={16} />
                    <input
                      type="month"
                      value={budgetMonth}
                      onChange={(event) => event.target.value && setBudgetMonth(event.target.value)}
                      aria-label="Выбрать месяц бюджета"
                    />
                  </label>
                  <button className="icon-button" type="button" aria-label="Следующий месяц" onClick={() => moveBudgetMonth(1)}>
                    <ChevronRight size={18} />
                  </button>
                </div>
              </section>

              {budgetError && <div className="auth-error dashboard-error" role="alert">{budgetError}</div>}

              <section className="budget-summary-grid">
                <article className="panel budget-summary-card">
                  <div className="budget-summary-label"><span className="budget-summary-icon lime"><SlidersHorizontal size={16} /></span> ОБЩИЙ ЛИМИТ</div>
                  <strong>{money(budgetTotals.limit)}</strong>
                  <span>По всем категориям</span>
                </article>
                <article className="panel budget-summary-card">
                  <div className="budget-summary-label"><span className="budget-summary-icon cyan"><Activity size={16} /></span> УЖЕ ПОТРАЧЕНО</div>
                  <strong>{money(budgetTotals.spent)}</strong>
                  <span>Фактические расходы</span>
                </article>
                <article className={"panel budget-summary-card " + (budgetTotals.remaining < 0 ? "is-over" : "")}>
                  <div className="budget-summary-label"><span className="budget-summary-icon violet"><Wallet size={16} /></span> ОСТАТОК</div>
                  <strong>{money(budgetTotals.remaining)}</strong>
                  <span>{budgetTotals.remaining < 0 ? "Превышение общего лимита" : "Доступно по бюджетам"}</span>
                </article>
                <article className={"panel budget-summary-card " + (budgetTotals.overLimitCount > 0 ? "is-over" : "")}>
                  <div className="budget-summary-label"><span className="budget-summary-icon coral"><CircleAlert size={16} /></span> ПРЕВЫШЕНИЯ</div>
                  <strong>{budgetTotals.overLimitCount}</strong>
                  <span>Категорий выше лимита</span>
                </article>
              </section>

              <div className="budget-list-heading">
                <div>
                  <div className="panel-kicker">КАТЕГОРИИ И ЛИМИТЫ</div>
                  <h2>Мои бюджеты</h2>
                  <p>Потрачено считается автоматически по расходным операциям выбранного месяца.</p>
                </div>
                <span className="budget-count">{budgets.length} {budgets.length === 1 ? "категория" : budgets.length > 1 && budgets.length < 5 ? "категории" : "категорий"}</span>
              </div>

              {budgetLoading ? (
                <div className="panel empty-state budget-empty">Загружаем бюджеты...</div>
              ) : budgets.length === 0 ? (
                <section className="panel budget-empty">
                  <div className="feature-icon lime"><Target size={22} /></div>
                  <h2>Пока нет бюджетов на этот месяц</h2>
                  <p>Создайте лимит для категории — MoneyKeeper будет учитывать расходы и покажет, сколько осталось.</p>
                  <button className="primary-button" onClick={() => openBudgetEditor()}>
                    <Plus size={16} /> Создать первый бюджет
                  </button>
                </section>
              ) : (
                <section className="budget-cards-grid">
                  {budgets.map((budget, index) => {
                    const usage = Number(budget.usage_percent);
                    const over = budget.is_over_limit;
                    const warning = !over && usage >= 80;
                    const tone = over ? "over" : warning ? "warning" : "normal";
                    const color = ["lime", "cyan", "violet", "coral"][index % 4];
                    return (
                      <article className={"panel budget-card " + tone} key={budget.id}>
                        <div className="budget-card-top">
                          <div className="budget-card-category">
                            <span className={"budget-category-icon " + color}>₽</span>
                            <div>
                              <strong>{budget.category}</strong>
                              <span>{over ? "Лимит превышен" : warning && usage >= 100 ? "Лимит использован" : warning ? "Почти исчерпан" : "В пределах лимита"}</span>
                            </div>
                          </div>
                          <div className="budget-card-actions">
                            <button className="icon-button" type="button" title="Изменить лимит" aria-label={"Изменить бюджет " + budget.category} onClick={() => openBudgetEditor(budget)}>
                              <Pencil size={15} />
                            </button>
                            <button className="icon-button budget-delete-button" type="button" title="Удалить бюджет" aria-label={"Удалить бюджет " + budget.category} onClick={() => void deleteBudget(budget)}>
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                        <div className="budget-card-numbers">
                          <strong>{money(Number(budget.spent_amount))}</strong>
                          <span>из {money(Number(budget.limit_amount))}</span>
                        </div>
                        <div className="budget-progress-track">
                          <span style={{ width: Math.min(100, Math.max(0, usage)) + "%" }} />
                        </div>
                        <div className="budget-card-bottom">
                          <span className={"budget-usage " + tone}>{usage.toFixed(0)}% использовано</span>
                          <span className="budget-remaining">
                            {Number(budget.remaining_amount) < 0
                              ? "Превышение " + money(Math.abs(Number(budget.remaining_amount)))
                              : "Осталось " + money(Number(budget.remaining_amount))}
                          </span>
                        </div>
                        {over && (
                          <div className="budget-alert over-alert"><CircleAlert size={14} /> Превышен лимит на {money(Math.abs(Number(budget.remaining_amount)))}</div>
                        )}
                        {warning && (
                          <div className="budget-alert warning-alert"><CircleAlert size={14} /> {usage >= 100 ? "Весь лимит уже использован" : "Использовано больше 80% лимита"}</div>
                        )}
                      </article>
                    );
                  })}
                </section>
              )}
            </>
          )}

          {activeNav === "Карты" && (
            <section className="feature-empty panel">
              <div className="feature-icon cyan"><CreditCard size={22} /></div>
              <div className="panel-kicker">СЧЕТА И БАНКОВСКИЕ КАРТЫ</div>
              <h2>Подключение счетов — следующий этап</h2>
              <p>Сейчас MoneyKeeper хранит операции, которые вы добавляете вручную. Синхронизация с банками и управление счетами пока не реализованы.</p>
              <button className="primary-button" onClick={() => { setActiveNav("Операции"); setQuery(""); }}>Перейти к операциям <ArrowUpRight size={15} /></button>
            </section>
          )}

          {activeNav === "Умная аналитика" && (
            <>
              <section className="overview-grid analytics-metrics">
                <article className="stat-card analytics-metric">
                  <div className="stat-card-head"><span>ЧИСТЫЙ ПОТОК</span><span className="stat-icon"><Activity size={17} /></span></div>
                  <div className="stat-value">{money(Number(summary?.period_income ?? 0) - Number(summary?.period_expenses ?? 0))}</div>
                  <div className="stat-foot"><span>Доходы минус расходы</span></div>
                </article>
                <article className="stat-card income-stat analytics-metric">
                  <div className="stat-card-head"><span>ПОСТУПЛЕНИЯ</span><span className="stat-icon"><ArrowDownLeft size={17} /></span></div>
                  <div className="stat-value">{money(Number(summary?.period_income ?? 0))}</div>
                  <div className="stat-foot"><span>За {periodName}</span></div>
                </article>
                <article className="stat-card expense-stat analytics-metric">
                  <div className="stat-card-head"><span>РАСХОДЫ</span><span className="stat-icon expense-icon"><ArrowUpRight size={17} /></span></div>
                  <div className="stat-value">{money(Number(summary?.period_expenses ?? 0))}</div>
                  <div className="stat-foot"><span>За {periodName}</span></div>
                </article>
              </section>
              <section className="content-grid">
                <CashflowPanel
                  data={chartData}
                  period={period}
                  onPeriodChange={setPeriod}
                  income={Number(summary?.period_income ?? 0)}
                  expenses={Number(summary?.period_expenses ?? 0)}
                  loading={dataLoading}
                />
                <CategoryBreakdownPanel items={categoryExpenses} total={Number(summary?.period_expenses ?? 0)} periodName={periodName} />
              </section>
              <article className="panel insight-card">
                <div className="feature-icon violet"><Sparkles size={20} /></div>
                <div>
                  <div className="panel-kicker">НАБЛЮДЕНИЕ ЗА ПЕРИОД</div>
                  <h2>
                    {categoryExpenses.length > 0
                      ? "Самая крупная категория расходов — " + categoryExpenses[0].category
                      : "Добавьте несколько операций для первых выводов"}
                  </h2>
                  <p>
                    {categoryExpenses.length > 0
                      ? "На эту категорию приходится " + money(Number(categoryExpenses[0].amount)) + " расходов за выбранный период."
                      : "Когда появятся операции, здесь будут отображаться полезные выводы по вашим доходам и расходам."}
                  </p>
                </div>
              </article>
            </>
          )}

          {activeNav === "Отчёты" && (
            <section className="feature-grid reports-grid">
              <article className="panel feature-card report-card">
                <div className="feature-icon lime"><FileText size={20} /></div>
                <div className="panel-kicker">ЭКСПОРТ CSV</div>
                <h2>Ваша история — в таблице</h2>
                <p>Скачайте последние {transactions.length} операций в CSV. Файл можно открыть в Excel, Google Таблицах или LibreOffice.</p>
                <button className="primary-button" onClick={exportTransactionsCsv} disabled={transactions.length === 0 || dataLoading}>
                  <Download size={16} /> Скачать CSV
                </button>
              </article>
              <article className="panel report-summary-card">
                <div className="panel-kicker">СВОДКА АККАУНТА</div>
                <h2>Все операции</h2>
                <div className="report-stat-row"><span>Количество записей</span><strong>{transactions.length}</strong></div>
                <div className="report-stat-row"><span>Доходы за всё время</span><strong>{money(Number(summary?.total_income ?? 0))}</strong></div>
                <div className="report-stat-row"><span>Расходы за всё время</span><strong>{money(Number(summary?.total_expenses ?? 0))}</strong></div>
                <div className="report-stat-row"><span>Баланс</span><strong>{money(Number(summary?.balance ?? 0))}</strong></div>
                <p className="feature-caption">Экспорт включает до 500 последних операций, загруженных в приложение.</p>
              </article>
            </section>
          )}

          {activeNav === "Настройки" && (
            <section className="settings-grid">
              <article className="panel feature-card settings-profile-card">
                <div className="feature-icon violet"><Wallet size={20} /></div>
                <div className="panel-kicker">ЛИЧНЫЙ АККАУНТ</div>
                <h2>Профиль</h2>
                <div className="settings-field"><span>Электронная почта</span><strong>{user.email}</strong></div>
                <div className="settings-field"><span>Идентификатор пользователя</span><strong className="settings-id">{user.id}</strong></div>
              </article>
              <article className="panel feature-card settings-security-card">
                <div className="feature-icon lime"><Settings2 size={20} /></div>
                <div className="panel-kicker">БЕЗОПАСНОСТЬ</div>
                <h2>Защита аккаунта</h2>
                <p>Пароль хранится на сервере в виде Argon2id-хеша. Сессия обновляется с помощью ротации refresh-токена.</p>
                <button className="secondary-button" onClick={() => void handleLogout()}><LogOut size={15} /> Выйти из аккаунта</button>
              </article>
            </section>
          )}

          <footer className="dashboard-footer">
            <span>© 2026 MoneyKeeper</span>
            <span>Для ясности в финансах <span className="footer-spark">✳</span></span>
            <span>Все системы работают <i className="footer-status" /></span>
          </footer>
        </div>
      </main>

      {showBudgetModal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !budgetSaving) setShowBudgetModal(false);
          }}
        >
          <form className="transaction-modal" onSubmit={saveBudget}>
            <div className="modal-heading">
              <div>
                <span className="panel-kicker">МЕСЯЧНЫЙ ЛИМИТ</span>
                <h2>{editingBudget ? "Изменить бюджет" : "Новый бюджет"}</h2>
              </div>
              <button type="button" className="icon-button" aria-label="Закрыть" disabled={budgetSaving} onClick={() => setShowBudgetModal(false)}>
                <X size={19} />
              </button>
            </div>
            <label className="form-label">КАТЕГОРИЯ
              <select value={budgetCategory} onChange={(event) => setBudgetCategory(event.target.value)} disabled={Boolean(editingBudget)}>
                {["Продукты", "Жильё", "Транспорт", "Кафе", "Покупки", "Здоровье", "Подписки", "Развлечения", "Связь", "Другое"]
                  .map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <label className="form-label">ЛИМИТ НА {budgetMonthTitle.toLocaleUpperCase("ru-RU")}
              <input
                type="number"
                min="0.01"
                max="999999999999.99"
                step="0.01"
                value={budgetAmount}
                onChange={(event) => setBudgetAmount(event.target.value)}
                placeholder="Например, 15000"
                required
              />
            </label>
            {budgetModalError && <div className="auth-error" role="alert">{budgetModalError}</div>}
            <button className="primary-button modal-submit" type="submit" disabled={budgetSaving}>
              <CheckCircle2 size={16} /> {budgetSaving ? "Сохраняем..." : editingBudget ? "Сохранить изменения" : "Создать бюджет"}
            </button>
            <p className="modal-hint">Лимит будет применён к расходам категории за выбранный месяц.</p>
          </form>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowModal(false); }}>
          <form className="transaction-modal" onSubmit={addTransaction}>
            <div className="modal-heading"><div><span className="panel-kicker">БЫСТРОЕ ДОБАВЛЕНИЕ</span><h2>Добавить операцию</h2></div><button type="button" className="icon-button" aria-label="Закрыть" onClick={() => setShowModal(false)}><X size={19} /></button></div>
            <div className="type-toggle"><button type="button" className={formType === "expense" ? "active expense-choice" : ""} onClick={() => { setFormType("expense"); setFormCategory("Продукты"); }}>Расход</button><button type="button" className={formType === "income" ? "active income-choice" : ""} onClick={() => { setFormType("income"); setFormCategory("Зарплата"); }}>Доход</button></div>
            <label className="form-label">ОПИСАНИЕ<input autoFocus value={formName} onChange={(event) => setFormName(event.target.value)} placeholder="Например, продукты" required /></label>
            <label className="form-label">КАТЕГОРИЯ
              <select value={formCategory} onChange={(event) => setFormCategory(event.target.value)}>
                {(formType === "income"
                  ? ["Зарплата", "Перевод", "Подарок", "Другое"]
                  : ["Продукты", "Жильё", "Транспорт", "Кафе", "Покупки", "Здоровье", "Другое"]
                ).map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <label className="form-label">СУММА (₽)<input type="number" min="0.01" step="0.01" value={formAmount} onChange={(event) => setFormAmount(event.target.value)} placeholder="0.00" required /></label>
            {formError && <div className="auth-error" role="alert">{formError}</div>}
            <button className="primary-button modal-submit" type="submit" disabled={saving}><Plus size={16} /> {saving ? "Сохраняем..." : "Сохранить операцию"}</button>
            <p className="modal-hint">Операция сохранится в вашем аккаунте и будет доступна после повторного входа.</p>
          </form>
        </div>
      )}
    </div>
  );
}