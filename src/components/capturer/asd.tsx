import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./Live.scss";

/* ============================================================
   TIPOS
   Forma de los datos que le llegan al componente. El backend
   (que vas a resolver vos) tiene que entregar esto ya calculado:
   freqs[i] junto con values[i] es un punto del espectro.
   ============================================================ */
interface SpectrumSample {
  /** Frecuencias en MHz */
  freqs: number[];
  /** Nivel de señal en dBmV, mismo largo que "freqs" */
  values: number[];
}

interface LiveProps {
  /** Identificador que necesita el backend para pedir datos (ej: HCU) */
  identify: string | number;
  /** Cuánto dura la captura en vivo. Por defecto 1 minuto */
  durationMs?: number;
  /** Cada cuánto se pide una muestra nueva mientras corre la captura */
  intervalMs?: number;
  /** Valor del umbral (línea roja) en dBmV */
  thresholdDb?: number;
  /**
   * Trae UNA muestra nueva del backend (handshake + poll, socket, etc).
   * Acá va tu integración real. Si no se pasa, el componente arma
   * datos de prueba solo para poder visualizarse.
   */
  onFetchSample?: (identify: string | number, seq: number) => Promise<SpectrumSample>;
}

/* ============================================================
   DATOS DE PRUEBA
   Se usan únicamente si no se pasa "onFetchSample" por props.
   Reemplazalos conectando tu propio backend (proxy/handshake/poll).
   ============================================================ */
const generateMockSample = (seq: number): SpectrumSample => {
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
  return { freqs, values };
};

/* ============================================================
   ICONOS
   SVGs simples e inline, sin depender de ninguna librería.
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

const ResetIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M12 5V2L7 7l5 5V8c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
  </svg>
);

const MaximizeIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M4 4h6V2H2v8h2V4zm14 0v6h2V2h-8v2h6zM4 14H2v8h8v-2H4v-6zm14 6h-6v2h8v-8h-2v6z" />
  </svg>
);

const MinimizeIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M6 10H2V8h6V2h2v8H6zm10 0h4V8h-6V2h-2v8h4zM6 14H2v2h6v6h2v-8H6zm10 0h4v2h-6v6h-2v-8h4z" />
  </svg>
);

/* ============================================================
   CLASES BEM (camelCase)
   Bloque: spectrumLive
   Se guardan en un objeto para no repetir strings largos y para
   que quede clarísimo, de un vistazo, cuál es cada elemento y
   cada modificador definido en Live.scss.
   ============================================================ */
