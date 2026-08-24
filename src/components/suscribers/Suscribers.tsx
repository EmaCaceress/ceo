import React, { useEffect, useMemo, useRef, useState } from "react";
import "./Suscribers.scss";
import toast from "react-hot-toast";
import html2canvas from "html2canvas";
import { refreshSuscribers } from "../../server/server";
import { ResetIcon } from "../capturer/Live";

// =====================================================================
// TIPOS
// =====================================================================

type EstadoAbonado = "UP" | "DOWN";

interface Abonado {
  idCliente: string;
  estado: EstadoAbonado;
  nodoCmts: string;
  nodo: string;
  modelo: string;
  tipoCliente: string;
  fechaCaida: string | null;
  cliente: string;
  calle: string;
  nro: string;
  piso: string;
  depto: string;
  direccionCompleta: string;
  idEdificio: string;
  pwrDs: number | null;
  pwrUs: number | null;
  pwrUsRxCmts: number | null;
  snrDs: number | null;
  snrUs: number | null;
  dsFecPre: number | null;
  dsFecPost: number | null;
  usFecPre: number | null;
  usFecPost: number | null;
  mtr: number | null;
  firma: string | null;
  cmPnmSeveridad: string | null;
}

interface AbonadoFilters {
  altura: string;
  idCliente: string;
  calle: string;
  all: boolean;
  up: boolean;
  down: boolean;
}

const EMPTY_FILTERS: AbonadoFilters = {
  altura: "",
  idCliente: "",
  calle: "",
  all: true,
  up: false,
  down: false,
};

// =====================================================================
// COLUMNAS — fuente única para el modal de detalle y la tabla de
// exportación a JPG, así no hay que mantener dos listas de campos.
// =====================================================================

const ESTADO_LABEL: Record<EstadoAbonado, string> = {
  UP: "Arriba",
  DOWN: "Caído",
};

const formatValue = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
};

const formatScientific = (value: unknown) => {
  if (value == null || value === "" || value == 0) return "-";

  const num = Number(value);
  if (Number.isNaN(num)) return String(value);

  return num
    .toExponential(1)
    .replace(/\.0(?=e)/, "");
};

const formatPercentage = (value: unknown) => {
  if (value == null || value === "" || value == 0) return "-";

  const num = Number(value);
  if (Number.isNaN(num)) return String(value);

  return `${(num * 100).toFixed(1).replace(/\.0$/, "")}%`;
};

interface AbonadoColumn {
  key: string;
  label: string;
  group?: "CM Power" | "CM SNR";
  accessor: (abonado: Abonado) => string;
}

