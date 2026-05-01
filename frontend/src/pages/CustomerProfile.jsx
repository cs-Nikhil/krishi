import { MapPin, Pencil, Phone, Plus, ReceiptText, ShieldAlert, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api/client.js";
import Alert from "../components/Alert.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getCustomerAddress, getCustomerName } from "../utils/customerDisplay.js";
import { formatCurrency, formatDate, getErrorMessage } from "../utils/format.js";

const CustomerProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isOwner } = useAuth();
  const { t, i18n } = useTranslation();
  const [customer, setCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState({
    name: "",
    nameHindi: "",
    phone: "",
    address: "",
    addressHindi: "",
    notes: "",
    creditLimit: ""
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const language = i18n.resolvedLanguage || i18n.language;

  const load = async () => {
    const { data } = await api.get(`/customers/${id}/transactions`);
    setCustomer(data.customer);
    setTransactions(data.transactions);
    setForm({
      name: data.customer.name || "",
      nameHindi: data.customer.nameHindi || "",
      phone: data.customer.phone || "",
      address: data.customer.address || "",
      addressHindi: data.customer.addressHindi || "",
      notes: data.customer.notes || "",
      creditLimit: data.customer.creditLimit || ""
    });
  };

  useEffect(() => {
    load().catch((err) => setError(getErrorMessage(err, t)));
  }, [id, t]);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const { data } = await api.patch(`/customers/${id}`, form);
      setCustomer(data.customer);
      setNotice(t("profile_updated"));
    } catch (err) {
      setError(getErrorMessage(err, t));
    } finally {
      setSaving(false);
    }
  };

  const openFile = async (fileUrl) => {
    try {
      const apiPath = fileUrl.replace(/^\/api/, "");
      const response = await api.get(apiPath, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      setError(getErrorMessage(err, t));
    }
  };

  if (!customer) {
    return error ? <Alert>{error}</Alert> : <p className="text-sm font-medium text-gray-600">{t("loading")}</p>;
  }

  const displayName = getCustomerName(customer, language);
  const displayAddress = getCustomerAddress(customer, language);

  return (
    <>
      <PageHeader
        title={displayName}
        subtitle={`${customer.phone}${displayAddress ? ` - ${displayAddress}` : ""} - ${customer.customerId}`}
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={() => navigate(`/payments/new?customer=${customer._id}`)}>
              <WalletCards size={16} />
              {t("payment")}
            </button>
            <button type="button" className="btn-primary" onClick={() => navigate(`/bills/new?customer=${customer._id}`)}>
              <ReceiptText size={16} />
              {t("bill")}
            </button>
          </>
        }
      />

      {error ? (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}
      {notice ? (
        <div className="mb-4">
          <Alert type="success">{notice}</Alert>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="space-y-4">
          <div className="overflow-hidden rounded-3xl brand-gradient p-5 text-white shadow-glow">
            <p className="text-sm font-bold text-white/75">{t("current_due")}</p>
            <p className="mt-3 text-4xl font-extrabold tracking-normal">{formatCurrency(customer.totalDue, language)}</p>
            <div className="mt-5 flex items-center gap-2 rounded-2xl bg-white/15 px-3 py-2 text-sm font-bold">
              <Phone size={16} />
              {customer.phone}
            </div>
            {displayAddress ? (
              <div className="mt-3 flex items-start gap-2 rounded-2xl bg-white/15 px-3 py-2 text-sm font-bold">
                <MapPin className="mt-0.5 shrink-0" size={16} />
                <span>{displayAddress}</span>
              </div>
            ) : null}
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-2xl bg-white/15 px-3 py-2 text-sm font-bold">
                {t("credit_limit")}: {formatCurrency(customer.creditLimit, language)}
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-white/15 px-3 py-2 text-sm font-bold">
                <ShieldAlert size={16} />
                {t("risk_level")}: {t(`risk_levels.${customer.riskLevel || "low"}`)}
              </div>
            </div>
          </div>

          <form onSubmit={saveProfile} className="panel p-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="icon-tile">
                <Pencil size={18} />
              </div>
              <div>
                <h2 className="font-extrabold">{t("profile")}</h2>
                <p className="text-sm font-medium text-gray-500">{t("customer_details")}</p>
              </div>
            </div>
            <div className="space-y-4">
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
                  disabled={!isOwner}
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
              <button type="submit" className="btn-secondary w-full" disabled={saving}>
                {saving ? t("saving") : t("save_profile")}
              </button>
            </div>
          </form>
        </section>

        <section className="panel overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-line px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="section-title">{t("transaction_ledger")}</h2>
              <p className="mt-1 text-sm font-medium text-gray-500">{t("transaction_ledger_subtitle")}</p>
            </div>
            <Link to={`/bills/new?customer=${customer._id}`} className="btn-secondary px-3">
              <Plus size={16} />
              {t("entry")}
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-line text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-5 py-3">{t("date")}</th>
                  <th className="px-5 py-3">{t("type")}</th>
                  <th className="px-5 py-3">{t("reference")}</th>
                  <th className="px-5 py-3">{t("bill")}</th>
                  <th className="px-5 py-3">{t("paid")}</th>
                  <th className="px-5 py-3">{t("balance")}</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-white">
                {transactions.map((item) => (
                  <tr key={`${item.type}-${item.id}`} className="transition hover:bg-crop-light/40">
                    <td className="px-5 py-4 font-medium text-gray-600">{formatDate(item.date, language)}</td>
                    <td className="px-5 py-3 capitalize">
                      <span className="badge">{t(`activity_types.${item.type}`, { defaultValue: item.type })}</span>
                    </td>
                    <td className="px-5 py-3 font-medium">{item.billNumber || item.notes || "-"}</td>
                    <td className="px-5 py-3 font-bold">
                      {item.type === "bill" ? formatCurrency(item.billAmount, language) : "-"}
                    </td>
                    <td className="px-5 py-3 font-bold text-crop-dark">{formatCurrency(item.paidAmount || 0, language)}</td>
                    <td className="px-5 py-3 font-extrabold">{formatCurrency(item.balanceAfter, language)}</td>
                    <td className="px-5 py-3 text-right">
                      {item.fileUrl ? (
                        <button type="button" className="btn-secondary px-3" onClick={() => openFile(item.fileUrl)}>
                          {t("view")}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {!transactions.length ? (
                  <tr>
                    <td className="px-5 py-6 text-center text-gray-500" colSpan="7">
                      {t("no_transactions_yet")}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
};

export default CustomerProfile;
