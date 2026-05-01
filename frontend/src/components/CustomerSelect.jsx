import { Check, Loader2, Plus, Search, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../api/client.js";
import { getCustomerAddress, getCustomerName, hasDevanagariText } from "../utils/customerDisplay.js";
import { formatCurrency, getErrorMessage } from "../utils/format.js";

const emptyCustomerForm = { name: "", nameHindi: "", phone: "", address: "", addressHindi: "", notes: "" };

const normalizePhone = (phone = "") => phone.replace(/[^\d]/g, "");

const getPrefill = (query) => {
  const trimmed = query.trim();
  const looksLikePhone = /^\+?\d[\d\s-]{5,}$/.test(trimmed);

  return {
    ...emptyCustomerForm,
    name: looksLikePhone || hasDevanagariText(trimmed) ? "" : trimmed,
    nameHindi: !looksLikePhone && hasDevanagariText(trimmed) ? trimmed : "",
    phone: looksLikePhone ? trimmed : ""
  };
};

const CustomerSelect = ({ value, onChange, allowCreate = false }) => {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCustomerForm);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState(null);
  const [dismissedMissingSearch, setDismissedMissingSearch] = useState("");
  const [phoneMatches, setPhoneMatches] = useState([]);
  const [phoneChecking, setPhoneChecking] = useState(false);
  const language = i18n.resolvedLanguage || i18n.language;

  const trimmedSearch = search.trim();
  const suggestions = customers.slice(0, 7);
  const duplicateCustomer = useMemo(() => {
    const phone = normalizePhone(createForm.phone);
    if (!phone) return null;
    return phoneMatches.find((customer) => normalizePhone(customer.phone) === phone) || null;
  }, [createForm.phone, phoneMatches]);

  const showToast = (type, message) => {
    setToast({ type, message });
  };

  const getAddressLabel = (customer) => getCustomerAddress(customer, language) || "-";

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (selectedCustomer) {
      setSearch(getCustomerName(selectedCustomer, language));
    }
  }, [language, selectedCustomer]);

  useEffect(() => {
    if (!value) {
      setSelectedCustomer(null);
      return;
    }

    const existing = customers.find((customer) => customer._id === value);
    if (existing) {
      setSelectedCustomer(existing);
      return;
    }

    let ignore = false;
    api
      .get(`/customers/${value}`)
      .then(({ data }) => {
        if (ignore) return;
        setSelectedCustomer(data.customer);
        setCustomers((current) => {
          if (current.some((customer) => customer._id === data.customer._id)) return current;
          return [data.customer, ...current];
        });
      })
      .catch(() => {
        if (!ignore) setSelectedCustomer(null);
      });

    return () => {
      ignore = true;
    };
  }, [value, customers]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/customers", { params: { search: trimmedSearch } });
        const results = data.customers || [];
        setCustomers(results);
        setError("");

        if (
          allowCreate &&
          trimmedSearch.length >= 2 &&
          results.length === 0 &&
          dismissedMissingSearch !== trimmedSearch &&
          !createOpen &&
          !value
        ) {
          setCreateForm(getPrefill(trimmedSearch));
          setCreateError("");
          setCreateOpen(true);
        }
      } catch (err) {
        setError(getErrorMessage(err, t));
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [allowCreate, createOpen, dismissedMissingSearch, trimmedSearch, value, t]);

  useEffect(() => {
    if (!createOpen || normalizePhone(createForm.phone).length < 5) {
      setPhoneMatches([]);
      setPhoneChecking(false);
      return undefined;
    }

    const timer = setTimeout(async () => {
      setPhoneChecking(true);
      try {
        const { data } = await api.get("/customers", { params: { search: createForm.phone.trim() } });
        setPhoneMatches(data.customers || []);
      } catch {
        setPhoneMatches([]);
      } finally {
        setPhoneChecking(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [createForm.phone, createOpen]);

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setSearch(getCustomerName(customer, language));
    setShowSuggestions(false);
    setCreateOpen(false);
    setCreateError("");
    onChange(customer._id);
  };

  const clearSelectionForSearch = (nextSearch) => {
    setSearch(nextSearch);
    setShowSuggestions(true);
    if (value) {
      onChange("");
    }
    setSelectedCustomer(null);
  };

  const openCreateModal = () => {
    setCreateForm(getPrefill(trimmedSearch));
    setCreateError("");
    setCreateOpen(true);
  };

  const closeCreateModal = () => {
    setDismissedMissingSearch(trimmedSearch);
    setCreateOpen(false);
    setCreateError("");
  };

  const createCustomer = async () => {
    if (creating) {
      return;
    }

    setCreateError("");

    if (!createForm.name.trim() || !createForm.phone.trim()) {
      setCreateError(t("full_name_phone_required"));
      return;
    }

    if (duplicateCustomer) {
      setCreateError(t("duplicate_customer_phone_error"));
      showToast("error", t("duplicate_phone_number_found"));
      return;
    }

    setCreating(true);
    try {
      const { data } = await api.post("/customers", {
        name: createForm.name.trim(),
        nameHindi: createForm.nameHindi.trim(),
        phone: createForm.phone.trim(),
        address: createForm.address.trim(),
        addressHindi: createForm.addressHindi.trim(),
        notes: createForm.notes.trim()
      });

      const newCustomer = data.customer;
      setCustomers((current) => [newCustomer, ...current.filter((customer) => customer._id !== newCustomer._id)]);
      selectCustomer(newCustomer);
      setCreateForm(emptyCustomerForm);
      showToast("success", t("customer_created_selected"));
    } catch (err) {
      const message = getErrorMessage(err, t);
      setCreateError(message);
      showToast("error", message);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateKeyDown = (event) => {
    if (event.key !== "Enter" || event.target.tagName === "TEXTAREA") {
      return;
    }

    event.preventDefault();
    createCustomer();
  };

  const noResults = trimmedSearch.length >= 2 && !loading && suggestions.length === 0;

  return (
    <div className="relative space-y-3">
      {toast ? (
        <div className="fixed right-4 top-4 z-50 w-[calc(100%-2rem)] max-w-sm">
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-bold shadow-card ${
              toast.type === "success"
                ? "border-crop/25 bg-crop-light text-crop-dark"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {toast.message}
          </div>
        </div>
      ) : null}

      <div>
        <label className="label" htmlFor="customer-search">
          {t("search_customer")}
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
          <input
            id="customer-search"
            className="field pl-11 pr-11"
            value={search}
            onChange={(event) => clearSelectionForSearch(event.target.value)}
            onFocus={() => setShowSuggestions(true)}
            placeholder={t("name_phone_customer_id")}
            autoComplete="off"
          />
          {loading ? (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-crop-dark" size={17} />
          ) : selectedCustomer ? (
            <Check className="absolute right-4 top-1/2 -translate-y-1/2 text-crop-dark" size={18} />
          ) : null}
        </div>

        {showSuggestions && (loading || suggestions.length > 0 || noResults) ? (
          <div className="absolute z-30 mt-2 max-h-80 w-full overflow-hidden rounded-3xl border border-line bg-white shadow-card">
            {loading ? (
              <div className="flex items-center gap-2 px-4 py-4 text-sm font-semibold text-gray-500">
                <Loader2 className="animate-spin text-crop-dark" size={17} />
                {t("searching_customers")}
              </div>
            ) : null}

            {!loading &&
              suggestions.map((customer) => (
                <button
                  key={customer._id}
                  type="button"
                  className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left transition last:border-b-0 hover:bg-crop-light"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    selectCustomer(customer);
                  }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-crop-light text-crop-dark">
                    <UserRound size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-extrabold text-ink">{getCustomerName(customer, language)}</div>
                    <div className="truncate text-xs font-semibold text-gray-500">
                      {customer.phone} - {getAddressLabel(customer)}
                    </div>
                    <div className="truncate text-[11px] font-semibold text-gray-400">{customer.customerId}</div>
                  </div>
                  <div className="shrink-0 text-right text-xs font-bold text-crop-dark">
                    {formatCurrency(customer.totalDue, language)}
                  </div>
                </button>
              ))}

            {!loading && noResults ? (
              <div className="px-4 py-4">
                <p className="text-sm font-bold text-ink">{t("customer_not_found")}</p>
                {allowCreate ? (
                  <button type="button" className="btn-primary mt-3 w-full" onMouseDown={openCreateModal}>
                    <Plus size={16} />
                    {t("add_new_customer")}
                  </button>
                ) : (
                  <p className="mt-1 text-sm font-medium text-gray-500">{t("try_another_customer_search")}</p>
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {selectedCustomer ? (
        <div className="flex items-center gap-3 rounded-2xl border border-crop/20 bg-crop-light px-4 py-3 text-sm text-crop-dark">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white">
            <UserRound size={17} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-bold">{getCustomerName(selectedCustomer, language)}</div>
            <div className="truncate text-xs font-semibold">
              {selectedCustomer.phone} - {getAddressLabel(selectedCustomer)}
            </div>
            <div className="truncate text-[11px] font-semibold text-crop-dark/70">
              {selectedCustomer.customerId} - {formatCurrency(selectedCustomer.totalDue, language)}
            </div>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}

      {createOpen ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/50 px-4 py-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-card">
            <div className="flex items-start justify-between gap-4 brand-gradient px-5 py-5 text-white">
              <div>
                <p className="text-xs font-bold uppercase tracking-normal text-white/70">{t("customer_not_found")}</p>
                <h2 className="mt-1 text-2xl font-extrabold tracking-normal">{t("add_new_customer_question")}</h2>
                <p className="mt-1 text-sm font-medium text-white/80">{t("create_profile_keep_billing")}</p>
              </div>
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 transition hover:bg-white/25"
                onClick={closeCreateModal}
                aria-label={t("close_add_customer_modal")}
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-5" onKeyDown={handleCreateKeyDown}>
              {createError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                  {createError}
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="new-customer-name">
                    {t("full_name")}
                  </label>
                  <input
                    id="new-customer-name"
                    className="field"
                    value={createForm.name}
                    onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="new-customer-name-hindi">
                    {t("name_hindi")}
                  </label>
                  <input
                    id="new-customer-name-hindi"
                    className="field"
                    value={createForm.nameHindi}
                    onChange={(event) => setCreateForm({ ...createForm, nameHindi: event.target.value })}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="new-customer-phone">
                    {t("phone_number")}
                  </label>
                  <div className="relative">
                    <input
                      id="new-customer-phone"
                      className="field pr-11"
                      value={createForm.phone}
                      onChange={(event) => setCreateForm({ ...createForm, phone: event.target.value })}
                      required
                    />
                    {phoneChecking ? (
                      <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-crop-dark" size={17} />
                    ) : null}
                  </div>
                </div>
              </div>

              {duplicateCustomer ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                  {t("phone_already_belongs", { name: getCustomerName(duplicateCustomer, language) })}
                  <button
                    type="button"
                    className="ml-2 font-extrabold text-crop-dark underline"
                    onClick={() => selectCustomer(duplicateCustomer)}
                  >
                    {t("select_existing_customer")}
                  </button>
                </div>
              ) : createForm.phone.trim() && normalizePhone(createForm.phone).length >= 5 && !phoneChecking ? (
                <div className="rounded-2xl border border-crop/20 bg-crop-light px-4 py-3 text-sm font-semibold text-crop-dark">
                  {t("phone_number_available")}
                </div>
              ) : null}

              <div>
                <label className="label" htmlFor="new-customer-address">
                  {t("address")}
                </label>
                <textarea
                  id="new-customer-address"
                  className="field min-h-20"
                  value={createForm.address}
                  onChange={(event) => setCreateForm({ ...createForm, address: event.target.value })}
                />
              </div>

              <div>
                <label className="label" htmlFor="new-customer-address-hindi">
                  {t("address_hindi")}
                </label>
                <textarea
                  id="new-customer-address-hindi"
                  className="field min-h-20"
                  value={createForm.addressHindi}
                  onChange={(event) => setCreateForm({ ...createForm, addressHindi: event.target.value })}
                />
              </div>

              <div>
                <label className="label" htmlFor="new-customer-notes">
                  {t("optional_notes")}
                </label>
                <textarea
                  id="new-customer-notes"
                  className="field min-h-20"
                  value={createForm.notes}
                  onChange={(event) => setCreateForm({ ...createForm, notes: event.target.value })}
                />
              </div>

              <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
                <button type="button" className="btn-secondary" onClick={closeCreateModal}>
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={creating || Boolean(duplicateCustomer)}
                  onClick={createCustomer}
                >
                  {creating ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                  {creating ? t("creating") : t("create_and_select")}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default CustomerSelect;
