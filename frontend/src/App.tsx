import { useMemo, useState, type FormEvent } from "react";
import {
  Activity, ArrowDownLeft, ArrowDownRight, ArrowUpRight, Bell, BriefcaseBusiness,
  CarFront, ChevronDown, CircleHelp, Coffee, CreditCard, Download, Ellipsis,
  FileText, House, LayoutDashboard, Plus, Search, Settings2, ShoppingBag,
  SlidersHorizontal, Sparkles, Utensils, Wallet, X
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";

type Period = "Week" | "Month" | "Year";
type Transaction = {
  id: number; name: string; category: string; date: string; amount: number;
  icon: "home" | "food" | "shopping" | "transport" | "work";
};

const chartSets: Record<Period, { label: string; income: number; expenses: number }[]> = {
  Week: [
    { label: "Mon", income: 180, expenses: 90 }, { label: "Tue", income: 240, expenses: 130 },
    { label: "Wed", income: 120, expenses: 160 }, { label: "Thu", income: 360, expenses: 110 },
    { label: "Fri", income: 280, expenses: 190 }, { label: "Sat", income: 90, expenses: 220 },
    { label: "Sun", income: 210, expenses: 100 }
  ],
  Month: [
    { label: "01", income: 720, expenses: 420 }, { label: "04", income: 980, expenses: 610 },
    { label: "07", income: 840, expenses: 510 }, { label: "10", income: 1280, expenses: 740 },
    { label: "13", income: 1040, expenses: 690 }, { label: "16", income: 1460, expenses: 820 },
    { label: "19", income: 1190, expenses: 760 }, { label: "22", income: 1710, expenses: 940 },
    { label: "25", income: 1490, expenses: 820 }, { label: "28", income: 1940, expenses: 1080 },
    { label: "31", income: 1820, expenses: 920 }
  ],
  Year: [
    { label: "Jan", income: 4100, expenses: 2900 }, { label: "Feb", income: 4500, expenses: 3100 },
    { label: "Mar", income: 3900, expenses: 2800 }, { label: "Apr", income: 5200, expenses: 3400 },
    { label: "May", income: 4900, expenses: 3300 }, { label: "Jun", income: 5800, expenses: 3700 },
    { label: "Jul", income: 5400, expenses: 3500 }, { label: "Aug", income: 6100, expenses: 3900 },
    { label: "Sep", income: 5700, expenses: 3600 }, { label: "Oct", income: 6500, expenses: 4100 },
    { label: "Nov", income: 6200, expenses: 3900 }, { label: "Dec", income: 7100, expenses: 4300 }
  ]
};

const initialTransactions: Transaction[] = [
  { id: 1, name: "Whole Foods Market", category: "Groceries", date: "Today, 10:42 AM", amount: -84.32, icon: "shopping" },
  { id: 2, name: "Salary · Acme Studio", category: "Income", date: "Today, 09:15 AM", amount: 3250, icon: "work" },
  { id: 3, name: "Blue Bottle Coffee", category: "Food & drink", date: "Yesterday, 04:28 PM", amount: -12.8, icon: "food" },
  { id: 4, name: "Monthly rent", category: "Housing", date: "Yesterday, 09:00 AM", amount: -920, icon: "home" },
  { id: 5, name: "City transit pass", category: "Transport", date: "Oct 28, 08:12 AM", amount: -42.5, icon: "transport" }
];

const budgets = [
  { name: "Home & bills", spent: 920, total: 1200, color: "lime", icon: House },
  { name: "Food & dining", spent: 386, total: 550, color: "cyan", icon: Utensils },
  { name: "Lifestyle", spent: 248, total: 400, color: "violet", icon: ShoppingBag }
];

const navItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Transactions", icon: Activity },
  { label: "Budgets", icon: SlidersHorizontal },
  { label: "Cards", icon: CreditCard }
];

function money(value: number) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(value);
}

function TransactionIcon({ type }: { type: Transaction["icon"] }) {
  const icons = { home: House, food: Coffee, shopping: ShoppingBag, transport: CarFront, work: BriefcaseBusiness };
  const Icon = icons[type];
  return <Icon size={17} strokeWidth={1.8} />;
}

