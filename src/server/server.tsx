import { validatedInput, validatedOutput } from "../components/validated/Validated";
import { decodeHeatmap } from "../components/capturer/heatmapDecoder";
import type { DecodedHeatmap } from "../components/capturer/heatmapDecoder";

const server_url : string = import.meta.env.VITE_SERVER || "http://localhost:4000";  // 

//--------------------------------------------------------------
// Funciones para administrar la autenticación y autorización de usuarios
//--------------------------------------------------------------

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
// Funcion para solicitar la gráfica en tiempo real, se ejecuta cada 15 segundos
//--------------------------------------------------------------

export async function getSession(preload: { nodo: string; username: string; tipo: string }) {
    try {
        if (validatedInput(preload)) return false;
        const reqSession = await fetch(server_url + `/monitoring/session`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
            body: JSON.stringify({
                nodo: preload.nodo,
                username: preload.username,
                tipo: preload.tipo,
            })
        });
        const jSession = await reqSession.json();
        const session = jSession;
        if (!validatedOutput(reqSession, "Sesion obtenida")) return false;
        return session;
    } catch {
        console.log("Error al actualizar la gráfica");
    }
}

/* ============================================================
   Shapes que puede devolver pollLive, ya normalizados.
   EXPORTADOS: son el "contrato" único entre server.tsx, Capturer.tsx y Live.tsx.
   Antes estaban duplicados/redefinidos en cada archivo y eso fue lo que
   terminó rompiendo el modo RPHY (se perdía el heatmap por el camino).
   ============================================================ */
export interface LegacySample {
    kind: "legacy";
    freqs: number[];
    values: number[];
}

export interface RphySample {
    kind: "rphy";
    freqs: number[];   // mapeadas sobre el mismo rango de frecuencia que el heatmap
    values: number[];  // liveMaxTrace, para la línea blanca
    heatmap: DecodedHeatmap;
}

export type LiveSample = LegacySample | RphySample;

function parseLegacyPoll(json: any): LegacySample {
    const n = json.numberFrequencyPoints;
    const f0 = json.minimumFrequency_mhz;
    const step = json.frequencyStep_mhz;
    const freqs = new Array(n);
    const values = new Array(n);
    for (let i = 0; i < n; i++) {
        freqs[i] = f0 + i * step;
        values[i] = json.levels_db10[i] / 10;
    }
    return { kind: "legacy", freqs, values };
}

function parseRphyPoll(json: any): RphySample {
    const decoded = decodeHeatmap(json.heatMap);

    const n = json.liveMaxTrace.length;
    const step = (decoded.header.endFreq - decoded.header.startFreq) / (n - 1);
    const freqs = new Array(n);
    for (let i = 0; i < n; i++) freqs[i] = decoded.header.startFreq + i * step;

    return { kind: "rphy", freqs, values: json.liveMaxTrace, heatmap: decoded };
}

const fetchLive = async (seq : number) => {
    const reqPoll = await fetch(server_url + `/monitoring/live`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({
            username: localStorage.getItem("username"),
            sessionId: localStorage.getItem("sessionId"),
            sequencenumber: seq
        })
    });
    const json = await reqPoll.json();
    if(!reqPoll.ok) return false;
    return json;
}

export async function pollLive(seq: number, createSession: (nodo: string) => Promise<void>): Promise<LiveSample | false> {
    try {
        let json = await fetchLive(seq);

        if (!json) {
            console.log("Sesion invalida, recreando...");
            localStorage.removeItem("sessionId");
            const nodo = localStorage.getItem("nodo");
            await createSession(nodo || "undefined");   // ✅ esperamos que termine
            json = await fetchLive(seq);                // ✅ esperamos el resultado real

            if (!json) {
                // Ya reintentamos con sesión nueva y sigue fallando:
                // recién ACA es un fallo real (server caído, nodo inválido, etc)
                return false;
            }
        }

        if (json.status !== 0) {
            console.log("El equipo devolvió status:", json.status);
            return false;
        }

        const nodoType = (localStorage.getItem("nodoType") || "").toLowerCase();
        return nodoType === "rphy" ? parseRphyPoll(json) : parseLegacyPoll(json);

    } catch (err) {
        console.log("Error al consultar el poll", err);
        localStorage.removeItem("sessionId");
        return false;
    }
}

//--------------------------------------------------------------
// Funcion para emitir un mensaje de finalizacion de la grafica en tiempo real
//--------------------------------------------------------------

export async function cancelPoll(seq: number) {
    try {
        const reqPoll = await fetch(server_url + `/monitoring/liveEnd`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
            body: JSON.stringify({
                username: localStorage.getItem("username"),
                sessionId: localStorage.getItem("sessionId"),
                sequencenumber: seq
            })
        });

        if (reqPoll.ok) {
            validatedOutput(reqPoll, "Sesion finalizada");
        } else {
            console.log("cancelPoll: respuesta no ok", reqPoll.status);
        }
    } catch (err) {
        console.log("Error al consultar el cancelPoll", err);
        return false;
    }
}
//--------------------------------------------------------------
// Funcion para actualizar la monitoria del nodo
//--------------------------------------------------------------

export async function refreshMonitoring (preload: { nodo: string}) {
    try {
        if(validatedInput(preload)) return false;
        const reqData = await fetch(server_url + "/monitoring/stats", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
            body: JSON.stringify(preload)
        });
        const data = await reqData.json();
        console.log(data);
        if(!validatedOutput(reqData, "Refresco completado")) return false;
        return data;
    } catch {
      console.log("Error al actualizar la monitoria del nodo");
    }
  };

//--------------------------------------------------------------
// Funcion para actualizar la monitoria del nodo
//--------------------------------------------------------------

export async function refreshSuscribers (preload: { nodo: string }) {
    try {
        if(validatedInput(preload)) return false;
        const reqData = await fetch(server_url + "/monitoring/suscribers", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
            body: JSON.stringify(preload)
        });
        const data = await reqData.json();
        console.log(data);
        if(!validatedOutput(reqData, "Refresco completado")) return false;
        return data;
    } catch {
      console.log("Error al actualizar la monitoria del nodo");
    }
  };


//--------------------------------------------------------------
// Funciones para administrar usuarios, solo accesibles para el admin
//--------------------------------------------------------------

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