import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.tsx"
import menuOpen from '../../assets/menu.png';
import menuClose from '../../assets/close.png';
import './Header.scss';  
import LogoutModal from "../logoutModal/LogoutModal.tsx";
const logo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAMAAABF0y+mAAAAYFBMVEVJHohGF4ZHGodoTJpjRZdlR5hNI4tYNZA9AIL////z8fc4AIBEFIV3X6PUzuE7AIFBDYSIdK2ik77Ox90yAH3h3erDutXb1uawpMj29Pl+Z6ernsS6sM+ZiLjs6fKPfbJqnnyWAAAAl0lEQVR4Ac3PRRLDQAxEUUkxMzPc/5SGDieadfJXXfUMM/Sf8Zk8t7zixbIs2xFs+5jui3r+WRAeM4rPmaRPzHJo4d2xfEGqamgkGrIFbEINKWygFvOlbtu2815RImBdEYdHsGdeAc0z0qqCE/tQxWzAq6Onv5pAHdGQXeB5C6VwMiDyTJ8FzoYDoWrRr4KiYc3IrLCftgOwLwhHYXg9PQAAAABJRU5ErkJggg==';

const Header: React.FC = () => {
    const [elementDesplace, setElementDesplace] = React.useState<number>(-1000);
    const [isOpen, setIsOpen] = React.useState<boolean>(true);	
    
    const { getRoleFromToken } = useAuth();
    const [role, setrole] = React.useState<string | undefined>(''); //Usuario logueado
    const [closeSession, setCloseSession] = React.useState<boolean>(true); //Modal de cerrar sesion
    const desplace: () => void = () => {
        setElementDesplace(prev => prev < 60 ? 60 : -1000);
        setIsOpen(prev => !prev);
    }; 



    useEffect(() => {

        const fetchRole = async () => {
            const role = await getRoleFromToken();
    
            console.log(role);
    
            setrole(role);
        };
    
        fetchRole();
    }, []);

    return (
        <div className="header">
            {/* <!-- Navegador --> */}
            <div className="navbar" >
                <img src={logo} alt="Logo" className="logo" />
                
                {
                    isOpen
                    ? <img src={menuOpen} onClick={ () => desplace()} /> 
                    : <img src={menuClose} onClick={ () => desplace()} />
                }
            </div>

            {/* <!-- fondo oscuro --> */}
            {
                isOpen == false && <div className="ocultable-black"/>
            }

            {/* <!-- Lista oculta --> */}
            <div className="ocultable-list" style={{ top: `${elementDesplace}px` }}>
                {
                    role === "admin" && <Link to='/admin'>Administrar usuarios</Link>
                }
                <Link to='/graph'>Espectro</Link>
                <div>Monitoria (proximamente)</div>
                <div className="ocultable-list__close" onClick={() => setCloseSession(false)}>Cerrar sesion</div>
            </div>

            {/* <!-- Cartel emergente para cerrar session --> */}
            <LogoutModal isOpen={!closeSession} onClose={() => setCloseSession(true)} onConfirm={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("username");
                window.location.href = "/";
            }} />

        </div>
    );
}

export default Header;