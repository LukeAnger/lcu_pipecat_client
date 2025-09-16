// components/analytics/Analytics.jsx
import "./Analytics.css";
import { useActivity } from "../../context/ActivityContext";
import { useBootstrapAnalytics } from "../../hooks/useBootstrapAnalytics";

/** small formatters */
const f1  = (x) => (Number.isFinite(+x) ? (+x).toFixed(1) : "—");
const s2m = (x) => (Number.isFinite(+x) ? Math.max(0, Math.round(+x / 60)) : "—");
const num = (x) => (Number.isFinite(+x) ? +x : null);

/**
 * Analytics view:
 * - pulls summary stats from ActivityContext.analyticsSummary (populated via /activity/summary)
 * - lists rubric items (no per-item analytics yet)
 */
const Analytics = () => {
  const { activityMetadata, analyticsSummary, rubric, totalMax } = useActivity();

  // activity id source of truth (context first, env fallback)
  const activityId =
    activityMetadata?.activity_id ||
    import.meta.env?.VITE_ACTIVITY_ID ||
    null;

  // fire and forget summary fetch on mount/id change
  useBootstrapAnalytics(activityId, "None");

  // summary fields (fallbacks mirror original UI)
  const s      = num(analyticsSummary?.submission_count) ?? 0;
  const ns     = num(analyticsSummary?.not_started) ?? "—";
  const avgNum = num(analyticsSummary?.avg_score);
  const hiNum  = num(analyticsSummary?.highest_score);
  const loNum  = num(analyticsSummary?.lowest_score);
  const maxNum = num(analyticsSummary?.max_score) ?? num(totalMax);

  const avg  = avgNum != null ? f1(avgNum) : "—";
  const hi   = hiNum  != null ? f1(hiNum)  : "—";
  const lo   = loNum  != null ? f1(loNum)  : "—";
  const max  = maxNum != null ? f1(maxNum) : "—";
  const tmin = s2m(analyticsSummary?.average_duration);

  // rubric listing for “Rubric Analysis” section
  const items = rubric?.items || [];

  return (
    <section className="analytics">
      <h2 className="analytics__page-title">Analytics</h2>

      {/* Summary card (structure preserved) */}
      <div className="analytics__card analytics__card--elev">
        <h3 className="analytics__card-title">Summary Stats</h3>
        <p className="analytics__muted">
          These metrics are based on the number of submitted assignments, not necessarily the total
        </p>

        <div className="analytics__metrics">
          <div className="analytics__metric">
            <div className="analytics__metric-value">{s}</div>
            <div className="analytics__metric-label">Submitted</div>
          </div>

          <div className="analytics__metric">
            <div className="analytics__metric-value">{ns}</div>
            <div className="analytics__metric-label">Not Started</div>
          </div>

          <div className="analytics__metric">
            <div className="analytics__metric-value">
              {avg} <span className="analytics__metric-small">/ {max}</span>
            </div>
            <div className="analytics__metric-label">Avg Score</div>
          </div>

          <div className="analytics__metric">
            <div className="analytics__metric-value">
              {tmin} <span className="analytics__metric-small">min</span>
            </div>
            <div className="analytics__metric-label">Avg Time</div>
          </div>
        </div>

        <div className="analytics__hi-lo">
          <div><strong>Highest Score:</strong> {hi} / {max}</div>
          <div><strong>Lowest Score:</strong> {lo} / {max}</div>
        </div>
      </div>

      {/* Rubric Analysis: display item metadata only (no per-item aggregates yet) */}
      <div className="analytics__card analytics__card--elev">
        <h3 className="analytics__card-title">Rubric Analysis</h3>
        <p className="analytics__muted">Detailed analysis of scores per rubric items</p>

        {items.map((it, i) => {
          const itemMax = f1(it.external_max_score);
          return (
            <div key={it.id ?? i} className="analytics__rubric-item">
              <div className="analytics__rubric-head">
                <h4 className="analytics__rubric-title">
                  {i + 1}. {it.external_title}
                </h4>
                <div className="analytics__rubric-avg">
                  Avg Score: <strong>— / {itemMax}</strong>
                </div>
              </div>

              <div className="analytics__progress">
                <div className="analytics__progress-track">
                  <div className="analytics__progress-fill" style={{ width: "0%" }} />
                  <div className="analytics__progress-thumb" style={{ left: "calc(0% - 6px)" }} />
                </div>
              </div>

              <div className="analytics__errors">
                <div className="analytics__errors-title">Item Description</div>
                <ul className="analytics__errors-list">
                  <li className="analytics__error">
                    <span className="analytics__error-strong">
                      {it.external_user_description}
                    </span>
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

export default Analytics;