export default function App() {
  const [period, setPeriod] = useState<Period>("Month");
  const [activeNav, setActiveNav] = useState("Overview");
  const [transactions, setTransactions] = useState(initialTransactions);
  const [query, setQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [formName, setFormName] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formType, setFormType] = useState<"expense" | "income">("expense");

  const visibleTransactions = useMemo(
    () => transactions.filter((item) => (item.name + " " + item.category).toLowerCase().includes(query.toLowerCase())),
    [transactions, query]
  );

  function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(formAmount);
    if (!formName.trim() || !Number.isFinite(amount) || amount <= 0) return;
    const item: Transaction = {
      id: Date.now(), name: formName.trim(), category: formType === "income" ? "Income" : "Other",
      date: "Just now", amount: formType === "income" ? amount : -amount,
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
          <div className="workspace-copy"><strong>Personal space</strong><span>Free plan</span></div>
          <ChevronDown size={15} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map(({ label, icon: Icon }) => (
            <button key={label} className={"nav-link " + (activeNav === label ? "active" : "")} onClick={() => setActiveNav(label)}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              {label === "Transactions" && <span className="nav-count">5</span>}
            </button>
          ))}
        </nav>
        <div className="nav-label tools-label">TOOLS</div>
        <nav className="main-nav" aria-label="Tools">
          <button className="nav-link" onClick={() => setActiveNav("Smart insights")}><Sparkles size={18} /><span>Smart insights</span><span className="new-pill">NEW</span></button>
          <button className="nav-link" onClick={() => setActiveNav("Reports")}><FileText size={18} /><span>Reports</span></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <div className="upgrade-icon"><Sparkles size={16} /></div>
            <strong>Make money make sense.</strong>
            <p>Get a clearer picture with smarter insights.</p>
            <button onClick={() => setActiveNav("Smart insights")}>Explore insights <ArrowUpRight size={14} /></button>
            <div className="upgrade-orb" />
          </div>
          <button className="nav-link settings-link" onClick={() => setActiveNav("Settings")}><Settings2 size={18} /><span>Settings</span></button>
          <div className="profile-row">
            <div className="profile-avatar">JD</div>
            <div className="profile-copy"><strong>Jordan Davis</strong><span>Personal account</span></div>
            <Ellipsis size={18} />
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>{activeNav}</strong></div>
          <div className="topbar-actions">
            <label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search transactions..." aria-label="Search transactions" /><kbd>⌘ K</kbd></label>
            <div className="notification-wrap">
              <button className="icon-button notification-button" aria-label="Notifications" onClick={() => setShowNotifications((value) => !value)}><Bell size={18} /><i /></button>
              {showNotifications && <div className="notification-popover"><strong>You're all caught up</strong><span>New activity will show up here.</span></div>}
            </div>
            <button className="help-button" aria-label="Help"><CircleHelp size={18} /></button>
          </div>
        </header>

        <div className="page-wrap">
          <section className="page-heading">
            <div>
              <div className="eyebrow"><span className="live-dot" /> YOUR FINANCIAL OVERVIEW</div>
              <h1>Your money, <em>in focus.</em></h1>
              <p className="heading-subtitle">Here's what's happening with your finances.</p>
            </div>
            <div className="heading-actions">
              <button className="secondary-button" onClick={() => setActiveNav("Reports")}><Download size={16} /> Export</button>
              <button className="primary-button" onClick={() => setShowModal(true)}><Plus size={17} strokeWidth={2.4} /> Add transaction</button>
            </div>
          </section>

          <section className="overview-grid">
            <article className="balance-card">
              <div className="balance-card-glow" />
              <div className="balance-topline">
                <span className="balance-label"><span className="balance-icon"><Wallet size={15} /></span> TOTAL BALANCE</span>
                <button className="balance-menu" aria-label="Balance options"><Ellipsis size={20} /></button>
              </div>
              <div className="balance-value">€8,420<span>.50</span></div>
              <div className="balance-foot"><span className="positive-chip"><ArrowUpRight size={13} /> 12.8%</span><span className="balance-period">vs. last month</span></div>
              <div className="balance-divider" />
              <div className="balance-breakdown">
                <div><span className="breakdown-dot income-dot" /><span>Income</span><strong>€4,850.00</strong></div>
                <div><span className="breakdown-dot expense-dot" /><span>Expenses</span><strong>€2,140.80</strong></div>
                <div className="balance-card-link">View details <ArrowUpRight size={13} /></div>
              </div>
              <div className="balance-decoration">€</div>
            </article>
            <article className="stat-card income-stat">
              <div className="stat-card-head"><span>INCOME</span><span className="stat-icon"><ArrowDownLeft size={17} /></span></div>
              <div className="stat-value">€4,850<span>.00</span></div>
              <div className="stat-foot"><span className="positive-text"><ArrowUpRight size={13} /> 8.2%</span><span>vs last month</span></div>
              <div className="sparkline income-spark"><svg viewBox="0 0 180 42" preserveAspectRatio="none"><path d="M0 34 C18 30 18 27 34 29 S55 20 70 25 S93 14 108 19 S132 10 145 14 S164 5 180 3" /><path className="spark-fill" d="M0 34 C18 30 18 27 34 29 S55 20 70 25 S93 14 108 19 S132 10 145 14 S164 5 180 3 L180 42 L0 42Z" /></svg></div>
            </article>
            <article className="stat-card expense-stat">
              <div className="stat-card-head"><span>EXPENSES</span><span className="stat-icon expense-icon"><ArrowUpRight size={17} /></span></div>
              <div className="stat-value">€2,140<span>.80</span></div>
              <div className="stat-foot"><span className="positive-text"><ArrowDownRight size={13} /> 4.6%</span><span>vs last month</span></div>
              <div className="sparkline expense-spark"><svg viewBox="0 0 180 42" preserveAspectRatio="none"><path d="M0 8 C16 13 19 4 34 15 S54 11 68 23 S87 14 103 24 S125 19 141 29 S164 25 180 35" /><path className="spark-fill" d="M0 8 C16 13 19 4 34 15 S54 11 68 23 S87 14 103 24 S125 19 141 29 S164 25 180 35 L180 42 L0 42Z" /></svg></div>
            </article>
          </section>

          <section className="content-grid">
            <article className="panel cashflow-panel">
              <div className="panel-heading">
                <div><div className="panel-kicker">CASH FLOW</div><h2>Money movement</h2><p>Track what comes in and what goes out.</p></div>
                <div className="period-switch" role="group" aria-label="Chart period">
                  {(["Week", "Month", "Year"] as Period[]).map((item) => <button key={item} className={period === item ? "selected" : ""} onClick={() => setPeriod(item)}>{item}</button>)}
                </div>
              </div>
              <div className="chart-summary">
                <div><span className="chart-legend income-legend" /><span>Income</span><strong>€4,850.00</strong></div>
                <div><span className="chart-legend expense-legend" /><span>Expenses</span><strong>€2,140.80</strong></div>
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
              <div className="chart-bottom-note"><span><span className="note-pulse" /> Updated just now</span><span>Net cash flow <strong>+€2,709.20</strong></span></div>
            </article>

            <article className="panel budget-panel">
              <div className="panel-heading budget-heading">
                <div><div className="panel-kicker">SPENDING PLAN</div><h2>Monthly budgets</h2><p>You're doing better than last month.</p></div>
                <button className="more-button" aria-label="Budget options"><Ellipsis size={19} /></button>
              </div>
              <div className="budget-total-row"><div><strong>€1,554</strong><span> of €2,150 used</span></div><span className="budget-percent">72%</span></div>
              <div className="budget-total-track"><span /></div>
              <div className="budget-list">
                {budgets.map(({ name, spent, total, color, icon: Icon }) => (
                  <div className="budget-item" key={name}>
                    <div className="budget-item-top"><span className={"budget-category-icon " + color}><Icon size={15} /></span><strong>{name}</strong><span className="budget-amount">{money(spent)} <i>/ {money(total)}</i></span></div>
                    <div className={"budget-track " + color}><span style={{ width: ((spent / total) * 100) + "%" }} /></div>
                  </div>
                ))}
              </div>
              <button className="text-link" onClick={() => setActiveNav("Budgets")}>View all budgets <ArrowUpRight size={14} /></button>
            </article>
          </section>

          <section className="panel transactions-panel">
            <div className="panel-heading transactions-heading">
              <div><div className="panel-kicker">THE LATEST</div><h2>Recent transactions</h2><p>Your money moves. Stay in the loop.</p></div>
              <button className="secondary-button compact-button" onClick={() => setActiveNav("Transactions")}>View all <ArrowUpRight size={14} /></button>
            </div>
            <div className="transaction-table">
              <div className="transaction-table-head"><span>TRANSACTION</span><span>CATEGORY</span><span>DATE</span><span className="amount-heading">AMOUNT</span></div>
              {visibleTransactions.slice(0, 5).map((item) => (
                <div className="transaction-row" key={item.id}>
                  <div className="transaction-name"><span className={"transaction-icon " + item.icon}><TransactionIcon type={item.icon} /></span><strong>{item.name}</strong></div>
                  <div className="transaction-category">{item.category}</div>
                  <div className="transaction-date">{item.date}</div>
                  <div className={"transaction-amount " + (item.amount > 0 ? "credit" : "")}>{item.amount > 0 ? "+" : "−"}{money(Math.abs(item.amount))}</div>
                </div>
              ))}
              {visibleTransactions.length === 0 && <div className="empty-state">No transactions match “{query}”.</div>}
            </div>
          </section>
          <footer className="dashboard-footer"><span>© 2026 MoneyKeeper</span><span>Made for a clearer financial life <span className="footer-spark">✳</span></span><span>All systems operational <i className="footer-status" /></span></footer>
        </div>
      </main>

      {showModal && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowModal(false); }}>
          <form className="transaction-modal" onSubmit={addTransaction}>
            <div className="modal-heading"><div><span className="panel-kicker">QUICK ENTRY</span><h2>Add transaction</h2></div><button type="button" className="icon-button" aria-label="Close" onClick={() => setShowModal(false)}><X size={19} /></button></div>
            <div className="type-toggle"><button type="button" className={formType === "expense" ? "active expense-choice" : ""} onClick={() => setFormType("expense")}>Expense</button><button type="button" className={formType === "income" ? "active income-choice" : ""} onClick={() => setFormType("income")}>Income</button></div>
            <label className="form-label">DESCRIPTION<input autoFocus value={formName} onChange={(event) => setFormName(event.target.value)} placeholder="e.g. Weekly groceries" required /></label>
            <label className="form-label">AMOUNT (€)<input type="number" min="0.01" step="0.01" value={formAmount} onChange={(event) => setFormAmount(event.target.value)} placeholder="0.00" required /></label>
            <button className="primary-button modal-submit" type="submit"><Plus size={16} /> Save transaction</button>
            <p className="modal-hint">Demo mode · This entry is stored in this browser session only.</p>
          </form>
        </div>
      )}
    </div>
  );
}