const getLocale = (language) => (String(language || "").startsWith("hi") ? "hi-IN" : "en-IN");

const API_ERROR_KEYS = {
  "Invalid email or password": "api_errors.invalid_email_or_password",
  "Invalid or expired authentication token": "api_errors.invalid_or_expired_token",
  "Invalid or expired refresh token": "api_errors.invalid_or_expired_token",
  "Authentication token is required": "api_errors.authentication_token_required",
  "You do not have permission to perform this action": "api_errors.permission_denied",
  "User account is inactive or unavailable": "api_errors.inactive_user",
  "Customer not found": "api_errors.customer_not_found",
  "Payment not found": "api_errors.payment_not_found",
  "Bill not found": "api_errors.bill_not_found",
  "User not found": "api_errors.user_not_found",
  "A customer with this phone number already exists": "api_errors.duplicate_customer_phone",
  "A user with this email already exists": "api_errors.duplicate_user_email",
  "A bill with this bill number already exists": "api_errors.duplicate_bill_number",
  "Duplicate record": "api_errors.duplicate_record",
  "Name, email, and password are required": "api_errors.user_required_fields",
  "Payment cannot be greater than current due amount": "api_errors.payment_greater_than_due",
  "Paid amount cannot be greater than bill amount": "api_errors.paid_greater_than_bill",
  "Validation failed": "api_errors.validation_failed",
  "At least one customer field is required": "api_errors.one_customer_field_required",
  "At least one bill field is required": "api_errors.one_bill_field_required",
  "At least one bill field or file is required": "api_errors.one_bill_field_or_file_required",
  "At least one payment field is required": "api_errors.one_payment_field_required",
  "Invalid identifier": "api_errors.invalid_identifier",
  "Uploaded file is too large": "api_errors.uploaded_file_too_large",
  "Upload failed": "api_errors.upload_failed",
  "Only JPG, PNG, and PDF bill uploads are allowed": "api_errors.allowed_bill_uploads",
  "Bill file not found": "api_errors.bill_file_not_found",
  "Too many login attempts. Please try again after 15 minutes.": "api_errors.too_many_login",
  "Too many API requests. Please slow down and try again shortly.": "api_errors.too_many_api",
  "Too many upload requests. Please try again later.": "api_errors.too_many_uploads",
  "Network Error": "api_errors.network_error",
  "Internal server error": "api_errors.internal_server_error",
  "Something went wrong": "something_went_wrong"
};

export const formatCurrency = (value, language) => {
  return new Intl.NumberFormat(getLocale(language), {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
};

export const formatDate = (value, language) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat(getLocale(language), {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
};

export const formatDateTime = (value, language) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat(getLocale(language), {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
};

export const formatFileSize = (bytes = 0) => {
  const numeric = Number(bytes || 0);
  if (!numeric) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  let size = numeric;
  let unit = 0;

  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }

  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
};

export const getErrorMessage = (error, t) => {
  const message = error.response?.data?.message || error.message || "Something went wrong";
  const key = API_ERROR_KEYS[message];
  return typeof t === "function" && key ? t(key) : message;
};