const cls = {
  root: "spectrumLive",

  canvasWrap: "spectrumLive__canvasWrap",
  canvasWrapMaximized: "spectrumLive__canvasWrap--maximized",
  canvas: "spectrumLive__canvas",
  placeholder: "spectrumLive__placeholder",

  legend: "spectrumLive__legend",
  swatch: "spectrumLive__swatch",
  swatchMax: "spectrumLive__swatch--max",
  swatchLive: "spectrumLive__swatch--live",
  swatchMin: "spectrumLive__swatch--min",
  swatchThreshold: "spectrumLive__swatch--threshold",

  overlay: "spectrumLive__overlay",

  controls: "spectrumLive__controls",
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
   Rango del eje Y y márgenes internos del canvas.
   ============================================================ */
const CHART_PADDING = { left: 50, right: 15, top: 15, bottom: 30 };
const Y_MIN = -60;
const Y_MAX = 20;

const Live: React.FC<LiveProps> = ({
  identify,
  durationMs = 60_000,
  intervalMs = 200,
  thresholdDb = -30,
  onFetchSample,
}) => {
  /* ----------------------------------------------------------
     ESTADOS
  ---------------------------------------------------------- */
  const [isRunning, setIsRunning] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [liveData, setLiveData] = useState<SpectrumSample | null>(null);
  const [maxHold, setMaxHold] = useState<number[] | null>(null);
  const [minHold, setMinHold] = useState<number[] | null>(null);

  /* ----------------------------------------------------------
     REFERENCIAS
     canvasRef    -> canvas de la vista normal
     canvasMaxRef -> canvas de la vista maximizada (portal aparte,
                     por eso es OTRO elemento <canvas> en el DOM)
     pollTimerRef -> el interval del polling
     seqRef       -> número de secuencia que se le manda al backend
  ---------------------------------------------------------- */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasMaxRef = useRef<HTMLCanvasElement>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const seqRef = useRef(0);

  /* ----------------------------------------------------------
     TRAER UNA MUESTRA Y ACTUALIZAR MÁX/MÍN HOLD
  ---------------------------------------------------------- */
  const fetchSample = useCallback(async () => {
    const fetcher = onFetchSample ?? ((_id: string | number, seq: number) => Promise.resolve(generateMockSample(seq)));

    try {
      const sample = await fetcher(identify, seqRef.current);
      seqRef.current += 1;

      setLiveData(sample);
      setMaxHold((prevMax) => {
        if (!prevMax || prevMax.length !== sample.values.length) return sample.values.slice();
        return prevMax.map((v, i) => Math.max(v, sample.values[i]));
      });
      setMinHold((prevMin) => {
        if (!prevMin || prevMin.length !== sample.values.length) return sample.values.slice();
        return prevMin.map((v, i) => Math.min(v, sample.values[i]));
      });
    } catch (err) {
      // Si falla una muestra no se corta la captura, se intenta de nuevo
      // en el próximo intervalo. El manejo de errores "de verdad" queda
      // para tu integración con el backend.
      console.error("Live: error al traer la muestra", err);
    }
  }, [identify, onFetchSample]);

  /* ----------------------------------------------------------
     BOTÓN DE PLAY
     Arranca el polling y lo corta solo a los "durationMs".
     El corte automático llega por el evento "onAnimationEnd" de
     la barra de progreso que vive DENTRO del propio botón (ver JSX).
  ---------------------------------------------------------- */
  const startCapture = useCallback(() => {
    if (isRunning) return;
    seqRef.current = 0;
    setIsRunning(true);
    fetchSample();
    pollTimerRef.current = setInterval(fetchSample, intervalMs);
  }, [isRunning, fetchSample, intervalMs]);

  const stopCapture = useCallback(() => {
    setIsRunning(false);
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const handlePlayClick = () => {
    if (isRunning) {
      // Click manual mientras está corriendo = cancelar antes de tiempo
      stopCapture();
    } else {
      startCapture();
    }
  };

  // Cuando termina la animación de la barra interna (a los "durationMs"),
  // el botón vuelve solo a su color original.
  const handleProgressAnimationEnd = () => {
    stopCapture();
  };

  // Limpieza por si el componente se desmonta con la captura corriendo
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  /* ----------------------------------------------------------
     BOTÓN DE RESET (máx / mín hold)
  ---------------------------------------------------------- */
  const handleResetHold = () => {
    if (!liveData) return;
    setMaxHold(liveData.values.slice());
    setMinHold(liveData.values.slice());
  };

  /* ----------------------------------------------------------
     DIBUJO DEL GRÁFICO
     Recibe el <canvas> a dibujar (puede ser el normal o el del
     portal maximizado) y pinta grilla + series + umbral.
  ---------------------------------------------------------- */
  const drawOnCanvas = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      if (!liveData) return;

      const freqMin = liveData.freqs[0];
      const freqMax = liveData.freqs[liveData.freqs.length - 1];

      const xForFreq = (freq: number) =>
        CHART_PADDING.left + ((freq - freqMin) / (freqMax - freqMin)) * (width - CHART_PADDING.left - CHART_PADDING.right);

      const yForValue = (value: number) => {
        const clamped = Math.max(Y_MIN, Math.min(Y_MAX, value));
        return CHART_PADDING.top + ((Y_MAX - clamped) / (Y_MAX - Y_MIN)) * (height - CHART_PADDING.top - CHART_PADDING.bottom);
      };

      // Grilla horizontal (dBmV)
      ctx.strokeStyle = "#3a3a3a";
      ctx.fillStyle = "#999";
      ctx.font = "11px Arial";
      ctx.lineWidth = 1;
      for (let v = Y_MIN; v <= Y_MAX; v += 10) {
        const y = yForValue(v);
        ctx.beginPath();
        ctx.moveTo(CHART_PADDING.left, y);
        ctx.lineTo(width - CHART_PADDING.right, y);
        ctx.stroke();
        ctx.fillText(String(v), 5, y + 4);
      }

      // Grilla vertical (frecuencia)
      const gridStep = Math.ceil((freqMax - freqMin) / 10 / 5) * 5 || 5;
      for (let f = Math.ceil(freqMin / gridStep) * gridStep; f <= freqMax; f += gridStep) {
        const x = xForFreq(f);
        ctx.beginPath();
        ctx.moveTo(x, CHART_PADDING.top);
        ctx.lineTo(x, height - CHART_PADDING.bottom);
        ctx.stroke();
        ctx.fillText(f.toFixed(0), x - 10, height - CHART_PADDING.bottom + 15);
      }

      // Función auxiliar para trazar una serie (máx hold / mín hold / vivo)
      const plotSeries = (series: number[], color: string) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        series.forEach((value, i) => {
          const x = xForFreq(liveData.freqs[i]);
          const y = yForValue(value);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      };

      if (maxHold) plotSeries(maxHold, "#4aa3ff");
      if (minHold) plotSeries(minHold, "#e0a23a");
      plotSeries(liveData.values, "#f2f2f2");

      // Línea de umbral
      const y = yForValue(thresholdDb);
      ctx.strokeStyle = "#e04040";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(CHART_PADDING.left, y);
      ctx.lineTo(width - CHART_PADDING.right, y);
      ctx.stroke();
      ctx.fillStyle = "#e04040";
      ctx.fillText(thresholdDb.toFixed(2), CHART_PADDING.left + 3, y - 4);
    },
    [liveData, maxHold, minHold, thresholdDb]
  );

  // Se redibujan los dos canvas que puedan existir en cada momento.
  // El del portal recién existe en el DOM cuando "isMaximized" es true,
  // por eso este effect también depende de "isMaximized".
  useEffect(() => {
    drawOnCanvas(canvasRef.current);
    drawOnCanvas(canvasMaxRef.current);
  }, [drawOnCanvas, isMaximized]);

  /* ----------------------------------------------------------
     LEYENDA — se repite igual en la vista normal y en la maximizada
  ---------------------------------------------------------- */
  const renderLegend = () => (
    <div className={cls.legend}>
      <span>
        <i className={`${cls.swatch} ${cls.swatchMax}`} /> Máx. hold
      </span>
      <span>
        <i className={`${cls.swatch} ${cls.swatchLive}`} /> En vivo
      </span>
      <span>
        <i className={`${cls.swatch} ${cls.swatchMin}`} /> Mín. hold
      </span>
      <span>
        <i className={`${cls.swatch} ${cls.swatchThreshold}`} /> Umbral
      </span>
    </div>
  );

  /* ----------------------------------------------------------
     BARRA DE BOTONES — se repite igual en la vista normal y en la
     maximizada. "onToggleMaximize" cambia según dónde se renderiza:
     en la vista normal abre el overlay, en el overlay lo cierra.
  ---------------------------------------------------------- */
  const renderControls = (variant: "normal" | "overlay") => (
    <div className={cls.controls}>
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
        <span className={cls.btnIcon}>{isRunning ? <StopIcon /> : <PlayIcon />}</span>
      </button>

      <button
        type="button"
        className={`${cls.btn} ${cls.btnReset}`}
        onClick={handleResetHold}
        aria-label="Resetear máx/mín"
        disabled={!liveData}
      >
        <ResetIcon />
      </button>

      <button
        type="button"
        className={`${cls.btn} ${cls.btnMaximize}`}
        onClick={() => setIsMaximized(variant === "normal")}
        aria-label={variant === "overlay" ? "Restaurar tamaño" : "Pantalla completa"}
      >
        {variant === "overlay" ? <MinimizeIcon /> : <MaximizeIcon />}
      </button>
    </div>
  );

  /* ----------------------------------------------------------
     RENDER
  ---------------------------------------------------------- */
  return (
    <div className={cls.root}>
      {/* Vista normal: siempre montada, vive dentro del layout de la app */}
      <div className={cls.canvasWrap}>
        <canvas ref={canvasRef} className={cls.canvas} width={1200} height={480} />
        {!liveData && <p className={cls.placeholder}>Sin datos todavía. Iniciá la captura.</p>}
        {renderLegend()}
      </div>

      {renderControls("normal")}

      {/*
        Vista maximizada: se monta con un PORTAL directo en document.body.
        Así el "position: fixed" queda relativo a la ventana de verdad y
        no a algún ancestro con transform/overflow que lo esté rompiendo.
      */}
      {isMaximized &&
        createPortal(
          <div className={cls.overlay}>
            <div className={`${cls.canvasWrap} ${cls.canvasWrapMaximized}`}>
              <canvas ref={canvasMaxRef} className={cls.canvas} width={1200} height={480} />
              {renderLegend()}
            </div>
            {renderControls("overlay")}
          </div>,
          document.body
        )}
    </div>
  );
};

export default Live;