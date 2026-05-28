import { validatedInput, validatedOutput } from "../components/validated/Validated";

const server_url : string = import.meta.env.VITE_SERVER || "http://localhost:4000";  // import.meta.env.VITE_SERVER || 

//--------------------------------------------------------------
// Funciones para administrar la autenticación y autorización de usuarios
//--------------------------------------------------------------

// Funcion para generar el token de autenticación, si el username o password no son válidos se devuelve false, de lo contrario se devuelve el token generado
export async function generatedToken(username: string, password: string) {
    try {
        const obj = { username, password };
        if(validatedInput(obj)) return false;
        const login = await fetch(server_url + "/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: username , password: password })
        });
        const data = await login.json();
        const token = data.token;
        if(!validatedOutput(login, "Logueado correctamente") && token) return false;
        return token;
    } catch {
        console.log("Error al intentar loguear");
    }
}


// Funcion para validar el role del usuario cada vez que se recarga la página, si el token no es válido se eliminan los datos del localStorage y se devuelve false, de lo contrario se devuelve el role del usuario
export async function getRole(token: string | null) {
    try {
        const reqToken = await fetch(server_url + "/auth/verify", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await reqToken.json();

        if(reqToken.status === 401 && !data.token) {
            localStorage.removeItem("token");
            localStorage.removeItem("username");
            return false;
        }
        else{
            return data.role;
        }
    } catch {
        console.log("Error al validar el token");
    }
}

// Función para validar el token cada vez que se recarga la página, si el token no es válido se eliminan los datos del localStorage y se devuelve false, de lo contrario se devuelve el token verificado
export async function getToken(token: string) {
    try {
        const reqToken = await fetch(server_url + "/auth/verify", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await reqToken.json();
        const tokenVerified = data.token;
        if(reqToken.status === 401 && !tokenVerified) {
            localStorage.removeItem("token");
            localStorage.removeItem("username");
            return false;
        }
        else{
            return tokenVerified;
        }
    } catch {
        console.log("Error al validar el token");
    }
}

//--------------------------------------------------------------
// Funcion para actualizar la gráfica
//--------------------------------------------------------------

export async function refresh (preload: { nodo: string, frecuency: string}) {
    try {
        if(validatedInput(preload)) return false;
        const reqImage = await fetch(server_url + "/monitoring/spectrum", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
            body: JSON.stringify(preload)
        });
        const imgReq = await reqImage.json();
        const imgUrl = imgReq.url;
        if(!validatedOutput(reqImage, "Refresco completado")) return false;
        return imgUrl;
    } catch {
      console.log("Error al actualizar la gráfica");
    }
  };

//--------------------------------------------------------------
// Funciones para administrar usuarios, solo accesibles para el admin
//--------------------------------------------------------------

// Funcion para obtener la lista de usuarios, si el token no es válido se devuelve false, de lo contrario se devuelve la lista de usuarios
export async function users () {
    try {
        const reqUsers = await fetch(server_url + "/admin/users", {
            method: "GET",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });
        const userReq = await reqUsers.json();
        const users = userReq.users;
        if(!validatedOutput(users, "Usuarios obtenidos")) return false;
        return users;
    } catch {
        console.log("Error al obtener los usuarios");
    }
};

export async function enabledUsersReq(key: string, enabledUsers: number[]) {
    try {
        const preload = { key, enabledUsers };
        if(validatedInput(preload)) return false;
        const reqPushKey = await fetch(server_url + "/admin/enabledUsers", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
            body: JSON.stringify({ key, enabledUsers })
        });
        
        if(!validatedOutput(reqPushKey, "Datos guardados correctamente")) return false;
        return true;
    } catch {
        console.log("Error al cargar los usuarios");
    }
};