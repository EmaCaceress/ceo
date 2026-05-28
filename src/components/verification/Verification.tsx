import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { getToken } from "../../server/server";

type VerificationProp = {
    children: ReactNode;
  };

import { useEffect, useState } from "react";

export const Verification = ({ children }: VerificationProp) => {
    const [isValid, setIsValid] = useState<boolean | null>(null);

    useEffect(() => {
        const verifyToken = async () => {
            const token = localStorage.getItem("token");
            if (token) {
                const valid = await getToken(token);
                setIsValid(valid);
            } else {
                setIsValid(false);
            }
        };
        verifyToken();
    }, []);

    if (isValid === null) {
        return null; // Optionally, render a loading state here
    }

    if (isValid) {
        return <Navigate to="/graph" replace />;
    }

    return <>{children}</>;
};