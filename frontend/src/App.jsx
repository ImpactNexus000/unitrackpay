import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { AuthProvider } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import LogPayment from './pages/LogPayment';
import Login from './pages/Login';
import Register from './pages/Register';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/log-payment" element={<LogPayment />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
