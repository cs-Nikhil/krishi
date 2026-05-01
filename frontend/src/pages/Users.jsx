import { Plus, ShieldCheck, UserPlus, Users as UsersIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../api/client.js";
import Alert from "../components/Alert.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { getErrorMessage } from "../utils/format.js";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "staff",
  active: true
};

const Users = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const activeUsers = useMemo(() => users.filter((user) => user.active).length, [users]);
  const ownerUsers = useMemo(() => users.filter((user) => user.role === "owner").length, [users]);

  const load = async () => {
    const { data } = await api.get("/users");
    setUsers(data.users);
  };

  useEffect(() => {
    load().catch((err) => setError(getErrorMessage(err, t)));
  }, [t]);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      await api.post("/users", form);
      setForm(emptyForm);
      setNotice(t("user_created"));
      await load();
    } catch (err) {
      setError(getErrorMessage(err, t));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader title={t("staff_access")} subtitle={t("staff_access_subtitle")} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="stat-card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-gray-500">{t("team_members")}</p>
              <p className="mt-3 text-3xl font-extrabold">{users.length}</p>
            </div>
            <div className="icon-tile">
              <UsersIcon size={21} />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-gray-500">{t("active")}</p>
              <p className="mt-3 text-3xl font-extrabold">{activeUsers}</p>
            </div>
            <div className="icon-tile">
              <ShieldCheck size={21} />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-gray-500">{t("owners")}</p>
              <p className="mt-3 text-3xl font-extrabold">{ownerUsers}</p>
            </div>
            <div className="icon-tile">
              <UserPlus size={21} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="panel overflow-hidden">
          <div className="flex items-center gap-3 border-b border-line px-5 py-5">
            <div className="icon-tile">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 className="font-extrabold">{t("users")}</h2>
              <p className="text-sm font-medium text-gray-500">{t("users_subtitle")}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-line text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-5 py-3">{t("name")}</th>
                  <th className="px-5 py-3">{t("email")}</th>
                  <th className="px-5 py-3">{t("role")}</th>
                  <th className="px-5 py-3">{t("status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-white">
                {users.map((user) => (
                  <tr key={user._id} className="transition hover:bg-crop-light/40">
                    <td className="px-5 py-4 font-bold">{user.name}</td>
                    <td className="px-5 py-3 font-medium">{user.email}</td>
                    <td className="px-5 py-3 capitalize">
                      <span className="badge">{t(`roles.${user.role}`, { defaultValue: user.role })}</span>
                    </td>
                    <td className="px-5 py-3 font-bold text-crop-dark">{user.active ? t("active") : t("inactive")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel p-5 xl:sticky xl:top-8 xl:self-start">
          <div className="mb-5 flex items-center gap-3">
            <div className="icon-tile">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="font-extrabold">{t("create_user")}</h2>
              <p className="text-sm font-medium text-gray-500">{t("create_user_subtitle")}</p>
            </div>
          </div>
          {error ? (
            <div className="mb-3">
              <Alert>{error}</Alert>
            </div>
          ) : null}
          {notice ? (
            <div className="mb-3">
              <Alert type="success">{notice}</Alert>
            </div>
          ) : null}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label" htmlFor="userName">
                {t("name")}
              </label>
              <input
                id="userName"
                className="field"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="userEmail">
                {t("email")}
              </label>
              <input
                id="userEmail"
                type="email"
                className="field"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="userPhone">
                {t("phone")}
              </label>
              <input
                id="userPhone"
                className="field"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="userPassword">
                {t("password")}
              </label>
              <input
                id="userPassword"
                type="password"
                className="field"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="userRole">
                {t("role")}
              </label>
              <select
                id="userRole"
                className="field"
                value={form.role}
                onChange={(event) => setForm({ ...form, role: event.target.value })}
              >
                <option value="staff">{t("roles.staff")}</option>
                <option value="owner">{t("roles.owner")}</option>
              </select>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              <Plus size={16} />
              {submitting ? t("creating") : t("create_user")}
            </button>
          </form>
        </section>
      </div>
    </>
  );
};

export default Users;
