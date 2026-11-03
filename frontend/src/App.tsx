import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Activity, ArrowDownLeft, ArrowDownRight, ArrowUpRight, Bell, BriefcaseBusiness,
  CarFront, ChevronDown, CircleHelp, Coffee, CreditCard, Download, Ellipsis,
  FileText, House, LayoutDashboard, LogOut, Plus, Search, Settings2, ShoppingBag,
  SlidersHorizontal, Sparkles, Utensils, Wallet, X
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import AuthPage from "./AuthPage";
import { authApi, clearSession, restoreSession, saveSession, signOut, type User } from "./lib/auth";

type Period = "Week" | "Month" | "Year";
type Transaction = {
  id: number; name: string; category: string; date: string; amount: number;
  icon: "home" | "food" | "shopping" | "transport" | "work";
};

const chartSets: Record<Period, { label: string; income: number; expenses: number }[]> = {
  Week: [
    { label: "Пн", income: 18000, expenses: 9000 }, { label: "Вт", income: 24000, expenses: 13000 },
    { label: "Ср", income: 12000, expenses: 16000 }, { label: "Чт", income: 36000, expenses: 11000 },
    { label: "Пт", income: 28000, expenses: 19000 }, { label: "Сб", income: 9000, expenses: 22000 },
    { label: "Вс", income: 21000, expenses: 10000 }
  ],
  Month: [
    { label: "01", income: 72000, expenses: 42000 }, { label: "04", income: 98000, expenses: 61000 },
    { label: "07", income: 84000, expenses: 51000 }, { label: "10", income: 128000, expenses: 74000 },
    { label: "13", income: 104000, expenses: 69000 }, { label: "16", income: 146000, expenses: 82000 },
    { label: "19", income: 119000, expenses: 76000 }, { label: "22", income: 171000, expenses: 94000 },
    { label: "25", income: 149000, expenses: 82000 }, { label: "28", income: 194000, expenses: 108000 },
    { label: "31", income: 182000, expenses: 92000 }
  ],
  Year: [
    { label: "Янв", income: 410000, expenses: 290000 }, { label: "Фев", income: 450000, expenses: 310000 },
    { label: "Мар", income: 390000, expenses: 280000 }, { label: "Апр", income: 520000, expenses: 340000 },
    { label: "Май", income: 490000, expenses: 330000 }, { label: "Июн", income: 580000, expenses: 370000 },
    { label: "Июл", income: 540000, expenses: 350000 }, { label: "Авг", income: 610000, expenses: 390000 },
    { label: "Сен", income: 570000, expenses: 360000 }, { label: "Окт", income: 650000, expenses: 410000 },
    { label: "Ноя", income: 620000, expenses: 390000 }, { label: "Дек", income: 710000, expenses: 430000 }
  ]
};

const initialTransactions: Transaction[] = [
  { id: 1, name: "Покупки в супермаркете", category: "Продукты", date: "Сегодня, 10:42", amount: -8432, icon: "shopping" },
  { id: 2, name: "Зарплата", category: "Доход", date: "Сегодня, 09:15", amount: 325000, icon: "work" },
  { id: 3, name: "Кофейня", category: "Кафе", date: "Вчера, 16:28", amount: -1280, icon: "food" },
  { id: 4, name: "Аренда квартиры", category: "Жильё", date: "Вчера, 09:00", amount: -92000, icon: "home" },
  { id: 5, name: "Проездной", category: "Транспорт", date: "28 окт., 08:12", amount: -4250, icon: "transport" }
];

const budgets = [
  { name: "Дом и счета", spent: 92000, total: 120000, color: "lime", icon: House },
  { name: "Еда и кафе", spent: 38600, total: 55000, color: "cyan", icon: Utensils },
  { name: "Покупки", spent: 24800, total: 40000, color: "violet", icon: ShoppingBag }
];

const navItems = [
  { label: "Обзор", icon: LayoutDashboard },
  { label: "Операции", icon: Activity },
  { label: "Бюджеты", icon: SlidersHorizontal },
  { label: "Карты", icon: CreditCard }
];

function money(value: number) {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 2 }).format(value);
}

function TransactionIcon({ type }: { type: Transaction["icon"] }) {
  const icons = { home: House, food: Coffee, shopping: ShoppingBag, transport: CarFront, work: BriefcaseBusiness };
  const Icon = icons[type];
  return <Icon size={17} strokeWidth={1.8} />;
}

