import { AlertTriangle, Bell, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { formatCurrency, formatDate, getErrorMessage } from "../utils/format.js";

const priorityTone = {
  high: "bg-red-50 text-red-700 border-red-100",
  medium: "bg-amber-50 text-amber-700 border-amber-100",
  low: "bg-emerald-50 text-emerald-700 border-emerald-100"
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState("");
  const language = i18n.resolvedLanguage || i18n.language;

  const load = async () => {
    try {
      const { data } = await api.get("/notifications", { params: { limit: 8 } });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, t));
    }
  };

  useEffect(() => {
    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      return undefined;
    }

    load();
    const interval = window.setInterval(load, 60000);
    return () => window.clearInterval(interval);
  }, [token]);

  const openNotification = async (notification) => {
    try {
      if (!notification.isRead) {
        await api.patch(`/notifications/${notification._id}/read`);
      }
      setOpen(false);
      await load();
      navigate(`/customers/${notification.customerId}`);
    } catch (err) {
      setError(getErrorMessage(err, t));
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-white text-crop-dark shadow-sm transition hover:bg-crop-light"
        onClick={() => setOpen((value) => !value)}
        aria-label={t("notifications")}
      >
        <Bell size={18} />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-center text-[11px] font-extrabold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-3 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-line bg-white text-ink shadow-card">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <p className="font-extrabold">{t("due_notifications")}</p>
              <p className="text-xs font-medium text-gray-500">{t("notification_subtitle")}</p>
            </div>
            <span className="badge">{unreadCount}</span>
          </div>
          {error ? <div className="px-4 py-3 text-sm font-medium text-red-700">{error}</div> : null}
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <button
                key={notification._id}
                type="button"
                className="block w-full border-b border-line px-4 py-3 text-left transition hover:bg-crop-light/50"
                onClick={() => openNotification(notification)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-extrabold">{notification.customerName}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs font-bold text-gray-500">
                      <Phone size={13} />
                      {notification.phone}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-extrabold uppercase ${
                      priorityTone[notification.priority] || priorityTone.low
                    }`}
                  >
                    {t(`risk_levels.${notification.priority}`, { defaultValue: notification.priority })}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-xs font-bold text-gray-600 sm:grid-cols-2">
                  <span>{t("due_amount")}: {formatCurrency(notification.dueAmount, language)}</span>
                  <span>{t("last_payment_date")}: {formatDate(notification.lastPaymentDate, language)}</span>
                </div>
                <p className="mt-2 flex items-start gap-2 text-xs font-medium text-gray-500">
                  <AlertTriangle className="mt-0.5 shrink-0 text-red-500" size={14} />
                  {notification.message}
                </p>
              </button>
            ))}
            {!notifications.length ? (
              <div className="px-4 py-8 text-center text-sm font-medium text-gray-500">
                {t("no_notifications")}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default NotificationBell;
