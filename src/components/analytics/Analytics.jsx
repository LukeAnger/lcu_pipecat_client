import { useEffect, useMemo } from "react";
import "./Analytics.css";
import { useActivity } from "../../context/ActivityContext";

const Analytics = () => {
  const {
    activityMetadata,
    rubric,
    totalMax,
    loadActivityMeta,
  } = useActivity();

  // Pull ids from env (or replace with router/store later)
  const activity_id = import.meta.env?.VITE_ACTIVITY_ID;
  const session_id = import.meta.env?.VITE_SESSION_ID || "None";

  // Fetch metadata (and bootstrap rubric from rubric_json) if missing
  useEffect(() => {
    if (!activityMetadata || !rubric) {
      if (activity_id) {
        loadActivityMeta({ activity_id, session_id }).catch(() => {});
      }
    }
  }, [activity_id, session_id, activityMetadata, rubric, loadActivityMeta]);

  // Derive some friendly values
  const discussionQuestion =
    activityMetadata?.discussion_question ||
    rubric?.question ||
    "(No question provided)";

  const suggestedMin =
    Number(activityMetadata?.suggested_duration_minutes) ||
    Number(rubric?.suggested_duration_minutes) ||
    null;

  const createdAt = useMemo(() => {
    const ts = Number(activityMetadata?.created_at);
    if (!Number.isFinite(ts) || ts <= 0) return null;
    // server value looked like epoch seconds; display a readable date
    const d = new Date(ts * 1000);
    return isNaN(d.getTime()) ? null : d.toLocaleString();
  }, [activityMetadata?.created_at]);

  const maxScore = useMemo(() => totalMax || 0, [totalMax]);

  const items = rubric?.items || [];

  return (
    <section className="analytics">
      <h2 className="analytics__page-title">Analytics</h2>

      {/* Summary Card (metadata-driven for now) */}
      <div className="analytics__card">
        <h3 className="analytics__card-title">Summary</h3>
        <p className="analytics__muted">
          Activity metadata (rubric totals and timing). Live performance stats will appear once submissions exist.
        </p>

        <div className="analytics__metrics">
          <div className="analytics__metric">
            <div className="analytics__metric-value">{maxScore || "—"}</div>
            <div className="analytics__metric-label">Max Score</div>
          </div>

          <div className="analytics__metric">
            <div className="analytics__metric-value">
              {suggestedMin != null ? suggestedMin : "—"}
              <span className="analytics__metric-small"> min</span>
            </div>
            <div className="analytics__metric-label">Suggested Time</div>
          </div>

          <div className="analytics__metric">
            <div className="analytics__metric-value">{createdAt || "—"}</div>
            <div className="analytics__metric-label">Created</div>
          </div>

          <div className="analytics__metric">
            <div className="analytics__metric-value">
              {activityMetadata?.language || "—"}
            </div>
            <div className="analytics__metric-label">Language</div>
          </div>
        </div>

        <div className="analytics__hi-lo">
          <div>
            <strong>Question:</strong> {discussionQuestion}
          </div>
        </div>
      </div>

      {/* Rubric Analysis – purely rubric metadata for now */}
      <div className="analytics__card">
        <h3 className="analytics__card-title">Rubric Items</h3>
        <p className="analytics__muted">
          Each item’s title, user description, and max points (no averages yet).
        </p>

        {items.length === 0 && (
          <div className="analytics__muted">No rubric items yet.</div>
        )}

        {items.map((it, idx) => {
          const itemMax = Number(it.external_max_score) || 0;
          return (
            <div key={it.id ?? idx} className="analytics__rubric-item">
              <div className="analytics__rubric-head">
                <h4 className="analytics__rubric-title">
                  {idx + 1}. {it.external_title}
                </h4>
                <div className="analytics__rubric-avg">
                  Max: <strong>{itemMax}</strong>
                </div>
              </div>

              <div className="analytics__errors">
                <div className="analytics__errors-title">Description</div>
                <ul className="analytics__errors-list">
                  <li className="analytics__error">
                    <span className="analytics__error-desc">
                      {it.external_user_description || "—"}
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
};

export default Analytics;
