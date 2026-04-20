import React, { use, useEffect } from "react";
import './Capturer.scss';
import menuOpen from '../../assets/clave.png';
import menuClose from '../../assets/close.png';
import { refresh } from "../../server/server";
import { saveAs } from "file-saver";
import toast from "react-hot-toast";

const logo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAMAAABF0y+mAAAAYFBMVEVJHohGF4ZHGodoTJpjRZdlR5hNI4tYNZA9AIL////z8fc4AIBEFIV3X6PUzuE7AIFBDYSIdK2ik77Ox90yAH3h3erDutXb1uawpMj29Pl+Z6ernsS6sM+ZiLjs6fKPfbJqnnyWAAAAl0lEQVR4Ac3PRRLDQAxEUUkxMzPc/5SGDieadfJXXfUMM/Sf8Zk8t7zixbIs2xFs+5jui3r+WRAeM4rPmaRPzHJo4d2xfEGqamgkGrIFbEINKWygFvOlbtu2815RImBdEYdHsGdeAc0z0qqCE/tQxWzAq6Onv5pAHdGQXeB5C6VwMiDyTJ8FzoYDoWrRr4KiYc3IrLCftgOwLwhHYXg9PQAAAABJRU5ErkJggg==';

const Capturer: React.FC = () => {
    const [elementDesplace, setElementDesplace] = React.useState<number>(-1000);
    const [isOpen, setIsOpen] = React.useState<boolean>(true);	
    const [refreshDisable, setRefreshDisable] = React.useState<boolean>(false);
    const [code, setCode] = React.useState<string>(""); //codigo del tunel
    const [nodo, setNodo] = React.useState<string>(""); //ID del nodo
    const [nodoType, setNodoType] = React.useState<string>(""); //Tipo de nodo (RPHY o LEGACY)
    const [frecuency, setFrecuency] = React.useState<string>(""); //Frecuencia para la gráfica
    const [image, setImage] = React.useState<string | null>(null);
    const [selector, setSelector] = React.useState<string>(""); //Salida seleccionada
    const [delay, setDelay] = React.useState<string>(""); //Tiempo de refresco en segundos
    const [active, setActive] = React.useState<string>(""); //Valor activo para el nombre de la imagen
    const downloadImage = () => {
        if (image) {
            const name =  active && selector ? `${nodo}_${active || "B01"}_${selector}.png` : "grafica.png";
            saveAs(image, name);
        } else {
            toast.error("No hay imagen para descargar");
        }
      };

    const desplace: () => void = () => {
        setElementDesplace(prev => prev < 60 ? 60 : -1000);
        setIsOpen(prev => !prev);
    }; 


    const fetchAndSetImage = async () => {
        setRefreshDisable(true);
        const preload = {
            code,
            nodo,
            nodoType,
            frecuency: frecuency || "15",
            username: localStorage.getItem("username") || "UNDEFINED"
        };
    
        const IMG: string | null = await refresh(preload);
        setImage(IMG ? `${IMG}?t=${Date.now()}` : null);
        setRefreshDisable(false);
    };

    useEffect(() => {
        fetchAndSetImage();
    }, []); 

    return (
        <div className="capturer-container">    

            <div className="header">
                <div className="navbar" >
                    <img src={logo}/>
                    {
                        isOpen 
                        ? <img src={menuOpen} onClick={ () => desplace()} /> 
                        : <img src={menuClose} onClick={ () => desplace()} />
                    }
                </div>
                {
                    isOpen == false && <div className="ocultable-black"/>
                }  
                <div className="ocultable-inputs" style={{ top: `${elementDesplace}px` }}>
                    
                    <h1>Clave y Nodo ID</h1>

                    {/* <!-- link --> */}
                    <input type="text" id="link" placeholder="Clave del tunel" value={code} onChange={(e) => setCode(e.target.value)}/>

                    {/* <!-- nodoId --> */}
                    <input type="text" id="nodo" placeholder="ID del nodo" value={nodo} onChange={(e) => setNodo(e.target.value)}/>

                    {/* <!-- selector --> */}
                    <select id="nodoType" value={nodoType} onChange={(e) => setNodoType(e.target.value)}>
                        <option value="">— Seleccionar nodo —</option>
                        <option>RPHY</option>
                        <option>LEGACY</option>
                    </select>
                </div>

            </div>

            <div className="content">
                <h1>Configuracion</h1>

                {/* <!-- selector --> */}
                <label htmlFor="etiqueta">Seleccionar salida:</label>
                <select id="etiqueta" value={selector} onChange={(e) => setSelector(e.target.value)}>   
                    <option value="">— Seleccionar —</option>
                    <option>AUXILIAR 1</option>
                    <option>AUXILIAR 2</option> 
                    <option>MAIN</option>
                    <option>PUERTO 1</option>
                    <option>PUERTO 2</option>
                    <option>PUERTO 4</option>
                    <option>PUERTO 5</option>
                    <option>ANTES</option>
                    <option>DESPUES</option>
                </select>

                {/* <!-- frecuencia --> */}
                <label htmlFor="frecuencia">Guia horizontal (roja):</label>
                <input type="number" id="frecuencia" placeholder="horizontal" value={frecuency} onChange={(e) => setFrecuency(e.target.value)}/>

                {/* <!-- frecuencia --> */}
                <label htmlFor="delay">Tiempo de refresco:</label>
                <input type="number" id="delay" placeholder="delay" value={delay} onChange={(e) => setDelay(e.target.value)}/>

                <button
                    id="btnRefresh"
                    className="refresh"
                    disabled={refreshDisable}
                    onClick={() => fetchAndSetImage()}  // <- directo
                >
                    {refreshDisable === false ? "🔄 Actualizar gráfica" : "Actualizando..."}
                </button>
                <button id="btnDownload" className="download" onClick={()=>downloadImage()}>⬇️ Descargar imagen</button>

                <div className="image-wrapper" >
                    {image ? <img src={image} alt="grafica" /> : null}
                    <div id="overlay" className="overlay-text" >{selector}</div>
                </div>

                <div className="info" id="info"></div>
            </div>
        </div>
    );
}; 

export default Capturer;