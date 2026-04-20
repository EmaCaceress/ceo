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

export const validatedOutput = (obj : unknown) => {
    if (!obj) {
        toast.error("Datos inválidos");
        return false;
    }
    toast.success("logueado correctamente");
    return true;
}
