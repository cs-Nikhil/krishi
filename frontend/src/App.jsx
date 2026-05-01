import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AuditLogs from "./pages/AuditLogs.jsx";
import BillEntry from "./pages/BillEntry.jsx";
import CustomerProfile from "./pages/CustomerProfile.jsx";
import Customers from "./pages/Customers.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Login from "./pages/Login.jsx";
import PaymentEntry from "./pages/PaymentEntry.jsx";
import Reports from "./pages/Reports.jsx";
import Settings from "./pages/Settings.jsx";
import Users from "./pages/Users.jsx";

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/:id" element={<CustomerProfile />} />
          <Route path="reports" element={<Reports />} />
          <Route path="bills/new" element={<BillEntry />} />
          <Route path="payments/new" element={<PaymentEntry />} />
          <Route path="settings" element={<Settings />} />
          <Route element={<ProtectedRoute roles={["owner"]} />}>
            <Route path="users" element={<Users />} />
            <Route path="audit-logs" element={<AuditLogs />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