const ABONADO_COLUMNS: AbonadoColumn[] = [
  { key: "estado", label: "Estado", accessor: (a) => ESTADO_LABEL[a.estado] },
  { key: "nodoCmts", label: "Nodo Cmts", accessor: (a) => formatValue(a.nodoCmts) },
  { key: "nodo", label: "Nodo", accessor: (a) => formatValue(a.nodo) },
  { key: "modelo", label: "Modelo", accessor: (a) => formatValue(a.modelo) },
  { key: "tipoCliente", label: "Tipo cliente", accessor: (a) => formatValue(a.tipoCliente) },
  { key: "fechaCaida", label: "Fecha Caída", accessor: (a) => formatValue(a.fechaCaida) },
  { key: "cliente", label: "Cliente", accessor: (a) => formatValue(a.cliente) },
  { key: "calle", label: "Calle", accessor: (a) => formatValue(a.calle) },
  { key: "nro", label: "Nro", accessor: (a) => formatValue(a.nro) },
  { key: "piso", label: "Piso", accessor: (a) => formatValue(a.piso) },
  { key: "depto", label: "Depto", accessor: (a) => formatValue(a.depto) },
  { key: "direccionCompleta", label: "Dirección Ext. Completa", accessor: (a) => formatValue(a.direccionCompleta) },
  { key: "pwrDs", label: "Pwr Ds", group: "CM Power", accessor: (a) => formatValue(a.pwrDs) },
  { key: "pwrUs", label: "Pwr Us", group: "CM Power", accessor: (a) => formatValue(a.pwrUs) },
  { key: "pwrUsRxCmts", label: "Pwr Us RxCmts", group: "CM Power", accessor: (a) => formatValue(a.pwrUsRxCmts) },
  { key: "snrDs", label: "SNR Ds", group: "CM SNR", accessor: (a) => formatValue(a.snrDs) },
  { key: "snrUs", label: "SNR Us", group: "CM SNR", accessor: (a) => formatValue(a.snrUs) },
  { key: "dsFecPre", label: "Ds FecPre", accessor: (a) => formatScientific(formatValue(a.dsFecPre)) },
  { key: "dsFecPost", label: "Ds FecPost", accessor: (a) => formatScientific(formatValue(a.dsFecPost)) },
  { key: "usFecPre", label: "Us FecPre", accessor: (a) => formatPercentage(formatValue(a.usFecPre)) },
  { key: "usFecPost", label: "Us FecPost", accessor: (a) => formatPercentage(formatValue(a.usFecPost)) },
  { key: "mtr", label: "MTR", accessor: (a) => formatValue(a.mtr) },
  { key: "cmPnmSeveridad", label: "cmPnm.severidad", accessor: (a) => formatValue(a.cmPnmSeveridad) },
  { key: "idEdificio", label: "ID Edificio", accessor: (a) => formatValue(a.idEdificio) },
];

const ordenarAbonados = (abonados: Abonado[]): Abonado[] => {
    return [...abonados].sort((a, b) => {
      const porCalle = a.calle.localeCompare(b.calle, "es", { sensitivity: "base", numeric: true });
      if (porCalle !== 0) return porCalle;
  
      const nroA = Number(a.nro);
      const nroB = Number(b.nro);
      const esValidoA = a.nro !== "" && !Number.isNaN(nroA);
      const esValidoB = b.nro !== "" && !Number.isNaN(nroB);
  
      if (esValidoA && esValidoB) return nroA - nroB;
      if (esValidoA) return -1;
      if (esValidoB) return 1;
      return 0;
    });
  };

