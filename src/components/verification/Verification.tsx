import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";

type VerificationProp = {
    children: ReactNode;
  };

export const Verification = ({ children } : VerificationProp ) => {
    const token = localStorage.getItem("token");
    if (token) {
        return <Navigate to="/graph" replace />;
    }
    return children;
}