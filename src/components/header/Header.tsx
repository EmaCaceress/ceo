import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.tsx"
import menuOpen from '../../assets/menu.png';
import menuClose from '../../assets/close.png';
import './Header.scss';  
import LogoutModal from "../logoutModal/LogoutModal.tsx";
import logo from '../../assets/icon.png';

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
                <img src={logo} alt="Logo" className="logo" style={{width: "60px", height: "60px"}}/>
                
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
                <Link to='/monitoring'>Monitoria</Link>
                <Link to='/suscribers'>Abonados</Link>
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