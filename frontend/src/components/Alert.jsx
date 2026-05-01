const Alert = ({ type = "error", children }) => {
  const styles =
    type === "success"
      ? "border-crop/25 bg-crop-light text-crop-dark"
      : "border-red-200 bg-red-50 text-red-800";

  return <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${styles}`}>{children}</div>;
};

export default Alert;
