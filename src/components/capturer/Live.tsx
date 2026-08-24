import React, { useCallback, useEffect, useRef, useState } from "react";
import "./Live.scss";
import { type LiveSample, type LegacySample } from "../../server/server";// , cancelPoll

/* ============================================================
   TIPOS
   Antes había dos declaraciones distintas de "SpectrumSample" en este
   mismo archivo (una con "kind" y otra sin él), más otro juego de tipos
   en Capturer.tsx. Ahora se importa un único contrato desde server.tsx.
   ============================================================ */

type NodoType = "legacy" | "rphy";
 
interface LiveProps {
  identify: string | number;
  durationMs?: number;
  intervalMs?: number;
  thresholdDb?: number;
  /** Segunda línea de umbral (opcional). Se dibuja solo en modo rphy. */
  lowerThresholdDb?: number;
  onFetchSample?: (identify: string | number, seq: number) => Promise<LiveSample>;
}

/* ============================================================
   DATOS DE PRUEBA
   ============================================================ */
const generateMockSample = (seq: number): LegacySample => {
  const points = 400;
  const freqStart = 5;
  const freqStep = 2.4;
  const freqs = new Array(points);
  const values = new Array(points);
  for (let i = 0; i < points; i++) {
    freqs[i] = freqStart + i * freqStep;
    const wobble = Math.sin(i / 12 + seq / 4) * 8 + Math.random() * 6;
    values[i] = -40 + wobble;
  }
  return { kind: "legacy", freqs, values };
};

/** Normaliza lo que venga en localStorage("nodoType") a "legacy" | "rphy".
 *  Cualquier valor que contenga "rphy" (sin importar mayúsculas/espacios) -> "rphy".
 *  Todo lo demás (incluido null/vacío) -> "legacy". Ajustar si el server usa otro string. */
const normalizeNodoType = (raw: string | null): NodoType => {
  const v = (raw || "").trim().toLowerCase();
  return v.includes("rphy") ? "rphy" : "legacy";
};

/* ============================================================
   ICONOS
   ============================================================ */
 const PlayIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);
const StopIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

export const ResetIcon: React.FC<{ className: string }> = ({ className = ""}) => (
  <svg className={className} viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M12 5V2L7 7l5 5V8c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
  </svg>
);

export const MaximizeIcon: React.FC<{ className: string }> = ({ className = ""}) => (
  <svg className={className} viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M4 4h6V2H2v8h2V4zm14 0v6h2V2h-8v2h6zM4 14H2v8h8v-2H4v-6zm14 6h-6v2h8v-8h-2v6z" />
  </svg>
);

export const MinimizeIcon: React.FC<{ className: string }> = ({ className = ""}) => (
  <svg className={className} viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M6 10H2V8h6V2h2v8H6zm10 0h4V8h-6V2h-2v8h4zM6 14H2v2h6v6h2v-8H6zm10 0h4v2h-6v6h-2v-8h4z" />
  </svg>
);

/* ============================================================
   CLASES BEM
   ============================================================ */
const cls = {
  root: "spectrumLive",

  canvasWrap: "spectrumLive__canvasWrap",
  canvasWrapMaximized: "spectrumLive__canvasWrap--maximized",
  canvas: "spectrumLive__canvas",
  canvasMaximixed: "spectrumLive__canvas--maximized",
  placeholder: "spectrumLive__placeholder",
  placeholderMaximized: "spectrumLive__placeholder--maximized",

  legend: "spectrumLive__legend",
  swatch: "spectrumLive__swatch",
  swatchMax: "spectrumLive__swatch--max",
  swatchLive: "spectrumLive__swatch--live",
  swatchMin: "spectrumLive__swatch--min",
  swatchThreshold: "spectrumLive__swatch--threshold",

  controls: "spectrumLive__controls",
  controlsMaximized: "spectrumLive__controls--maximized",
  btn: "spectrumLive__btn",
  btnPlay: "spectrumLive__btn--play",
  btnReset: "spectrumLive__btn--reset",
  btnMaximize: "spectrumLive__btn--maximize",
  btnRunning: "spectrumLive__btn--running",
  btnIcon: "spectrumLive__btnIcon",
  progressFill: "spectrumLive__progressFill",
};