export default function App() {
  const [period, setPeriod] = useState<Period>("Month");
  const [activeNav, setActiveNav] = useState("Обзор");
  const [transactions, setTransactions] = useState(initialTransactions);
  const [query, setQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [formName, setFormName] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formType, setFormType] = useState<"expense" | "income">("expense");

  useEffect(() => {
    let active = true;
    restoreSession()
      .then((restoredUser) => { if (active) setUser(restoredUser); })
      .finally(() => { if (active) setAuthLoading(false); });
    return () => { active = false; };
  }, []);

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

  function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(formAmount);
    if (!formName.trim() || !Number.isFinite(amount) || amount <= 0) return;
    const item: Transaction = {
      id: Date.now(), name: formName.trim(), category: formType === "income" ? "Доход" : "Другое",
      date: "Только что", amount: formType === "income" ? amount : -amount,
      icon: formType === "income" ? "work" : "shopping"
    };
    setTransactions((current) => [item, ...current]);
    setFormName("");
    setFormAmount("");
    setShowModal(false);
  }

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
              {label === "Операции" && <span className="nav-count">5</span>}
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
            <div className="profile-copy"><strong>Пользователь</strong><span>Личный аккаунт</span></div>
            <Ellipsis size={18} />
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
          <section className="page-heading">
            <div>
              <div className="eyebrow"><span className="live-dot" /> ВАШИ ФИНАНСЫ</div>
              <h1>Ваши деньги — <em>под контролем.</em></h1>
              <p className="heading-subtitle">Вот что происходит с вашими финансами.</p>
            </div>
            <div className="heading-actions">
              <button className="secondary-button" onClick={() => setActiveNav("Отчёты")}><Download size={16} /> Экспорт</button>
              <button className="primary-button" onClick={() => setShowModal(true)}><Plus size={17} strokeWidth={2.4} /> Добавить операцию</button>
            </div>
          </section>

          <section className="overview-grid">
            <article className="balance-card">
              <div className="balance-card-glow" />
              <div className="balance-topline">
                <span className="balance-label"><span className="balance-icon"><Wallet size={15} /></span> ОБЩИЙ БАЛАНС</span>
                <button className="balance-menu" aria-label="Настройки баланса"><Ellipsis size={20} /></button>
              </div>
              <div className="balance-value">842 050<span>,50 ₽</span></div>
              <div className="balance-foot"><span className="positive-chip"><ArrowUpRight size={13} /> 12.8%</span><span className="balance-period">к прошлому месяцу</span></div>
              <div className="balance-divider" />
              <div className="balance-breakdown">
                <div><span className="breakdown-dot income-dot" /><span>Доход</span><strong>485 000,00 ₽</strong></div>
                <div><span className="breakdown-dot expense-dot" /><span>Расходы</span><strong>214 080,00 ₽</strong></div>
                <div className="balance-card-link">Подробнее <ArrowUpRight size={13} /></div>
              </div>
              <div className="balance-decoration">₽</div>
            </article>
            <article className="stat-card income-stat">
              <div className="stat-card-head"><span>ДОХОДЫ</span><span className="stat-icon"><ArrowDownLeft size={17} /></span></div>
              <div className="stat-value">485 000<span> ₽</span></div>
              <div className="stat-foot"><span className="positive-text"><ArrowUpRight size={13} /> 8.2%</span><span>к прошлому месяцу</span></div>
              <div className="sparkline income-spark"><svg viewBox="0 0 180 42" preserveAspectRatio="none"><path d="M0 34 C18 30 18 27 34 29 S55 20 70 25 S93 14 108 19 S132 10 145 14 S164 5 180 3" /><path className="spark-fill" d="M0 34 C18 30 18 27 34 29 S55 20 70 25 S93 14 108 19 S132 10 145 14 S164 5 180 3 L180 42 L0 42Z" /></svg></div>
            </article>
            <article className="stat-card expense-stat">
              <div className="stat-card-head"><span>РАСХОДЫ</span><span className="stat-icon expense-icon"><ArrowUpRight size={17} /></span></div>
              <div className="stat-value">214 080<span> ₽</span></div>
              <div className="stat-foot"><span className="positive-text"><ArrowDownRight size={13} /> 4.6%</span><span>к прошлому месяцу</span></div>
              <div className="sparkline expense-spark"><svg viewBox="0 0 180 42" preserveAspectRatio="none"><path d="M0 8 C16 13 19 4 34 15 S54 11 68 23 S87 14 103 24 S125 19 141 29 S164 25 180 35" /><path className="spark-fill" d="M0 8 C16 13 19 4 34 15 S54 11 68 23 S87 14 103 24 S125 19 141 29 S164 25 180 35 L180 42 L0 42Z" /></svg></div>
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
                <div><span className="chart-legend income-legend" /><span>Доход</span><strong>485 000,00 ₽</strong></div>
                <div><span className="chart-legend expense-legend" /><span>Расходы</span><strong>214 080,00 ₽</strong></div>
              </div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartSets[period]} margin={{ top: 12, right: 5, left: -20, bottom: 0 }}>
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
              <div className="chart-bottom-note"><span><span className="note-pulse" /> Обновлено только что</span><span>Чистый денежный поток <strong>+270 920,00 ₽</strong></span></div>
            </article>

            <article className="panel budget-panel">
              <div className="panel-heading budget-heading">
                <div><div className="panel-kicker">ПЛАН РАСХОДОВ</div><h2>Бюджеты на месяц</h2><p>Вы тратите меньше, чем в прошлом месяце.</p></div>
                <button className="more-button" aria-label="Настройки бюджета"><Ellipsis size={19} /></button>
              </div>
              <div className="budget-total-row"><div><strong>155 400 ₽</strong><span> из 215 000 ₽ использовано</span></div><span className="budget-percent">72%</span></div>
              <div className="budget-total-track"><span /></div>
              <div className="budget-list">
                {budgets.map(({ name, spent, total, color, icon: Icon }) => (
                  <div className="budget-item" key={name}>
                    <div className="budget-item-top"><span className={"budget-category-icon " + color}><Icon size={15} /></span><strong>{name}</strong><span className="budget-amount">{money(spent)} <i>/ {money(total)}</i></span></div>
                    <div className={"budget-track " + color}><span style={{ width: ((spent / total) * 100) + "%" }} /></div>
                  </div>
                ))}
              </div>
              <button className="text-link" onClick={() => setActiveNav("Бюджеты")}>Все бюджеты <ArrowUpRight size={14} /></button>
            </article>
          </section>

          <section className="panel transactions-panel">
            <div className="panel-heading transactions-heading">
              <div><div className="panel-kicker">ПОСЛЕДНИЕ ОПЕРАЦИИ</div><h2>Последние операции</h2><p>История ваших финансовых операций.</p></div>
              <button className="secondary-button compact-button" onClick={() => setActiveNav("Операции")}>Все операции <ArrowUpRight size={14} /></button>
            </div>
            <div className="transaction-table">
              <div className="transaction-table-head"><span>ОПЕРАЦИЯ</span><span>КАТЕГОРИЯ</span><span>ДАТА</span><span className="amount-heading">СУММА</span></div>
              {visibleTransactions.slice(0, 5).map((item) => (
                <div className="transaction-row" key={item.id}>
                  <div className="transaction-name"><span className={"transaction-icon " + item.icon}><TransactionIcon type={item.icon} /></span><strong>{item.name}</strong></div>
                  <div className="transaction-category">{item.category}</div>
                  <div className="transaction-date">{item.date}</div>
                  <div className={"transaction-amount " + (item.amount > 0 ? "credit" : "")}>{item.amount > 0 ? "+" : "−"}{money(Math.abs(item.amount))}</div>
                </div>
              ))}
              {visibleTransactions.length === 0 && <div className="empty-state">Ничего не найдено по запросу “{query}”.</div>}
            </div>
          </section>
          <footer className="dashboard-footer"><span>© 2026 MoneyKeeper</span><span>Для ясности в финансах <span className="footer-spark">✳</span></span><span>Все системы работают <i className="footer-status" /></span></footer>
        </div>
      </main>

      {showModal && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowModal(false); }}>
          <form className="transaction-modal" onSubmit={addTransaction}>
            <div className="modal-heading"><div><span className="panel-kicker">БЫСТРОЕ ДОБАВЛЕНИЕ</span><h2>Добавить операцию</h2></div><button type="button" className="icon-button" aria-label="Закрыть" onClick={() => setShowModal(false)}><X size={19} /></button></div>
            <div className="type-toggle"><button type="button" className={formType === "expense" ? "active expense-choice" : ""} onClick={() => setFormType("expense")}>Расход</button><button type="button" className={formType === "income" ? "active income-choice" : ""} onClick={() => setFormType("income")}>Доход</button></div>
            <label className="form-label">ОПИСАНИЕ<input autoFocus value={formName} onChange={(event) => setFormName(event.target.value)} placeholder="Например, продукты" required /></label>
            <label className="form-label">СУММА (₽)<input type="number" min="0.01" step="0.01" value={formAmount} onChange={(event) => setFormAmount(event.target.value)} placeholder="0.00" required /></label>
            <button className="primary-button modal-submit" type="submit"><Plus size={16} /> Сохранить операцию</button>
            <p className="modal-hint">Демо-режим · Операция хранится только в текущем сеансе браузера.</p>
          </form>
        </div>
      )}
    </div>
  );
}