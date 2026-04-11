import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { AuthProvider } from './context/AuthContext';
import AdminQueue from './pages/AdminQueue';
import AdminReports from './pages/AdminReports';
import AdminStudentDetail from './pages/AdminStudentDetail';
import AdminStudents from './pages/AdminStudents';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';
import LogPayment from './pages/LogPayment';
import Login from './pages/Login';
import PaymentHistory from './pages/PaymentHistory';
import Notifications from './pages/Notifications';
import Receipts from './pages/Receipts';
import Register from './pages/Register';
import Settings from './pages/Settings';
import VerifyEmail from './pages/VerifyEmail';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* Authenticated routes */}
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/log-payment" element={<LogPayment />} />
            <Route path="/history" element={<PaymentHistory />} />
            <Route path="/receipts" element={<Receipts />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={<Settings />} />

            {/* Admin routes */}
            <Route path="/admin/queue" element={<AdminQueue />} />
            <Route path="/admin/students" element={<AdminStudents />} />
            <Route path="/admin/students/:id" element={<AdminStudentDetail />} />
            <Route path="/admin/reports" element={<AdminReports />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
