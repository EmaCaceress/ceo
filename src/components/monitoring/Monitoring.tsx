import React, {useEffect, useState } from "react";
import "./Monitoring.scss";
import toast from "react-hot-toast";
import { refreshMonitoring } from "../../server/server";
import arrow from "../../assets/arrow.png";
import level from "../../assets/niveles.png";
import users from "../../assets/abonados.png";
import fec from "../../assets/conteo.png";
import refreshButton from "../../assets/refreshButton.png";

interface SnrStats {
  average: number;
  min: number;
  max: number;
}

interface MonitoringData {
  node: string;
  total: number;
  up: number;
  down: number;
  upPercent: number;
  downPercent: number;
  snrDs: SnrStats | null;
  snrUs: SnrStats | null;
  dsFecPre: SnrStats | null;
  dsFecPrePercent: SnrStats | null;
  dsFecPost: SnrStats | null;
  dsFecPostPercent: SnrStats | null;
  usFecPre: SnrStats | null;
  usFecPrePercent: SnrStats | null;
  usFecPost: SnrStats | null;
  usFecPostPercent: SnrStats | null;
  pwrDs: SnrStats | null;
  pwrUs: SnrStats | null;
}

/** Inline CSS custom property, typed so TS doesn't complain about `--card-accent`. */
type AccentStyle = React.CSSProperties & { "--card-accent"?: string };

const Monitoring: React.FC = () => {
  const [node, setNode] = useState<string>("");
  const upNodo = (e: string) => {
    setNode(e);
    localStorage.setItem("nodo", e);
  }

  const [monitoringData, setMonitoringData] =
    useState<MonitoringData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    setNode(localStorage.getItem("nodo") || "");
  }, []);

  // useEffect(() => {
  //   if(node && monitoringData === null) {
  //     handleSearch({ preventDefault: () => {} } as React.SubmitEvent<HTMLFormElement>);
  //   }
  //   }, [node]);

  const handleSearch = async (
    event: React.SubmitEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();

    const formattedNode = node.trim().toUpperCase();

    try {
      setIsLoading(true);
      setMonitoringData(null);

      const data = await refreshMonitoring({ nodo: formattedNode });

      if (data) {
        setMonitoringData(data);
      }
    } catch {
      toast.error("Error obteniendo el monitoreo");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="monitoring">
      <section className="monitoring__container">
        <header className="monitoring__header">
          <div className="monitoring__heading">
            <h1 className="monitoring__title">Monitoreo de nodo</h1>

            <p className="monitoring__description">
              Consultá el estado actual y los niveles del nodo.
            </p>
          </div>

          <form className="monitoring__search" onSubmit={handleSearch}>
            <input
              className="monitoring__search-input"
              type="text"
              value={node}
              onChange={(event) => upNodo(event.target.value.toUpperCase())}
              placeholder="Ej: RE18L"
              maxLength={20}
              autoComplete="off"
            />

            <button
              className="monitoring__search-button"
              type="submit"
              disabled={isLoading}
            >
              <img src={refreshButton} alt="" />
            </button>
          </form>
        </header>

        {isLoading && (
          <div className="monitoring__loading">
            <span className="monitoring__loader" />

            <p className="monitoring__loading-text">
              Obteniendo información del nodo...
            </p>
          </div>
        )}

        {monitoringData && !isLoading && (
          <div className="monitoring__results">
            <div className="monitoring__node-info">
              <span className="monitoring__node-label">Nodo</span>

              <strong className="monitoring__node-name">
                {monitoringData.node}
              </strong>
            </div>

            <SubscribersCard
              total={monitoringData.total}
              up={monitoringData.up}
              down={monitoringData.down}
              upPercent={monitoringData.upPercent}
            />

            <section className="monitoring__grid">
              <SnrCard
                title="SNR DS"
                stats={monitoringData.snrDs}
                accent="var(--color-primary-value)"
                flipIcon
              />

              <SnrCard
                title="SNR US"
                stats={monitoringData.snrUs}
                accent="var(--color-primary-value)"
              />

              <MonitoringGroup
                title="CONTEO DS"
                accent="var(--color-primary-value)"
                rows={[
                  {
                    label: "Pre",
                    value: monitoringData.dsFecPre,
                    percent: monitoringData.dsFecPrePercent,
                    tone: "primary",
                  },
                  {
                    label: "Post",
                    value: monitoringData.dsFecPost,
                    percent: monitoringData.dsFecPostPercent,
                    tone: "accent",
                  },
                ]}
              />

              <MonitoringGroup
                title="CONTEO US"
                accent="var(--color-primary-value)"
                rows={[
                  {
                    label: "Pre",
                    value: monitoringData.usFecPre,
                    percent: monitoringData.usFecPrePercent,
                    tone: "primary",
                  },
                  {
                    label: "Post",
                    value: monitoringData.usFecPost,
                    percent: monitoringData.usFecPostPercent,
                    tone: "accent",
                  },
                ]}
              />

              <PowerCard ds={monitoringData.pwrDs} us={monitoringData.pwrUs} />
            </section>
          </div>
        )}

        {!monitoringData && !isLoading && (
          <div className="monitoring__empty">
            <span className="monitoring__empty-icon">
              <img src={refreshButton}></img>
            </span>

            <h2 className="monitoring__empty-title">Buscá un nodo</h2>

            <p className="monitoring__empty-text">
              Ingresá el nodo CMTS para consultar su estado.
            </p>
          </div>
        )}
      </section>
    </main>
  );
};

/* ------------------------------------------------------------------ */
/* Donut card                                                         */
/* ------------------------------------------------------------------ */

interface DonutChartProps {
  upPercent: number;
}

