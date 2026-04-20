import './App.scss'
import { Login } from './components/login/Login'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from './components/ProtectedRoute/ProtectedRoute';
import Capturer from './components/capturer/Capturer';
import { Toaster } from "react-hot-toast";

function App() {

  return (
    <>
      <Toaster position="bottom-center" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/graph" element={
            <ProtectedRoute>
              <Capturer />
            </ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
