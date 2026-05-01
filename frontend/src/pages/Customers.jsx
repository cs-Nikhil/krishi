import { Filter, Plus, Search, ShieldAlert, UserPlus, Users, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api/client.js";
import Alert from "../components/Alert.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { getCustomerAddress, getCustomerName } from "../utils/customerDisplay.js";
import { formatCurrency, formatDate, getErrorMessage } from "../utils/format.js";

const emptyForm = { name: "", nameHindi: "", phone: "", address: "", addressHindi: "", notes: "", creditLimit: "" };
const initialFilters = {
  quickFilter: "",
  search: "",
  name: "",
  phone: "",
  customerId: "",
  dueMin: "",
  dueMax: ""
};

const quickFilters = [
  { key: "", labelKey: "all_customers" },
  { key: "dueOnly", labelKey: "due_customers_only" },
  { key: "fullyPaid", labelKey: "fully_paid_customers" },
  { key: "overdue30", labelKey: "overdue_30" },
  { key: "highDue", labelKey: "high_due_customers" },
  { key: "recent", labelKey: "recent_customers" }
];

const Customers = () => {
  const { t, i18n } = useTranslation();
  const [customers, setCustomers] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const totalDue = useMemo(
    () => customers.reduce((sum, customer) => sum + Number(customer.totalDue || 0), 0),
    [customers]
  );
  const language = i18n.resolvedLanguage || i18n.language;
  const highRiskCount = useMemo(
    () => customers.filter((customer) => customer.riskLevel === "high").length,
    [customers]
  );

  const loadCustomers = async (nextFilters = filters) => {
    const params = Object.entries(nextFilters).reduce((next, [key, value]) => {
      if (value !== "") next[key] = value;
      return next;
    }, { limit: 100 });
    const { data } = await api.get("/customers", { params });
    setCustomers(data.customers);
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        await loadCustomers(filters);
        setError("");
      } catch (err) {
        setError(getErrorMessage(err, t));
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [filters, t]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await api.post("/customers", form);
      setForm(emptyForm);
      setSuccess(t("customer_added"));
      await loadCustomers(initialFilters);
      setFilters(initialFilters);
    } catch (err) {
      setError(getErrorMessage(err, t));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader title={t("customers")} subtitle={t("customers_subtitle")} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="stat-card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-gray-500">{t("visible_customers")}</p>
              <p className="mt-3 text-3xl font-extrabold">{customers.length}</p>
            </div>
            <div className="icon-tile">
              <Users size={21} />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-gray-500">{t("visible_due")}</p>
              <p className="mt-3 text-3xl font-extrabold">{formatCurrency(totalDue, language)}</p>
            </div>
            <div className="icon-tile">
              <WalletCards size={21} />
            </div>
          </div>
        </div>
        <div className="stat-card sm:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-gray-500">{t("high_risk_customers")}</p>
              <p className="mt-3 text-3xl font-extrabold">{highRiskCount}</p>
            </div>
            <div className="icon-tile">
              <ShieldAlert size={21} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="panel overflow-hidden">
          <div className="border-b border-line p-5">
            <div className="mb-4 flex flex-wrap gap-2">
              {quickFilters.map((filter) => (
                <button
                  key={filter.key || "all"}
                  type="button"
                  className={`filter-chip ${filters.quickFilter === filter.key ? "filter-chip-active" : ""}`}
                  onClick={() => setFilters((value) => ({ ...value, quickFilter: filter.key }))}
                >
                  {t(filter.labelKey)}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
              <input
                className="field pl-9"
                value={filters.search}
                onChange={(event) => setFilters((value) => ({ ...value, search: event.target.value }))}
                placeholder={t("search_by_name_phone_id")}
              />
            </div>
            <div className="mt-4 rounded-3xl bg-gray-50 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-ink">
                <Filter size={16} />
                {t("advanced_search")}
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <input
                  className="field"
                  value={filters.name}
                  onChange={(event) => setFilters((value) => ({ ...value, name: event.target.value }))}
                  placeholder={t("by_name")}
                />
                <input
                  className="field"
                  value={filters.phone}
                  onChange={(event) => setFilters((value) => ({ ...value, phone: event.target.value }))}
                  placeholder={t("by_phone")}
                />
                <input
                  className="field"
                  value={filters.customerId}
                  onChange={(event) => setFilters((value) => ({ ...value, customerId: event.target.value }))}
                  placeholder={t("by_customer_id")}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="0"
                    className="field"
                    value={filters.dueMin}
                    onChange={(event) => setFilters((value) => ({ ...value, dueMin: event.target.value }))}
                    placeholder={t("min_due")}
                  />
                  <input
                    type="number"
                    min="0"
                    className="field"
                    value={filters.dueMax}
                    onChange={(event) => setFilters((value) => ({ ...value, dueMax: event.target.value }))}
                    placeholder={t("max_due")}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-line text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-5 py-3">{t("customer")}</th>
                  <th className="px-5 py-3">{t("phone")}</th>
                  <th className="px-5 py-3">{t("address")}</th>
                  <th className="px-5 py-3">{t("current_due")}</th>
                  <th className="px-5 py-3">{t("risk_level")}</th>
                  <th className="px-5 py-3">{t("last_payment_date")}</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-white">
                {customers.map((customer) => (
                  <tr key={customer._id} className="transition hover:bg-crop-light/40">
                    <td className="px-5 py-4">
                      <div className="font-bold">{getCustomerName(customer, language)}</div>
                      <div className="text-xs font-medium text-gray-500">{customer.customerId}</div>
                    </td>
                    <td className="px-5 py-3 font-medium">{customer.phone}</td>
                    <td className="max-w-xs px-5 py-3 font-medium text-gray-600">
                      <div className="line-clamp-2">{getCustomerAddress(customer, language) || "-"}</div>
                    </td>
                    <td className="px-5 py-3 font-bold text-crop-dark">{formatCurrency(customer.totalDue, language)}</td>
                    <td className="px-5 py-3">
                      <span className={`risk-badge risk-${customer.riskLevel || "low"}`}>
                        {t(`risk_levels.${customer.riskLevel || "low"}`)}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-600">{formatDate(customer.lastPaymentDate, language)}</td>
                    <td className="px-5 py-3 text-right">
                      <Link className="btn-secondary px-3" to={`/customers/${customer._id}`}>
                        {t("open")}
                      </Link>
                    </td>
                  </tr>
                ))}
                {!customers.length ? (
                  <tr>
                    <td className="px-5 py-6 text-center text-gray-500" colSpan="7">
                      {t("no_customers_found")}
                    </td>
                  </tr>
                ) : null}
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
              <h2 className="font-extrabold">{t("add_customer")}</h2>
              <p className="text-sm font-medium text-gray-500">{t("add_customer_subtitle")}</p>
            </div>
          </div>
          {error ? (
            <div className="mb-3">
              <Alert>{error}</Alert>
            </div>
          ) : null}
          {success ? (
            <div className="mb-3">
              <Alert type="success">{success}</Alert>
            </div>
          ) : null}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="name">
                {t("name")}
              </label>
              <input
                id="name"
                className="field"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="nameHindi">
                {t("name_hindi")}
              </label>
              <input
                id="nameHindi"
                className="field"
                value={form.nameHindi}
                onChange={(event) => setForm({ ...form, nameHindi: event.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="phone">
                {t("phone")}
              </label>
              <input
                id="phone"
                className="field"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="address">
                {t("address")}
              </label>
              <textarea
                id="address"
                className="field min-h-20"
                value={form.address}
                onChange={(event) => setForm({ ...form, address: event.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="addressHindi">
                {t("address_hindi")}
              </label>
              <textarea
                id="addressHindi"
                className="field min-h-20"
                value={form.addressHindi}
                onChange={(event) => setForm({ ...form, addressHindi: event.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="notes">
                {t("notes")}
              </label>
              <textarea
                id="notes"
                className="field min-h-20"
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="creditLimit">
                {t("credit_limit")}
              </label>
              <input
                id="creditLimit"
                type="number"
                min="0"
                step="0.01"
                className="field"
                value={form.creditLimit}
                onChange={(event) => setForm({ ...form, creditLimit: event.target.value })}
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              <Plus size={16} />
              {submitting ? t("adding") : t("add_customer")}
            </button>
          </form>
        </section>
      </div>
    </>
  );
};

export default Customers;