const DONUT_RADIUS = 52;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

const DonutChart: React.FC<DonutChartProps> = ({ upPercent }) => {
  const clampedPercent = Math.min(100, Math.max(0, upPercent));
  const progressLength = (clampedPercent / 100) * DONUT_CIRCUMFERENCE;

  return (
    <svg
      className="monitoring__donut"
      viewBox="0 0 120 120"
      role="img"
      aria-label={`${clampedPercent.toFixed(1)}% de abonados arriba`}
    >
      <circle
        className="monitoring__donut-track"
        cx="60"
        cy="60"
        r={DONUT_RADIUS}
        fill="none"
        strokeWidth="12"
      />

      <circle
        className="monitoring__donut-progress"
        cx="60"
        cy="60"
        r={DONUT_RADIUS}
        fill="none"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${progressLength} ${DONUT_CIRCUMFERENCE}`}
        transform="rotate(-90 60 60)"
      />

      <text x="60" y="66" textAnchor="middle" className="monitoring__donut-label">
        {clampedPercent.toFixed(1)}%
      </text>
    </svg>
  );
};

interface SubscribersCardProps {
  total: number;
  up: number;
  down: number;
  upPercent: number;
}

const SubscribersCard: React.FC<SubscribersCardProps> = ({
  total,
  up,
  down,
  upPercent,
}) => (
  <article
    className="monitoring__card monitoring__subscribers"
    style={{ "--card-accent": "var(--color-primary-value)" } as AccentStyle}
  >
    <h2 className="monitoring__card-title monitoring__card-title--icon">
      <img
          className="monitoring__snr-icon"
          src={users}
          alt=""
      />
      ABONADOS
    </h2>

    <div className="monitoring__subscribers-body">
      <DonutChart upPercent={upPercent} />

      <ul className="monitoring__subscribers-stats">
        <li className="monitoring__row">
          <span className="monitoring__row-label">Total</span>
          <strong className="monitoring__row-value">{total}</strong>
        </li>

        <li className="monitoring__row">
          <span className="monitoring__row-label">Arriba</span>
          <strong className="monitoring__row-value monitoring__value--accent">
            {up}
          </strong>
        </li>

        <li className="monitoring__row">
          <span className="monitoring__row-label">Caídos</span>
          <strong className="monitoring__row-value monitoring__value--error">
            {down}
          </strong>
        </li>
      </ul>
    </div>
  </article>
);

/* ------------------------------------------------------------------ */
/* SNR card                                                           */
/* ------------------------------------------------------------------ */

interface SnrCardProps {
  title: string;
  stats: SnrStats | null;
  accent: string;
  flipIcon?: boolean;
}

const SnrCard: React.FC<SnrCardProps> = ({ title, stats, accent, flipIcon }) => (
  <article className="monitoring__card" style={{ "--card-accent": accent } as AccentStyle}>
    <h2 className="monitoring__card-title monitoring__card-title--icon">
      <img
        className="monitoring__snr-icon"
        src={arrow}
        alt=""
        style={{ transform: flipIcon ? "rotate(180deg)" : "none" }}
      />
      {title}
    </h2>

    <div className="monitoring__row monitoring__row--single">
      <span className="monitoring__row-label">Promedio</span>
      <strong className="monitoring__row-value">
        {stats ? `${stats.average.toFixed(2)} dB` : "-"}
      </strong>
    </div>
  </article>
);

/* ------------------------------------------------------------------ */
/* FEC group card                                                     */
/* ------------------------------------------------------------------ */

interface MonitoringGroupRow {
  label: string;
  value: SnrStats | null;
  percent: SnrStats | null;
  tone: "primary" | "accent";
}

interface MonitoringGroupProps {
  title: string;
  accent: string;
  rows: MonitoringGroupRow[];
}

const MonitoringGroup: React.FC<MonitoringGroupProps> = ({
  title,
  accent,
  rows,
}) => (
  <article className="monitoring__card" style={{ "--card-accent": accent } as AccentStyle}>
    <h2 className="monitoring__card-title monitoring__card-title--icon">
      <img
        className="monitoring__snr-icon"
        src={fec}
        alt=""
      />
      {title}
    </h2>

    {rows.map((row) => (
      <div key={row.label} className="monitoring__row">
        <span className="monitoring__row-label">{row.label}</span>

        {/* <span className="monitoring__row-sub">
          {row.value?.average.toExponential(2) ?? "-"}
        </span> */}

        <strong className={`monitoring__row-value`}>
          {row.percent?.average.toFixed(2) ?? "-"}%
        </strong>
      </div>
    ))}
  </article>
);

/* ------------------------------------------------------------------ */
/* Power card                                                         */
/* ------------------------------------------------------------------ */

interface PowerCardProps {
  ds: SnrStats | null;
  us: SnrStats | null;
}

const PowerCard: React.FC<PowerCardProps> = ({ ds, us }) => (
  <article
    className="monitoring__card"
    style={{ "--card-accent": "var(--color-primary-value)" } as AccentStyle}
  >
    <h2 className="monitoring__card-title monitoring__card-title--icon">
      <img
          className="monitoring__snr-icon"
          src={level}
          alt=""
      />
      CM Power
    </h2>

    <div className="monitoring__row">
      <span className="monitoring__row-label">Downstream</span>
      <strong className="monitoring__row-value">
        {ds ? `${ds.average.toFixed(2)} dBmV` : "-"}
      </strong>
    </div>

    <div className="monitoring__row">
      <span className="monitoring__row-label">Upstream</span>
      <strong className="monitoring__row-value">
        {us ? `${us.average.toFixed(2)} dBmV` : "-"}
      </strong>
    </div>
  </article>
);

export default Monitoring;