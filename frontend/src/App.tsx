import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Activity, ArrowDownLeft, ArrowUpRight, Bell, BriefcaseBusiness,
  CarFront, ChevronDown, CircleHelp, Coffee, CreditCard, Download, Ellipsis,
  FileText, House, LayoutDashboard, LogOut, Plus, Search, Settings2, ShoppingBag,
  SlidersHorizontal, Sparkles, Wallet, X, Trash2
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

const navItems = [
  { label: "Обзор", icon: LayoutDashboard },
  { label: "Операции", icon: Activity },
  { label: "Бюджеты", icon: SlidersHorizontal },
  { label: "Карты", icon: CreditCard }
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

    Promise.all([transactionsApi.list(100), transactionsApi.summary(selectedPeriod)])
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
  const maxCategoryExpense = Math.max(0, ...categoryExpenses.map((item) => Number(item.amount)));
  const periodName = ({ Week: "неделю", Month: "месяц", Year: "год" })[period];
  const periodLabel = ({ Week: "НЕДЕЛЮ", Month: "МЕСЯЦ", Year: "ГОД" })[period];

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
        <a className="brand" href="#" aria-label="MoneyKeeper home">
          <span className="brand-mark"><Wallet size={19} strokeWidth={2.2} /></span>
          <span className="brand-name">money<span>keeper</span><i>.</i></span>
        </a>
        <div className="workspace-switcher">
          <div className="workspace-avatar">P</div>
          <div className="workspace-copy"><strong>Личный кабинет</strong><span>Бесплатный план</span></div>
          <ChevronDown size={15} />
        </div>
        <div className="nav-label">РАБОЧЕЕ ПРОСТРАНСТВО</div>
        <nav className="main-nav" aria-label="Основная навигация">
          {navItems.map(({ label, icon: Icon }) => (
            <button key={label} className={"nav-link " + (activeNav === label ? "active" : "")} onClick={() => setActiveNav(label)}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              {label === "Операции" && <span className="nav-count">{transactions.length}</span>}
            </button>
          ))}
        </nav>
        <div className="nav-label tools-label">ИНСТРУМЕНТЫ</div>
        <nav className="main-nav" aria-label="Инструменты">
          <button className="nav-link" onClick={() => setActiveNav("Умная аналитика")}><Sparkles size={18} /><span>Умная аналитика</span><span className="new-pill">NEW</span></button>
          <button className="nav-link" onClick={() => setActiveNav("Отчёты")}><FileText size={18} /><span>Отчёты</span></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <div className="upgrade-icon"><Sparkles size={16} /></div>
            <strong>Держите финансы под контролем.</strong>
            <p>Анализируйте расходы и принимайте решения увереннее.</p>
            <button onClick={() => setActiveNav("Умная аналитика")}>Открыть аналитику <ArrowUpRight size={14} /></button>
            <div className="upgrade-orb" />
          </div>
          <button className="nav-link settings-link" onClick={() => setActiveNav("Настройки")}><Settings2 size={18} /><span>Настройки</span></button>
          <div className="profile-row">
            <div className="profile-avatar">П</div>
            <div className="profile-copy"><strong>{user.email}</strong><span>Личный аккаунт</span></div>
            <button className="icon-button" type="button" aria-label="Выйти из аккаунта" title="Выйти" onClick={handleLogout}><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>Рабочее пространство</span><span className="crumb-slash">/</span><strong>{activeNav}</strong></div>
          <div className="topbar-actions">
            <label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск операций..." aria-label="Поиск операций" /><kbd>⌘ K</kbd></label>
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
              <div className="eyebrow"><span className="live-dot" /> ВАШИ ФИНАНСЫ</div>
              <h1>Ваши деньги — <em>под контролем.</em></h1>
              <p className="heading-subtitle">Ваши операции, баланс и аналитика из личного аккаунта.</p>
            </div>
            <div className="heading-actions">
              <button className="secondary-button" onClick={() => setActiveNav("Отчёты")}><Download size={16} /> Экспорт</button>
              <button className="primary-button" onClick={() => { setFormError(""); setShowModal(true); }}><Plus size={17} strokeWidth={2.4} /> Добавить операцию</button>
            </div>
          </section>

          <section className="overview-grid">
            <article className="balance-card">
              <div className="balance-card-glow" />
              <div className="balance-topline">
                <span className="balance-label"><span className="balance-icon"><Wallet size={15} /></span> ОБЩИЙ БАЛАНС</span>
                <button className="balance-menu" aria-label="Настройки баланса"><Ellipsis size={20} /></button>
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
            <article className="panel cashflow-panel">
              <div className="panel-heading">
                <div><div className="panel-kicker">ДВИЖЕНИЕ ДЕНЕГ</div><h2>Движение средств</h2><p>Следите за доходами и расходами.</p></div>
                <div className="period-switch" role="group" aria-label="Период графика">
                  {(["Week", "Month", "Year"] as Period[]).map((item) => <button key={item} className={period === item ? "selected" : ""} onClick={() => setPeriod(item)}>{({ Week: "Неделя", Month: "Месяц", Year: "Год" })[item]}</button>)}
                </div>
              </div>
              <div className="chart-summary">
                <div><span className="chart-legend income-legend" /><span>Доход</span><strong>{money(Number(summary?.period_income ?? 0))}</strong></div>
                <div><span className="chart-legend expense-legend" /><span>Расходы</span><strong>{money(Number(summary?.period_expenses ?? 0))}</strong></div>
              </div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 12, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c7f36b" stopOpacity={0.22} /><stop offset="100%" stopColor="#c7f36b" stopOpacity={0} /></linearGradient>
                      <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#55d6ff" stopOpacity={0.13} /><stop offset="100%" stopColor="#55d6ff" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid stroke="#26323d" strokeDasharray="3 5" vertical={false} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#778592", fontSize: 11 }} dy={12} />
                    <Tooltip contentStyle={{ background: "#18232d", border: "1px solid #30404e", borderRadius: 12, color: "#f3f6f8", fontSize: 12 }} formatter={(value) => money(Number(value))} />
                    <Area type="monotone" dataKey="income" stroke="#c7f36b" strokeWidth={2.4} fill="url(#incomeGradient)" />
                    <Area type="monotone" dataKey="expenses" stroke="#55d6ff" strokeWidth={2.1} fill="url(#expenseGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-bottom-note"><span><span className="note-pulse" /> {dataLoading ? "Обновляем данные..." : "Данные аккаунта"}</span><span>Чистый поток <strong>{money(Number(summary?.period_income ?? 0) - Number(summary?.period_expenses ?? 0))}</strong></span></div>
            </article>

            <article className="panel budget-panel">
              <div className="panel-heading budget-heading">
                <div><div className="panel-kicker">СТРУКТУРА РАСХОДОВ</div><h2>По категориям</h2><p>Распределение расходов за {periodName}.</p></div>
              </div>
              <div className="budget-total-row"><div><strong>{money(Number(summary?.period_expenses ?? 0))}</strong><span> всего за период</span></div><span className="budget-percent">{categoryExpenses.length} кат.</span></div>
              <div className="budget-list">
                {categoryExpenses.length === 0 ? (
                  <div className="empty-state">Пока нет расходов за выбранный период.</div>
                ) : categoryExpenses.slice(0, 5).map((item, index) => {
                  const color = ["lime", "cyan", "violet"][index % 3];
                  const amount = Number(item.amount);
                  const percent = maxCategoryExpense > 0 ? (amount / maxCategoryExpense) * 100 : 0;
                  return (
                    <div className="budget-item" key={item.category}>
                      <div className="budget-item-top"><span className={"budget-category-icon " + color}>₽</span><strong>{item.category}</strong><span className="budget-amount">{money(amount)}</span></div>
                      <div className={"budget-track " + color}><span style={{ width: percent + "%" }} /></div>
                    </div>
                  );
                })}
              </div>
            </article>
          </section>

          <section className="panel transactions-panel">
            <div className="panel-heading transactions-heading">
              <div><div className="panel-kicker">ПОСЛЕДНИЕ ОПЕРАЦИИ</div><h2>{activeNav === "Операции" ? "Все операции" : "Последние операции"}</h2><p>История ваших финансовых операций.</p></div>
              <button className="secondary-button compact-button" onClick={() => setActiveNav("Операции")}>Все операции <ArrowUpRight size={14} /></button>
            </div>
            <div className="transaction-table">
              <div className="transaction-table-head"><span>ОПЕРАЦИЯ</span><span>КАТЕГОРИЯ</span><span>ДАТА</span><span className="amount-heading">СУММА</span></div>
              {dataLoading ? (
                <div className="empty-state">Загружаем операции...</div>
              ) : visibleTransactions.slice(0, activeNav === "Операции" ? 100 : 8).map((item) => (
                <div className="transaction-row" key={item.id}>
                  <div className="transaction-name"><span className={"transaction-icon " + item.icon}><TransactionIcon type={item.icon} /></span><strong>{item.name}</strong><button className="transaction-delete" type="button" title="Удалить операцию" aria-label={"Удалить " + item.name} onClick={() => void deleteTransaction(item.id)}><Trash2 size={14} /></button></div>
                  <div className="transaction-category">{item.category}</div>
                  <div className="transaction-date">{item.date}</div>
                  <div className={"transaction-amount " + (item.type === "income" ? "credit" : "")}>{item.type === "income" ? "+" : "−"}{money(item.amount)}</div>
                </div>
              ))}
              {!dataLoading && visibleTransactions.length === 0 && (
                <div className="empty-state">{query ? "По этому запросу операций нет." : "Операций пока нет. Добавьте первую через кнопку выше."}</div>
              )}
            </div>
          </section>
          <footer className="dashboard-footer"><span>© 2026 MoneyKeeper</span><span>Для ясности в финансах <span className="footer-spark">✳</span></span><span>Все системы работают <i className="footer-status" /></span></footer>
        </div>
      </main>

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