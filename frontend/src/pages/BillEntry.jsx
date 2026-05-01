import { FileUp, ReceiptText, Save } from "lucide-react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api/client.js";
import Alert from "../components/Alert.jsx";
import CustomerSelect from "../components/CustomerSelect.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { getErrorMessage } from "../utils/format.js";

const BillEntry = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState({
    customer: searchParams.get("customer") || "",
    billNumber: "",
    billAmount: "",
    paidAmount: "0",
    paymentMode: "cash",
    purchaseDate: new Date().toISOString().slice(0, 10)
  });
  const [billFile, setBillFile] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    if (!form.customer) {
      setError(t("bill_customer_required"));
      setSubmitting(false);
      return;
    }

    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (key === "billNumber" && !String(value).trim()) {
          return;
        }

        body.append(key, value);
      });
      if (billFile) body.append("billFile", billFile);

      const { data } = await api.post("/bills", body, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      navigate(`/customers/${data.customer._id}`);
    } catch (err) {
      setError(getErrorMessage(err, t));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader title={t("bill_entry")} subtitle={t("bill_entry_subtitle")} />

      <section className="grid max-w-5xl overflow-hidden rounded-3xl bg-white shadow-soft lg:grid-cols-[0.78fr_1.22fr]">
        <div className="bg-crop-light p-6">
          <div className="icon-tile bg-white">
            <ReceiptText size={22} />
          </div>
          <h2 className="mt-6 text-2xl font-extrabold tracking-normal text-ink">{t("create_bill")}</h2>
          <p className="mt-3 text-sm font-medium leading-6 text-gray-600">
            {t("create_bill_description")}
          </p>
          <div className="mt-6 rounded-3xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3 text-sm font-bold text-crop-dark">
              <FileUp size={18} />
              {t("optional_file_upload")}
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
            <CustomerSelect value={form.customer} onChange={(value) => setForm({ ...form, customer: value })} allowCreate />

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label" htmlFor="billNumber">
                  {t("bill_number")}
                </label>
                <input
                  id="billNumber"
                  className="field"
                  value={form.billNumber}
                  onChange={(event) => setForm({ ...form, billNumber: event.target.value })}
                  placeholder={t("auto_if_blank")}
                />
              </div>
              <div>
                <label className="label" htmlFor="purchaseDate">
                  {t("purchase_date")}
                </label>
                <input
                  id="purchaseDate"
                  type="date"
                  className="field"
                  value={form.purchaseDate}
                  onChange={(event) => setForm({ ...form, purchaseDate: event.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="billAmount">
                  {t("bill_amount")}
                </label>
                <input
                  id="billAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  className="field"
                  value={form.billAmount}
                  onChange={(event) => setForm({ ...form, billAmount: event.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="paidAmount">
                  {t("paid_amount")}
                </label>
                <input
                  id="paidAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  className="field"
                  value={form.paidAmount}
                  onChange={(event) => setForm({ ...form, paidAmount: event.target.value })}
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
              <div>
                <label className="label" htmlFor="billFile">
                  {t("bill_upload")}
                </label>
                <input
                  id="billFile"
                  type="file"
                  accept="image/png,image/jpeg,application/pdf"
                  className="field"
                  onChange={(event) => setBillFile(event.target.files?.[0] || null)}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? <ReceiptText size={16} /> : <Save size={16} />}
              {submitting ? t("saving") : t("save_bill")}
            </button>
          </form>
        </div>
      </section>
    </>
  );
};

export default BillEntry;