const Suscribers: React.FC = () => {
  // Nodo que se escribe en el primer input (el que dispara el fetch).
  const [nodoInput, setNodoInput] = useState("");
  const upNodo = (e: string) => {
    setNodoInput(e);
    localStorage.setItem("nodo", e);
}

  // Nodo que efectivamente se consultó por última vez (para filename,
  // validaciones, etc). Se separa de `nodoInput` para que si el usuario
  // sigue tipeando ahí no se rompa lo que ya se buscó.
  const [nodoConsultado, setNodoConsultado] = useState("");

  // Filtros secundarios (altura / calle / idCliente), solo tienen sentido
  // una vez que ya hay abonados cargados para un nodo.
  const [filters, setFilters] = useState<AbonadoFilters>(EMPTY_FILTERS);

  // Todos los abonados que devolvió el fetch para `nodoConsultado`.
  // null = todavía no se buscó ningún nodo.
  const [abonadosNodo, setAbonadosNodo] = useState<Abonado[] | null>(null);

  // Subconjunto de `abonadosNodo` luego de aplicar los filtros secundarios.
  const resultados = useMemo((): Abonado[] | null => {
    if (!abonadosNodo) return null;
  
    return abonadosNodo.filter((abonado) => {
      const matchesAltura =
        !filters.altura ||
        abonado.nro.includes(filters.altura.trim());
  
      const matchesIdCliente =
        !filters.idCliente ||
        abonado.idCliente.includes(filters.idCliente.trim());
  
      const matchesCalle =
        !filters.calle ||
        abonado.calle.toLowerCase().includes(filters.calle.trim().toLowerCase());
  
        const matchesStatus =
        filters.all ||
        (filters.up && String(abonado.estado).trim().toUpperCase() === "UP") ||
        (filters.down && String(abonado.estado).trim().toUpperCase() === "DOWN");
  
      return (
        matchesAltura &&
        matchesIdCliente &&
        matchesCalle &&
        matchesStatus
      );
    });
  }, [abonadosNodo, filters]);

  const [isFetchingNodo, setIsFetchingNodo] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [abonadoSeleccionado, setAbonadoSeleccionado] = useState<Abonado | null>(null);

  // Tabla completa (todos los campos, todos los abonados del nodo) que
  // se renderiza fuera de pantalla solo para poder rasterizarla a JPG.
  const exportTableRef = useRef<HTMLDivElement>(null);
  const [abonadosParaExportar, setAbonadosParaExportar] = useState<Abonado[]>([]);

  // -------------------------------------------------------------------
  // 1) Buscar el nodo -> trae TODOS los abonados de ese nodo.
  //    Importante: recibe el evento y llama preventDefault, si no el
  //    <form> hace su submit nativo y recarga la página entera.
  // -------------------------------------------------------------------

  useEffect(() => {
    setNodoInput(localStorage.getItem("nodo") || "");
  }, []);


  const getSuscribers = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    const nodo = nodoInput.trim();

    if (!nodo) {
      toast.error("Ingresá un nodo para poder buscar");
      return;
    }

    try {
      setIsFetchingNodo(true);

      const data = ordenarAbonados(await refreshSuscribers({ nodo }));

      setAbonadosNodo(data);
      setNodoConsultado(nodo);

      // Al traer un nodo nuevo se resetean los filtros secundarios; los
      // resultados se recalculan solos (ver `resultados` más abajo, con
      // useMemo) y de entrada muestran todos los abonados del nodo.
      setFilters(EMPTY_FILTERS);

      if (!data.length) {
        toast("No se encontraron abonados para ese nodo", { icon: "ℹ️" });
      }
    } catch {
      toast.error("Error obteniendo abonados");
      setAbonadosNodo(null);
    } finally {
      setIsFetchingNodo(false);
    }
  };


  const handleFilterChange =
    (field: keyof AbonadoFilters) =>
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      setFilters((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleStatusFilter = (status: "all" | "up" | "down") => {
    setFilters((prev) => ({
      ...prev,
      all: status === "all",
      up: status === "up",
      down: status === "down",
    }));
  };
// -------------------------------------------------------------------
  // 2) Filtrar, sobre los abonados ya traídos, por altura/calle/idCliente.
  //    No hace falta volver a filtrar por nodo: `abonadosNodo` ya es
  //    exclusivamente del nodo consultado.
  // -------------------------------------------------------------------

  const handleDownload = async (): Promise<void> => {
    if (!abonadosNodo || !abonadosNodo.length) {
      toast.error("No hay abonados para exportar en ese nodo");
      return;
    }

    try {
      setIsDownloading(true);

      // Se carga en el estado para que React renderice la tabla oculta
      // con estos datos antes de rasterizarla.
      setAbonadosParaExportar(abonadosNodo);

      // Esperamos el próximo frame para asegurarnos de que la tabla
      // oculta ya se pintó con los datos nuevos antes de capturarla.
      await new Promise((resolve) => requestAnimationFrame(resolve));

      if (!exportTableRef.current) return;

      const canvas = await html2canvas(exportTableRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
      });

      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `abonados_${nodoConsultado.toUpperCase()}.jpg`;
      link.click();
    } catch {
      toast.error("Error generando la planilla");
    } finally {
      setIsDownloading(false);
    }
  };

  const groupedHeader = useMemo(() => {
    // Arma la fila superior de grupos (CM Power / CM SNR) contando
    // cuántas columnas consecutivas comparten el mismo `group`.
    const groups: { label: string | null; span: number }[] = [];

    for (const column of ABONADO_COLUMNS) {
      const last = groups[groups.length - 1];

      if (last && last.label === (column.group ?? null)) {
        last.span += 1;
      } else {
        groups.push({ label: column.group ?? null, span: 1 });
      }
    }

    return groups;
  }, []);

  // Ya se hizo al menos una búsqueda de nodo (haya devuelto datos o no).
  const hayNodoConsultado = abonadosNodo !== null;

  return (
    <main className="suscribers">
      <section className="suscribers__container">
        <header className="suscribers__header">
          <div className="suscribers__heading">
            <h1 className="suscribers__title">Abonados</h1>

            <p className="suscribers__description">
              Consulta y descarga la lista de abonados de un nodo.
            </p>
          </div>

          <form className="suscribers__field" onSubmit={getSuscribers}>
            <input
              className="suscribers__field-input"
              type="text"
              value={nodoInput}
              onChange={(event) => upNodo(event.target.value.toUpperCase())}
              placeholder="Ej: RE18L"
              autoComplete="off"
            />
            <button className="monitoring__search-button" type="submit" disabled={isFetchingNodo}>
                <ResetIcon className="suscribers__img"/>
            </button>
          </form>
        </header>

        {isFetchingNodo && (
          <div className="suscribers__loading">
            <span className="suscribers__loader" />
            <p className="suscribers__loading-text">Buscando abonados del nodo...</p>
          </div>
        )}

        {/* El form de filtros, el botón de descarga y el listado solo
            tienen sentido una vez que ya se consultó un nodo. */}
        {!isFetchingNodo && hayNodoConsultado && (
          <>
            <div className="suscribers__search">
              <button
                type="button"
                className="suscribers__download-button"
                onClick={handleDownload}
                disabled={isDownloading}
              >
                {isDownloading ? "Generando..." : "Descargar planilla (JPG)"}
              </button>

              <label className="suscribers__field--filter">
                <span className="suscribers__field-label">Altura</span>
                <input
                  className="suscribers__field-input"
                  type="text"
                  value={filters.altura}
                  onChange={handleFilterChange("altura")}
                  placeholder="Ej: 1234"
                  autoComplete="off"
                />
              </label>

              <label className="suscribers__field--filter">
                <span className="suscribers__field-label">ID cliente</span>
                <input
                  className="suscribers__field-input"
                  type="text"
                  value={filters.idCliente}
                  onChange={handleFilterChange("idCliente")}
                  placeholder="Ej: 100234"
                  autoComplete="off"
                />
              </label>

              <label className="suscribers__field--filter">
                <span className="suscribers__field-label">Calle</span>
                <input
                  className="suscribers__field-input"
                  type="text"
                  value={filters.calle}
                  onChange={handleFilterChange("calle")}
                  placeholder="Ej: San Martín"
                  autoComplete="off"
                />
              </label>

              <div className="suscribers__status">
                <div className={`suscribers__statusButton suscribers__statusButton--all ${filters.all ? "suscribers__statusButton--activeAll" : ""}`} onClick={()=> handleStatusFilter("all")}>Todos</div>
                <div className={`suscribers__statusButton suscribers__statusButton--up ${filters.up ? "suscribers__statusButton--activeUp" : ""}`} onClick={()=> handleStatusFilter("up")}>Arriba</div>
                <div className={`suscribers__statusButton suscribers__statusButton--down ${filters.down ? "suscribers__statusButton--activeDown" : ""}`} onClick={()=> handleStatusFilter("down")}>Caído</div>
              </div>
            </div>

            <label className="suscribers__description"> Se encontraron {resultados?.length} abonados</label>

            {resultados && resultados.length > 0 && (
              <ul className="suscribers__results">
                {resultados.map((abonado, index) => (
                    <li key={`${abonado.idCliente || "sin-id"}-${index}`}>
                    <button
                      type="button"
                      className="suscribers__result-card"
                      onClick={() => setAbonadoSeleccionado(abonado)}
                    >
                      <span
                        className={`suscribers__result-status suscribers__result-status--${abonado.estado.toLowerCase()}`}
                      />

                      <span className="suscribers__result-info">
                        <strong className="suscribers__result-cliente">
                          {abonado.calle} {abonado.nro}
                        </strong>
                        <span className="suscribers__result-direccion">{abonado.direccionCompleta}</span>
                      </span>

                      <span className="suscribers__result-estado">{ESTADO_LABEL[abonado.estado]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {resultados && resultados.length === 0 && (
              <div className="suscribers__empty">
                <span className="suscribers__empty-icon">⌁</span>
                <h2 className="suscribers__empty-title">Sin resultados</h2>
                <p className="suscribers__empty-text">
                  No encontramos abonados con esos filtros. Probá ajustarlos.
                </p>
              </div>
            )}
          </>
        )}

        {!isFetchingNodo && !hayNodoConsultado && (
          <div className="suscribers__empty">
            <span className="suscribers__empty-icon">
              <ResetIcon className="suscribers__img"/>
            </span>
            <h2 className="suscribers__empty-title">Buscá un abonado</h2>
            <p className="suscribers__empty-text">Ingresá un nodo para empezar a buscar.</p>
          </div>
        )}
      </section>

      {abonadoSeleccionado && (
        <AbonadoModal abonado={abonadoSeleccionado} onClose={() => setAbonadoSeleccionado(null)} />
      )}

      {/* Tabla oculta usada solo como fuente para el html2canvas de la
          descarga. Se posiciona fuera de la pantalla en vez de con
          display:none porque html2canvas no puede rasterizar
          elementos que no están en el flujo de layout. */}
      <div className="suscribers__export-anchor" aria-hidden="true">
        <div ref={exportTableRef} className="suscribers__export-table">
          <table>
            <thead>
              <tr>
                {groupedHeader.map((group, index) => (
                  <th key={index} colSpan={group.span}>
                    {group.label ?? ""}
                  </th>
                ))}
              </tr>

              <tr>
                {ABONADO_COLUMNS.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {abonadosParaExportar.map((abonado) => (
                <tr key={abonado.idCliente}>
                  {ABONADO_COLUMNS.map((column) => (
                    <td style={{
                      backgroundColor:
                      column.accessor(abonado) === "VERDE"
                          ? "green"
                          : column.accessor(abonado) === "AMARILLO"
                          ? "yellow"
                          : column.accessor(abonado) === "ROJO"
                          ? "red"
                          : undefined,
                    }}key={column.key}>{column.accessor(abonado)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

// =====================================================================
// MODAL DE DETALLE
// =====================================================================

interface AbonadoModalProps {
  abonado: Abonado;
  onClose: () => void;
}

const AbonadoModal: React.FC<AbonadoModalProps> = ({ abonado, onClose }) => {
  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="suscribers__modal-overlay" onClick={handleOverlayClick}>
      <div className="suscribers__modal" role="dialog" aria-modal="true">
        <header className="suscribers__modal-header">
          <div>
            <h2 className="suscribers__modal-title">{abonado.cliente}</h2>
            <p className="suscribers__modal-subtitle">{abonado.direccionCompleta}</p>
          </div>

          <button type="button" className="suscribers__modal-close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>

        <span className={`suscribers__modal-badge suscribers__modal-badge--${abonado.estado.toLowerCase()}`}>
          {ESTADO_LABEL[abonado.estado]}
        </span>

        <div className="suscribers__modal-grid">
          {ABONADO_COLUMNS.filter(
            (column) => !["estado", "calle", "direccionCompleta"].includes(column.key)
          ).map((column) => (
            <div key={column.key} className="suscribers__modal-item">
              <span className="suscribers__modal-item-label">{column.label}</span>
              <strong className="suscribers__modal-item-value">{column.accessor(abonado)}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Suscribers;