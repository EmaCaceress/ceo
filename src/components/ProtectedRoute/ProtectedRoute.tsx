import { Navigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { getToken } from "../../server/server";

type ProtectedRouteProps = {
    children: ReactNode;
  };

export const ProtectedRoute = ({ children } : ProtectedRouteProps ) => {
const [isValid, setIsValid] = useState<boolean | null>(null); // null = cargando
    const token = localStorage.getItem("token");
    const hasRun = useRef(false);
    useEffect(() => {
        if (hasRun.current) return;
        hasRun.current = true;
      
        const verify = async () => {
            if (!token) {
                setIsValid(false);
                return;
            }
            const tokenVerified = await getToken(token);
            setIsValid(tokenVerified);
        };

        verify();
    }, [token]);

    // ⏳ mientras verifica
    if (isValid === null) return <p>Verificando...</p>;

    // ❌ token inválido
    if (!isValid){
        return <Navigate to="/" replace/>;
    }else {
        return children;
    }
}