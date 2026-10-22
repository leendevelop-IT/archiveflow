import { useState, type FormEvent } from "react";
import { Archive, Eye, EyeOff, LogIn } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Field } from "@/components/ui";

export function Login({ orgName, onLoggedIn }: { orgName: string; onLoggedIn: (account: { id: number; username: string; name: string; role: string; status: string }) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const login = trpc.auth.localLogin.useMutation({
    onSuccess: (account) => onLoggedIn(account),
    onError: (e) => setError(e.message || "تعذر الدخول، حاول مرة أخرى."),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!username.trim() || !password) { setError("اكتب اسم الدخول وكلمة المرور."); return; }
    login.mutate({ username: username.trim(), password });
  };

  return (
    <div className="login-page" dir="rtl">
      <aside className="login-aside" aria-hidden="true">
        <div className="brand brand-light">
          <span className="brand-mark"><Archive size={26} /></span>
          <strong>{orgName}</strong>
        </div>
        <div className="login-aside-copy">
          <h2>سجل الوارد والصادر، في مكان واحد.</h2>
          <ul>
            <li>رقم تلقائي لكل معاملة من لحظة تسجيلها</li>
            <li>تنبيه واضح لكل معاملة اقترب موعدها أو تأخرت</li>
            <li>بحث وتقارير وطباعة بدون خطوات معقدة</li>
          </ul>
        </div>
        <span className="login-aside-foot">نظام أرشفة المعاملات</span>
      </aside>

      <main className="login-main">
        <div className="login-card">
          <div className="brand login-brand-mobile">
            <span className="brand-mark"><Archive size={22} /></span>
            <strong>{orgName}</strong>
          </div>
          <h1>تسجيل الدخول</h1>
          <p className="muted">أدخل اسم الدخول وكلمة المرور اللذين أعطاك إياهما مدير النظام.</p>
          <form onSubmit={submit} noValidate className="form">
            <Field label="اسم الدخول">
              {({ id }) => <input id={id} dir="ltr" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus />}
            </Field>
            <Field label="كلمة المرور">
              {({ id }) => (
                <div className="input-with-button">
                  <input id={id} dir="ltr" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
                  <button type="button" className="icon-btn icon-btn-plain" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} aria-pressed={showPassword}>
                    {showPassword ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
                  </button>
                </div>
              )}
            </Field>
            {error && <div className="alert alert-error" role="alert">{error}</div>}
            <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={login.isPending}>
              <LogIn size={20} aria-hidden="true" /> {login.isPending ? "جارٍ التحقق…" : "دخول"}
            </button>
          </form>
          <p className="login-hint">نسيت كلمة المرور؟ اطلب من مدير النظام تعيين كلمة مرور جديدة.</p>
        </div>
      </main>
    </div>
  );
}