/* ============================================================
   CONFIGURACIÓN FIJA DEL DIBUJO
   ============================================================ */
const CHART_PADDING = { left: 50, right: 15, top: 15, bottom: 30 };
const Y_MIN = -60;
const Y_MAX = 20;

/* Config del heatmap (modo rphy) */
const HEAT_Y_BINS = 160; // resolución vertical de la grilla (0.5dB por bin)
const HEAT_MAX_WEIGHT = 10; // a partir de este peso, se satura en rojo (igual que la referencia)

/* ============================================================
   HELPERS DE DIBUJO
   ============================================================ */
const makeScales = (canvasWidth: number, canvasHeight: number, freqMin: number, freqMax: number) => {
  const plotWidth = canvasWidth - CHART_PADDING.left - CHART_PADDING.right;
  const plotHeight = canvasHeight - CHART_PADDING.top - CHART_PADDING.bottom;
  const xForFreq = (freq: number) =>
    CHART_PADDING.left + ((freq - freqMin) / (freqMax - freqMin)) * plotWidth;
  const yForValue = (value: number) => {
    const clamped = Math.max(Y_MIN, Math.min(Y_MAX, value));
    return CHART_PADDING.top + ((Y_MAX - clamped) / (Y_MAX - Y_MIN)) * plotHeight;
  };
  return { xForFreq, yForValue, plotWidth, plotHeight };
};

const drawAxes = (
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  freqMin: number,
  freqMax: number,
  scales: ReturnType<typeof makeScales>
) => {
  const { xForFreq, yForValue } = scales;

  ctx.strokeStyle = "#3a3a3a";
  ctx.fillStyle = "#999";
  ctx.font = "11px Arial";
  ctx.lineWidth = 1;

  for (let v = Y_MIN; v <= Y_MAX; v += 10) {
    const y = yForValue(v);
    ctx.beginPath();
    ctx.moveTo(CHART_PADDING.left, y);
    ctx.lineTo(canvasWidth - CHART_PADDING.right, y);
    ctx.stroke();
    ctx.fillText(String(v), 5, y + 4);
  }

  const gridStep = Math.ceil((freqMax - freqMin) / 10 / 5) * 5 || 5;
  for (let f = Math.ceil(freqMin / gridStep) * gridStep; f <= freqMax; f += gridStep) {
    const x = xForFreq(f);
    ctx.beginPath();
    ctx.moveTo(x, CHART_PADDING.top);
    ctx.lineTo(x, canvasHeight - CHART_PADDING.bottom);
    ctx.stroke();
    ctx.fillText(f.toFixed(0), x - 10, canvasHeight - CHART_PADDING.bottom + 15);
  }
};

