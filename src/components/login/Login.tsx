import React, { useState, useEffect } from "react";
import "./Login.scss";
import { getToken } from "../../server/server";
import { useNavigate } from "react-router-dom";

export const Login: React.FC = () => {
  const [username, setUsername] = useState<string>("");
  const [password, setpassword] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/graph");
    }
  }, []);

  const singUp = async () => {
    try {
      const token = await getToken(username, password);
      if(!token) return;
      localStorage.setItem("token", token);
      localStorage.setItem("username", username);
      navigate("/graph", { replace: true }); // 👈 navega acá
    }
    catch (error) {
      console.error("Error al loguearse: ", error);
    }
  }
  return (
    <div className="login-container">
        <form className="form">
            <h1 className="title">Login</h1>
            <div className="input-group">
                <label>Usuario</label>
                <input type="text" name="username" placeholder="Benavidez" value={username} onChange={(e) => setUsername(e.target.value)}/>
            </div> 
            <div className="input-group">
                <label>Contraseña</label>
                <input type="password" name="password" placeholder="********" value={password} onChange={(e) => setpassword(e.target.value)}/>
            </div>
            <input className="input-button" type="button" value="Iniciar Sesión" onClick={()=> singUp()}/>
        </form>
    </div>
  );
}