import {
    createContext,
    useContext,
    useState,
    type ReactNode
} from "react";
import { getRole } from "../../server/server.tsx";

type User = {
    id: number;
    username: string;
    role: "admin" | "tecnico" | "operador";
};

type AuthContextType = {
    user: User | null;
    getRoleFromToken: () => Promise<string>;
    login: (userData: User) => void;
    logout: () => void;
};

const AuthContext =
    createContext<AuthContextType | null>(null);

type AuthProviderProps = {
    children: ReactNode;
};

export function AuthProvider({
    children
}: AuthProviderProps) {

    const [user, setUser] =
        useState<User | null>(null);

    const getRoleFromToken = async () => {
        const token = localStorage.getItem("token");
        return await getRole(token);
    }

    function login(userData: User) {
        localStorage.setItem(
            "user",
            JSON.stringify(userData)
        );

        setUser(userData);
    }

    function logout() {

        localStorage.removeItem("user");

        setUser(null);
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                getRoleFromToken,
                login,
                logout
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {

    const context =
        useContext(AuthContext);

    if (!context) {
        throw new Error(
            "useAuth debe usarse dentro de AuthProvider"
        );
    }

    return context;
}