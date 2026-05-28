import './App.scss'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Login } from './components/login/Login'
import { ProtectedRoute } from './components/ProtectedRoute/ProtectedRoute';
import Capturer from './components/capturer/Capturer';
import { Verification } from './components/verification/Verification';
import Header from './components/header/Header';
import AdminPanel from './components/admin/AdminPanel';
import { Toaster } from "react-hot-toast";

function PrivateLayout() {
  return (
    <ProtectedRoute>
      <Header />
      <Outlet />
    </ProtectedRoute>
  );
}

function App() {
  return (
    <>
      <Toaster position="bottom-center" />

      <BrowserRouter>
        <Routes>

          {/* Públicas */}
          <Route
            path="/"
            element={
              <Verification>
                <Login />
              </Verification>
            }
          />

          {/* Privadas */}
          <Route element={<PrivateLayout />}>
            <Route path="/graph" element={<Capturer />} />
            <Route path="/admin" element={<AdminPanel />} />
          </Route>

          {/* fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;