import { BadgeCheck, Save, WalletCards } from "lucide-react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api/client.js";
import Alert from "../components/Alert.jsx";
import CustomerSelect from "../components/CustomerSelect.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { getErrorMessage } from "../utils/format.js";

const PaymentEntry = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState({
    customer: searchParams.get("customer") || "",
    paidAmount: "",
    paymentMode: "cash",
    notes: ""
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const { data } = await api.post("/payments", form);
      navigate(`/customers/${data.customer._id}`);
    } catch (err) {
      setError(getErrorMessage(err, t));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader title={t("payment_collection")} subtitle={t("payment_collection_subtitle")} />

      <section className="grid max-w-5xl overflow-hidden rounded-3xl bg-white shadow-soft lg:grid-cols-[0.78fr_1.22fr]">
        <div className="bg-crop-light p-6">
          <div className="icon-tile bg-white">
            <WalletCards size={22} />
          </div>
          <h2 className="mt-6 text-2xl font-extrabold tracking-normal text-ink">{t("collect_payment")}</h2>
          <p className="mt-3 text-sm font-medium leading-6 text-gray-600">
            {t("collect_payment_description")}
          </p>
          <div className="mt-6 rounded-3xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3 text-sm font-bold text-crop-dark">
              <BadgeCheck size={18} />
              {t("balance_updates_after_save")}
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {error ? (
            <div className="mb-4">
              <Alert>{error}</Alert>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5">
            <CustomerSelect value={form.customer} onChange={(value) => setForm({ ...form, customer: value })} />

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label" htmlFor="paidAmount">
                  {t("paid_amount")}
                </label>
                <input
                  id="paidAmount"
                  type="number"
                  min="1"
                  step="0.01"
                  className="field"
                  value={form.paidAmount}
                  onChange={(event) => setForm({ ...form, paidAmount: event.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="paymentMode">
                  {t("payment_mode")}
                </label>
                <select
                  id="paymentMode"
                  className="field"
                  value={form.paymentMode}
                  onChange={(event) => setForm({ ...form, paymentMode: event.target.value })}
                >
                  <option value="cash">{t("payment_modes.cash")}</option>
                  <option value="online">{t("payment_modes.online")}</option>
                </select>
              </div>
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

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? <WalletCards size={16} /> : <Save size={16} />}
              {submitting ? t("saving") : t("save_payment")}
            </button>
          </form>
        </div>
      </section>
    </>
  );
};

export default PaymentEntry;
