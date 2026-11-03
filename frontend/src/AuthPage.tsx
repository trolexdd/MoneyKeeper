import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Wallet } from "lucide-react";

type Props = {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string) => Promise<void>;
};

export default function AuthPage({ onLogin, onRegister }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") await onLogin(email, password);
      else await onRegister(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось выполнить запрос.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-screen">
      <div className="auth-glow auth-glow-one" />
      <div className="auth-glow auth-glow-two" />
      <section className="auth-card">
        <a className="auth-brand" href="#" aria-label="MoneyKeeper">
          <span className="brand-mark"><Wallet size={19} /></span>
          <span className="brand-name">money<span>keeper</span><i>.</i></span>
        </a>
        <div className="auth-eyebrow"><span className="live-dot" /> ВАШИ ФИНАНСЫ — ПОД КОНТРОЛЕМ</div>
        <h1>{mode === "login" ? <>С возвращением<span>.</span></> : <>Создайте аккаунт<span>.</span></>}</h1>
        <p className="auth-subtitle">
          {mode === "login" ? "Войдите, чтобы управлять своими финансами." : "Начните наводить порядок в личных финансах."}
        </p>

        <div className="auth-tabs">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>Вход</button>
          <button type="button" className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(""); }}>Регистрация</button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <label className="auth-label">ЭЛЕКТРОННАЯ ПОЧТА
            <span className="auth-input-wrap"><Mail size={17} /><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" required /></span>
          </label>
          <label className="auth-label">ПАРОЛЬ
            <span className="auth-input-wrap"><LockKeyhole size={17} /><input type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === "register" ? "Минимум 12 символов" : "Ваш пароль"} minLength={mode === "register" ? 12 : 1} maxLength={128} required /><button type="button" className="password-toggle" aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></span>
          </label>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <button className="primary-button auth-submit" type="submit" disabled={busy}>
            {busy ? "Подождите..." : mode === "login" ? "Войти в аккаунт" : "Создать аккаунт"} {!busy && <ArrowRight size={17} />}
          </button>
        </form>
        <p className="auth-security"><LockKeyhole size={13} /> Пароли защищены хешированием на сервере.</p>
      </section>
      <footer className="auth-footer"><span>© 2026 MoneyKeeper</span><span>Личные финансы. Без лишнего шума.</span></footer>
    </main>
  );
}
