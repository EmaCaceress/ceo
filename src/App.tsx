import './App.scss'
import { Login } from './components/login/Login'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from './components/ProtectedRoute/ProtectedRoute';
import { Verification } from './components/verification/Verification';
import Capturer from './components/capturer/Capturer';
import { Toaster } from "react-hot-toast";
import { Navigate } from 'react-router-dom';

function App() {

  return (
    <>
      <Toaster position="bottom-center" />
      <BrowserRouter>
        <Routes>
            {/* Ruta login */}
            <Route path="/" element={
              <Verification>
                <Login />
              </Verification>
            }/>
            {/* Ruta graph */}
            <Route path="/graph" element={
              <ProtectedRoute>
                <Capturer />
              </ProtectedRoute>
            }/>

            {/* fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