const plotSeries = (
  ctx: CanvasRenderingContext2D,
  scales: ReturnType<typeof makeScales>,
  freqs: number[],
  series: number[],
  color: string
) => {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  series.forEach((value, i) => {
    const x = scales.xForFreq(freqs[i]);
    const y = scales.yForValue(value);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
};

const drawThresholdLine = (
  ctx: CanvasRenderingContext2D,
  scales: ReturnType<typeof makeScales>,
  canvasWidth: number,
  value: number,
  color: string
) => {
  const y = scales.yForValue(value);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(CHART_PADDING.left, y);
  ctx.lineTo(canvasWidth - CHART_PADDING.right, y);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fillText(value.toFixed(2), CHART_PADDING.left + 3, y - 4);
};

/** Índice de bin vertical (0 = arriba/Y_MAX, HEAT_Y_BINS-1 = abajo/Y_MIN) */
const yBinIndexForValue = (value: number) => {
  const clamped = Math.max(Y_MIN, Math.min(Y_MAX, value));
  const normalized = (Y_MAX - clamped) / (Y_MAX - Y_MIN);
  const idx = Math.floor(normalized * HEAT_Y_BINS);
  return Math.min(HEAT_Y_BINS - 1, Math.max(0, idx));
};

/** Peso acumulado (cantidad de veces que cayó un punto en ese bin) -> color RGBA */
const weightToColor = (weight: number): [number, number, number, number] => {
  if (weight <= 0) return [0, 0, 0, 0]; // transparente: deja ver la grilla de fondo
  const t = Math.min(weight, HEAT_MAX_WEIGHT) / HEAT_MAX_WEIGHT;
  const stops: Array<[number, number, number, number]> = [
    [0, 90, 90, 90],
    [0.15, 40, 120, 200],
    [0.35, 20, 180, 190],
    [0.55, 40, 190, 70],
    [0.75, 210, 220, 40],
    [1, 235, 40, 40],
  ];
  for (let i = 1; i < stops.length; i++) {
    const [t0, r0, g0, b0] = stops[i - 1];
    const [t1, r1, g1, b1] = stops[i];
    if (t <= t1) {
      const f = (t - t0) / (t1 - t0 || 1);
      return [
        Math.round(r0 + (r1 - r0) * f),
        Math.round(g0 + (g1 - g0) * f),
        Math.round(b0 + (b1 - b0) * f),
        255,
      ];
    }
  }
  const last = stops[stops.length - 1];
  return [last[1], last[2], last[3], 255];
};

const Live: React.FC<LiveProps> = ({
  identify,
  durationMs = 60_000,
  intervalMs = 200,
  thresholdDb = -30,
  lowerThresholdDb,
  onFetchSample,
}) => {
  /* ----------------------------------------------------------
     ESTADOS
  ---------------------------------------------------------- */
  const [isRunning, setIsRunning] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [liveData, setLiveData] = useState<LiveSample | null>(null);
  const [maxHold, setMaxHold] = useState<number[] | null>(null);
  const [minHold, setMinHold] = useState<number[] | null>(null);
  const [nodoType, setNodoType] = useState<NodoType>("legacy");
  const [heatVersion, setHeatVersion] = useState(0); // se bumpea para forzar redraw del heatmap

  /* ----------------------------------------------------------
     REFERENCIAS
  ---------------------------------------------------------- */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heatCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const heatGridRef = useRef<Uint16Array | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);
  const nodoAtStartRef = useRef<string | null>(null);
  const isRunningRef = useRef(false);
  /** Espejo síncrono de nodoType, para que el loop de fetchSample (que se
   *  reprograma a sí mismo) siempre lea el valor actual y no uno viejo por closure. */
  const nodoTypeRef = useRef<NodoType>("legacy");

  /* ----------------------------------------------------------
     BOTÓN DE STOP (y corte automático por cambio de nodo / fin de duración)
  ---------------------------------------------------------- */
  const stopCapture = useCallback(() => {
    if (!isRunningRef.current) return; // ✅ ya se detuvo, ignorar llamadas repetidas
    errorRef.current = 0;
    isRunningRef.current = false;      // se pone en false de forma SÍNCRONA (es un ref)
    setIsRunning(false);
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setMaxHold(null);
    setMinHold(null);
    setLiveData(null);
    // cancelPoll(seqRef.current);
}, []);

  /* ----------------------------------------------------------
     TRAER UNA MUESTRA Y ACTUALIZAR MÁX/MÍN HOLD / HEATMAP
  ---------------------------------------------------------- */
  const errorRef = useRef(0);
  const fetchSample = useCallback(async () => {
    if (localStorage.getItem("nodo") !== nodoAtStartRef.current) {
        stopCapture();
        return;
    }

    const fetcher =
        onFetchSample ?? ((_id: string | number, seq: number) => Promise.resolve(generateMockSample(seq)));

    try {
        const sample = await fetcher(identify, seqRef.current);
        seqRef.current += 1;

        const newNodoType = normalizeNodoType(localStorage.getItem("nodoType"));
        if (newNodoType !== nodoTypeRef.current) {
            nodoTypeRef.current = newNodoType;
            setNodoType(newNodoType);
            heatGridRef.current = null;
        }

        if (nodoTypeRef.current === "rphy") {
            const binsX = sample.freqs.length;
            const expectedLen = binsX * HEAT_Y_BINS;
            if (!heatGridRef.current || heatGridRef.current.length !== expectedLen) {
                heatGridRef.current = new Uint16Array(expectedLen);
            }
            const grid = heatGridRef.current;
            for (let i = 0; i < binsX; i++) {
                const yIdx = yBinIndexForValue(sample.values[i]);
                const idx = yIdx * binsX + i;
                if (grid[idx] < 65535) grid[idx] += 1;
            }
        }
        if (!isRunningRef.current) return;

        setLiveData(sample);
        setMaxHold((prevMax) => {
            if (!prevMax || prevMax.length !== sample.values.length) return sample.values.slice();
            return prevMax.map((v, i) => Math.max(v, sample.values[i]));
        });
        setMinHold((prevMin) => {
            if (!prevMin || prevMin.length !== sample.values.length) return sample.values.slice();
            return prevMin.map((v, i) => Math.min(v, sample.values[i]));
        });

        // éxito -> apagamos el pollTimer previo si quedó alguno colgado
        if (isRunningRef.current) {
            pollTimerRef.current = setTimeout(fetchSample, intervalMs);
        }
    } catch (err) {
        console.error("Live: error al traer la muestra", err);
        stopCapture(); // ✅ un solo fallo real, un solo toast, corta al toque
    }
}, [identify, onFetchSample, intervalMs, stopCapture]);

  /* ----------------------------------------------------------
     BOTÓN DE PLAY
  ---------------------------------------------------------- */
  const startCapture = useCallback(() => {
    if (isRunning) return;
    nodoAtStartRef.current = localStorage.getItem("nodo");
    seqRef.current = 0;
    heatGridRef.current = null;
    isRunningRef.current = true;
    setIsRunning(true);
    fetchSample();
  }, [isRunning, fetchSample]);

  const handlePlayClick = () => {
    if (isRunning) {
      stopCapture();
    } else {
      startCapture();
    }
  };

  const handleProgressAnimationEnd = () => {
    stopCapture();
  };

  useEffect(() => {
    return () => {
      isRunningRef.current = false;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  useEffect(()=>{
    if(nodoAtStartRef.current !== localStorage.getItem("nodo")){
      stopCapture();
      localStorage.removeItem("sessionId");
      localStorage.removeItem("nodoType");
    }
  }, [localStorage.getItem("nodo")])
  /* ----------------------------------------------------------
     BOTÓN DE RESET
  ---------------------------------------------------------- */
  const handleResetHold = () => {
    if (!liveData) return;
    if (nodoType === "rphy") {
      if (heatGridRef.current) heatGridRef.current.fill(0);
      setHeatVersion((v) => v + 1);
      setMaxHold(liveData.values.slice()); // <-- NUEVO
    } else {
      setMaxHold(liveData.values.slice());
      setMinHold(liveData.values.slice());
    }
  };

  /* ----------------------------------------------------------
     BOTÓN DE PANTALLA COMPLETA
  ---------------------------------------------------------- */
  const handleToggleMaximize = () => setIsMaximized((prev) => !prev);

  /* ----------------------------------------------------------
     DIBUJO DEL GRÁFICO
  ---------------------------------------------------------- */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (!liveData) return;

    const freqMin = liveData.freqs[0];
    const freqMax = liveData.freqs[liveData.freqs.length - 1];
    const scales = makeScales(width, height, freqMin, freqMax);

    if (liveData.kind === "rphy") {
      const { header, grid } = liveData.heatmap;
      drawAxes(ctx, width, height, header.startFreq, header.endFreq, scales);

      let off = heatCanvasRef.current;
      if (!off) { off = document.createElement("canvas"); heatCanvasRef.current = off; }
      if (off.width !== header.width || off.height !== header.height) {
        off.width = header.width;
        off.height = header.height;
      }
      const offCtx = off.getContext("2d");
      if (offCtx) {
        const w = header.width;
        const h = header.height;
        const imgData = offCtx.createImageData(w, h);
        for (let row = 0; row < h; row++) {
          // const calculatedRow = h - 1 - row;
          // const srcRow = Math.round((calculatedRow * - 20)/100 + calculatedRow); // invierte el orden de filas
          const srcRow = h - 1 - row; // invierte el orden de filas
          for (let col = 0; col < w; col++) {
            const srcIdx = srcRow * w + col;
            const dstIdx = row * w + col;
            const [r, g, b, a] = weightToColor(grid[srcIdx]);
            const p = dstIdx * 4;
            imgData.data[p] = r; imgData.data[p + 1] = g; imgData.data[p + 2] = b; imgData.data[p + 3] = a;
          }
        }
        offCtx.putImageData(imgData, 0, 0);
        ctx.imageSmoothingEnabled = false;
        // ctx.drawImage(off, 0, 0, header.width, header.height, CHART_PADDING.left, CHART_PADDING.top, scales.plotWidth, scales.plotHeight);
        const yTop = scales.yForValue(header.maxLevel);   // dónde cae el nivel más alto
        const yBottom = scales.yForValue(header.minLevel); // dónde cae el nivel más bajo
        const drawHeight = yBottom - yTop;

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          off,
          0, 0, header.width, header.height,          // recorte de origen (todo)
          CHART_PADDING.left, yTop,                    // posición de destino correcta
          scales.plotWidth, drawHeight                 // tamaño de destino correcto
        );
      }
      if (maxHold) plotSeries(ctx, scales, liveData.freqs, maxHold, "#4aa3ff"); // <-- NUEVO
      plotSeries(ctx, scales, liveData.freqs, liveData.values, "#f2f2f2");
      drawThresholdLine(ctx, scales, width, thresholdDb, "#c040e0");
      if (lowerThresholdDb !== undefined) {
        drawThresholdLine(ctx, scales, width, lowerThresholdDb, "#40c0e0");
      }
      plotSeries(ctx, scales, liveData.freqs, liveData.values, "#f2f2f2");
      drawThresholdLine(ctx, scales, width, thresholdDb, "#c040e0");
      if (lowerThresholdDb !== undefined) {
        drawThresholdLine(ctx, scales, width, lowerThresholdDb, "#40c0e0");
      }
    } else {
      drawAxes(ctx, width, height, freqMin, freqMax, scales);
      if (maxHold) plotSeries(ctx, scales, liveData.freqs, maxHold, "#4aa3ff");
      if (minHold) plotSeries(ctx, scales, liveData.freqs, minHold, "#e0a23a");
      plotSeries(ctx, scales, liveData.freqs, liveData.values, "#f2f2f2");
      drawThresholdLine(ctx, scales, width, thresholdDb, "#e04040");
    }
  }, [liveData, maxHold, minHold, thresholdDb, lowerThresholdDb, isMaximized, nodoType, heatVersion]);

  /* ----------------------------------------------------------
     RENDER
  ---------------------------------------------------------- */
  return (
    <div className={cls.root}>
      <div className={`${cls.canvasWrap} ${isMaximized ? cls.canvasWrapMaximized : ""}`}>
        <canvas
          ref={canvasRef}
          className={`${cls.canvas} ${isMaximized ? cls.canvasMaximixed : ""}`}
          width={1200}
          height={675}
        />

        {!liveData && <p className={`${cls.placeholder} ${isMaximized ? cls.placeholderMaximized : ""}`}>Sin datos todavía. Iniciá la captura.</p>}

      </div>

      <div className={`${cls.controls} ${isMaximized ? cls.controlsMaximized : ""}`} >
        <button
          type="button"
          className={`${cls.btn} ${cls.btnPlay} ${isRunning ? cls.btnRunning : ""}`}
          onClick={handlePlayClick}
          aria-label={isRunning ? "Cancelar captura" : "Iniciar captura"}
        >
          {isRunning && (
            <span
              className={cls.progressFill}
              style={{ animationDuration: `${durationMs}ms` }}
              onAnimationEnd={handleProgressAnimationEnd}
            />
          )}
          <span className="spectrumLive__btnIcon">{isRunning ? <StopIcon /> : <PlayIcon />}</span>
        </button>

        <button
          type="button"
          className={`${cls.btn} ${cls.btnReset}`}
          onClick={handleResetHold}
          aria-label="Resetear"
          disabled={!liveData}
        >
          <ResetIcon className=""/>
        </button>

        <button
          type="button"
          className={`${cls.btn} ${cls.btnMaximize}`}
          onClick={handleToggleMaximize}
          aria-label={isMaximized ? "Restaurar tamaño" : "Pantalla completa"}
        >
          {isMaximized ? <MinimizeIcon className=""/> : <MaximizeIcon className=""/>}
        </button>
      </div>
    </div>
  );
};

export default Live;