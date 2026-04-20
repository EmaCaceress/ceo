import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";

type ProtectedRouteProps = {
    children: ReactNode;
  };

export const ProtectedRoute = ({ children } : ProtectedRouteProps ) => {
    const token = localStorage.getItem("token");
    if (!token) {
        return <Navigate to="/" replace />;
    }

    return children;
} 