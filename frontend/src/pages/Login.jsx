import { ClipboardList, HeartHandshake, LogIn, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Alert from "../components/Alert.jsx";
import LanguageSwitcher from "../components/LanguageSwitcher.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getErrorMessage } from "../utils/format.js";

const Login = () => {
  const { user, login } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "owner@example.com", password: "owner12345" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await login(form);
      navigate(location.state?.from?.pathname || "/", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, t));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-card lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden brand-gradient p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="mb-10 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
                <ClipboardList size={22} />
              </div>
              <div>
                <p className="text-xl font-extrabold">{t("app_name")}</p>
                <p className="text-sm font-medium text-white/75">{t("tagline")}</p>
              </div>
            </div>

            <h1 className="max-w-md text-5xl font-extrabold leading-tight tracking-normal">
              {t("login_hero_title")}
            </h1>
            <p className="mt-5 max-w-md text-base font-medium leading-7 text-white/80">
              {t("login_hero_description")}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-white/15 p-5 backdrop-blur">
              <HeartHandshake size={24} />
              <p className="mt-4 text-sm font-bold">{t("customer_first_tracking")}</p>
            </div>
            <div className="rounded-3xl bg-white/15 p-5 backdrop-blur">
              <ShieldCheck size={24} />
              <p className="mt-4 text-sm font-bold">{t("owner_managed_access")}</p>
            </div>
          </div>
        </section>

        <section className="p-6 sm:p-10">
          <div className="mb-8 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl brand-gradient text-white">
                <ClipboardList size={22} />
              </div>
              <div>
                <h1 className="text-xl font-extrabold">{t("app_name")}</h1>
                <p className="text-sm font-medium text-gray-500">{t("tagline")}</p>
              </div>
            </div>
            <LanguageSwitcher className="ml-auto" showIcon={false} />
          </div>

          <div className="mb-8">
            <p className="badge mb-4">{t("welcome_back")}</p>
            <h2 className="text-3xl font-extrabold tracking-normal text-ink">{t("sign_in")}</h2>
            <p className="mt-2 text-sm font-medium text-gray-500">{t("login_subtitle")}</p>
          </div>

          {error ? (
            <div className="mb-4">
              <Alert>{error}</Alert>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label" htmlFor="email">
                {t("email")}
              </label>
              <input
                id="email"
                type="email"
                className="field"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="password">
                {t("password")}
              </label>
              <input
                id="password"
                type="password"
                className="field"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                required
              />
            </div>

            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              <LogIn size={17} />
              {submitting ? t("signing_in") : t("login")}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Login;
