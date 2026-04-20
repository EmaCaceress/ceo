import { validatedInput, validatedOutput } from "../components/validated/Validated";

const server_url : string = import.meta.env.SERVER || 'http://localhost:4000';

export async function getToken(username: string, password: string) {
    const obj = { username, password };
    if(validatedInput(obj)) return false;
    const login = await fetch(server_url + "/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username , password: password })
    });
    const data = await login.json();
    const token = data.token;
    if(!validatedOutput(token)) return false;
    return token;
}

export async function refresh (preload: { code: string, nodo: string, nodoType: string, frecuency: string, username: string }) {
    try {
        if(validatedInput(preload)) return false;
        const reqImage = await fetch(server_url + "/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(preload)
        });
        
        const imgReq = await reqImage.json();
        return imgReq.url;
    } catch {
      console.log("Error al actualizar la gráfica");
    }
  };