import React, { useEffect } from "react";
import './Capturer.scss';
import { refresh } from "../../server/server";
import { saveAs } from "file-saver";
import toast from "react-hot-toast";
import refreshIcon from '../../assets/refresh.png'
import refreshButton from '../../assets/refreshButton.png';
import downloadButton from '../../assets/downloadButton.png';
import expandButton from '../../assets/expandButton.png';

const Capturer: React.FC = () => {
    const [refreshDisable, setRefreshDisable] = React.useState<boolean>(false);
    const [frecuency, setFrecuency] = React.useState<string>(""); //Frecuencia para la gráfica
    const [image, setImage] = React.useState<string | null>(null); //URL de la imagen a mostrar
    const [selector, setSelector] = React.useState<string>(""); //Salida seleccionada
    const [expand, setExpand] = React.useState<boolean>(false);
    const [nodo, setNodo] = React.useState<string>(""); //ID del nodo
    const upNodo = (e: string) => {
        setNodo(e);
        localStorage.setItem("nodo", e);
    }
    const downloadImage = () => {
        if (!image) {
          toast.error("No hay imagen para descargar");
          return;
        }
      
        const img = new Image();
        img.crossOrigin = "anonymous";
      
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
      
          if (!ctx) return;
      
          canvas.width = img.width;
          canvas.height = img.height;
      
          // dibujar imagen
          ctx.drawImage(img, 0, 0);
      
          // 🎯 CONFIG TEXTO
          const padding = 10;
          ctx.font = "48px Arial";
      
          const textWidth = ctx.measureText(selector).width;
          const textHeight = 48; // aprox altura del texto
      
          // 📍 posición arriba derecha
          const x = canvas.width - textWidth - padding * 2;
          const y = padding;
      
          // 🟩 fondo negro (recuadro)
          ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
          ctx.fillRect(x - padding / 2, y, textWidth + padding, textHeight);
      
          // ✍️ texto
          ctx.fillStyle = "white";
          ctx.textBaseline = "top";
          ctx.fillText(selector, x, y + 2);
      
          // descargar
          canvas.toBlob((blob) => {
            if (blob) {
              saveAs(blob, "grafica.png");
            }
          });
        };
      
        img.src = image;
    };
    const fetchAndSetImage = async () => {
        
        setRefreshDisable(true);
        const preload = {
            nodo: localStorage.getItem("nodo") || "DEFAULT_NODO",
            frecuency: frecuency || "15",
            username: localStorage.getItem("username") || "UNDEFINED"
        }; 
    
        const IMG: string | null = await refresh(preload);
        setImage(IMG ? `${IMG}?t=${Date.now()}` : refreshIcon); // Agrega un timestamp para evitar caché
        setRefreshDisable(false);
    };

    useEffect(() => {
        if (image === null){
            setImage(refreshIcon);
        }else{
            fetchAndSetImage();
        }
        setNodo(localStorage.getItem("nodo") || "");
    }, []);

    return (
        <div className="capturer-container">    
            

            <div className="content">
            <h1 className="title">Espectro</h1>
                <section className="image-wrapper" >
                    <input className="search" type="text" id="nodo" placeholder="Ingrese un nodo" value={nodo} onChange={(e) => upNodo(e.target.value)}/>

                    <div>
                        <div id="overlay" className="overlay-text" >{selector}</div>
                    </div>
                    {image ? <img src={image} alt="grafica" /> : null}

                    <div className="containerButtons">
                        <button id="btnRefresh" className="refresh" disabled={refreshDisable} onClick={() => fetchAndSetImage()}><img className="containerButtons__img" src={refreshButton}/></button>
                        <button id="btnDownload" className="download" onClick={()=>downloadImage()}><img className="containerButtons__img" src={downloadButton}/></button>
                        <button id="btnExpand" className="expand" onClick={()=>setExpand(true)}><img className="containerButtons__img" src={expandButton}/></button>
                    </div>

                    {expand && (
                        <div
                        style={{
                            position: "fixed",
                            inset: 0,
                            background: "rgba(0,0,0,0.95)",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "end",
                            padding: "2rem",
                            zIndex: 9999,
                            width: "100vw",
                            height: "100vh",
                        }}
                        >
                            <img
                                src={image || undefined}
                                alt=""
                                style={{
                                    position: "absolute",
                                    top: "50%",
                                    left: "50%",
                                    width: "100dvh",
                                    height: "100dvw",
                                    objectFit: "cover",
                                    transform: "translate(-50%, -50%) rotate(90deg)",
                                    maxWidth: "none",
                                    zIndex: -1,
                                }}
                            />
                            <div className="containerButtons">
                                <button id="btnRefresh" className="refresh" disabled={refreshDisable} onClick={() => fetchAndSetImage()}><img className="containerButtons__img" src={refreshButton} style={{rotate: "90deg"}}/></button>
                                <button id="btnDownload" className="download" onClick={()=>downloadImage()}><img className="containerButtons__img" src={downloadButton} style={{rotate: "90deg"}}/></button>
                                <button id="btnExpand" className="expand" onClick={()=>setExpand(false)}><img className="containerButtons__img" src={expandButton} style={{rotate: "90deg"}}/></button>
                            </div>
                        </div>
                    )}
                </section>

                {/* <!-- Configuracion --> */}
                <section className="config-section">
                    <h1>Configuración</h1>
                    {/* <!-- selector --> */}
                    <div className="input-group">
                        <label htmlFor="etiqueta">Seleccionar salida:</label>
                        <select id="etiqueta" value={selector} onChange={(e) => setSelector(e.target.value)}>   
                            <option value="">— Sin asignar —</option>
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
                    </div>

                    {/* <!-- frecuencia --> */}
                    <div className="input-group">
                        <label htmlFor="frecuencia">Guia horizontal (roja):</label>
                        <input type="number" id="frecuencia" placeholder="horizontal" value={frecuency} onChange={(e) => setFrecuency(e.target.value)}/>
                    </div>
                </section>
            </div>
        </div>
    );
}; 

export default Capturer;