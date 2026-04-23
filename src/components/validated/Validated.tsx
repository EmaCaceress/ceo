import toast from "react-hot-toast";

const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);

export const validatedInput = (obj : unknown) => {

    if (!isRecord(obj)) { //corroboramos que el objeto es un record, es decir, un objeto con claves y valores
        toast.error("Datos inválidos");
        return false;
    }

    let stringObject = "";
    Object.entries(obj).forEach(([key, value]) => {
        if (!value) {
            stringObject += key + " ";
        }
    });

    if (stringObject !== "") {
        toast.error(`Debes completar el campo: ${stringObject}`);
        return true;
    } else {
        return false;
    }
};

interface Status {
    ok: boolean;
    statusText: string;
    status: number;
}

export const validatedOutput = (server : Status, obj: unknown, msj: string) => {

    if (server.status === 404) {
        toast.error("Nodo no encontrado, verifica el nodo ingresado");
        return false;   
    } else if (server.status === 500) {
        toast.error("Error en el servidor, intenta nuevamente más tarde");
        return false;
    } else {
        toast.success(msj);
        return true;
    }
}
