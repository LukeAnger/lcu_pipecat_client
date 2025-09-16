import "./Analytics.css";
import { useActivity } from "../../context/ActivityContext";
import { useBootstrapAnalytics } from "../../hooks/useBootstrapAnalytics";

function secondsToMinutes(sec) {
  const n = Number(sec);
  if (!Number.isFinite(n)) return "—";
  return Math.max(0, Math.round(n / 60));
}

export default function Analytics() {
  const {
    activityMetadata,
    analyticsSummary,
    rubric,            // to list items while you don’t have per-item analytics yet
    totalMax,          // computed from rubric
  } = useActivity();

  // Find the activity id from context meta or env (fallback)
  const activityId =
    activityMetadata?.activity_id ||
    import.meta.env?.VITE_ACTIVITY_ID ||
    null;

  // Kick off analytics fetch
  useBootstrapAnalytics(activityId, "None");

  // ---- Summary Stats (keep your original layout/labels) ----
  const submitted   = analyticsSummary?.submission_count ?? 0;
  const notStarted  = "—"; // unknown (server doesn’t provide it)
  const avgScore    = "—"; // unknown today
  const maxScore    = Number.isFinite(totalMax) ? totalMax : "—";
  const avgTimeMin  = secondsToMinutes(analyticsSummary?.average_duration);
  const highest     = "—"; // unknown today
  const lowest      = "—"; // unknown today

  // ---- Rubric analysis (for now, just display the rubric items) ----
  const items = rubric?.items || [];

  return (
    <section className="analytics">
      <h2 className="analytics__page-title">Analytics</h2>

      {/* Summary Card (unchanged structure) */}
      <div className="analytics__card">
        <h3 className="analytics__card-title">Summary Stats</h3>
        <p className="analytics__muted">
          These metrics are based on the number of submitted assignments, not necessarily the total
        </p>

        <div className="analytics__metrics">
          <div className="analytics__metric">
            <div className="analytics__metric-value">{submitted}</div>
            <div className="analytics__metric-label">Submitted</div>
          </div>

          <div className="analytics__metric">
            <div className="analytics__metric-value">{notStarted}</div>
            <div className="analytics__metric-label">Not Started</div>
          </div>

          <div className="analytics__metric">
            <div className="analytics__metric-value">
              {avgScore} <span className="analytics__metric-small">/ {maxScore}</span>
            </div>
            <div className="analytics__metric-label">Avg Score</div>
          </div>

          <div className="analytics__metric">
            <div className="analytics__metric-value">
              {avgTimeMin} <span className="analytics__metric-small">min</span>
            </div>
            <div className="analytics__metric-label">Avg Time</div>
          </div>
        </div>

        <div className="analytics__hi-lo">
          <div><strong>Highest Score:</strong> {highest} / {maxScore}</div>
          <div><strong>Lowest Score:</strong> {lowest} / {maxScore}</div>
        </div>
      </div>

      {/* Rubric Analysis — show rubric items themselves for now */}
      <div className="analytics__card">
        <h3 className="analytics__card-title">Rubric Analysis</h3>
        <p className="analytics__muted">Detailed analysis of scores per rubric items</p>

        {items.map((it, idx) => {
          const itemMax = Number(it.external_max_score) || 0;
          const avgItemScore = "—";        // no per-item analytics yet
          const progressPct = 0;           // no data, keep track at 0

          return (
            <div key={it.id ?? idx} className="analytics__rubric-item">
              <div className="analytics__rubric-head">
                <h4 className="analytics__rubric-title">
                  {idx + 1}. {it.external_title}
                </h4>
                <div className="analytics__rubric-avg">
                  Avg Score: <strong>{avgItemScore} / {itemMax}</strong>
                </div>
              </div>

              <div className="analytics__progress">
                <div className="analytics__progress-track">
                  <div className="analytics__progress-fill" style={{ width: `${progressPct}%` }} />
                  <div
                    className="analytics__progress-thumb"
                    style={{ left: `calc(${progressPct}% - 6px)` }}
                    aria-hidden="true"
                  />
                </div>
              </div>

              <div className="analytics__errors">
                <div className="analytics__errors-title">Item Description</div>
                <ul className="analytics__errors-list">
                  <li className="analytics__error">
                    <span className="analytics__error-strong">{it.external_user_description}</span>
                  </li>
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
