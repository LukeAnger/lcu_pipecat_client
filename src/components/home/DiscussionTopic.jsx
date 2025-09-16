import { useState, useMemo } from "react";
import ProgressBar from "../common/ProgressBar";
import "./DiscussionTopic.css";
import { useActivity } from "../../context/ActivityContext";

const toText = (node) => {
  if (node == null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(toText).join(" ");
  if (typeof node === "object" && node.props) return toText(node.props.children);
  return "";
};

const DiscussionTopic = ({
  title,             // optional override for header
  question,          // optional override for body (string | ReactNode)
  questionPreview,   // optional override for collapsed preview text
  imageSrc,
  defaultExpanded = true,
  onToggle,
}) => {
  const {
    rubric,
    totalScore: ctxTotalScore,
    totalMax:   ctxTotalMax,
    timeReminder,
  } = useActivity();

  const effectiveTitle = title ?? rubric?.question ?? "";
  const questionNode   = question ?? rubric?.question ?? "";
  const previewText    = questionPreview ?? toText(questionNode);

  const [expanded, setExpanded] = useState(defaultExpanded);
  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    onToggle && onToggle(next);
  };

  // Only show score/progress if we have valid numbers
  const hasTotals = useMemo(() => {
    return Number.isFinite(ctxTotalScore) && Number.isFinite(ctxTotalMax) && ctxTotalMax > 0;
  }, [ctxTotalScore, ctxTotalMax]);

  return (
    <section className="dt">
      {/* Top bar: title + controls */}
      <header className="dt__bar">
        <div className="dt__title">
          <span className="dt__label">Discussion Topic:</span>
          <span className="dt__title-text" title={effectiveTitle}>
            {effectiveTitle || " "}
          </span>
        </div>
        <div className="dt__actions">
          <button className="dt__controls-btn" type="button">
            Conversation Controls
          </button>
        </div>
      </header>

      {/* Card */}
      <div className="dt__card">
        <div className="dt__card-head" onClick={toggle}>
          <div className="dt__head-left">
            <strong className="dt__q-label">Question:</strong>
            {!expanded && (
              <div className="dt__preview" title={previewText}>
                {previewText}
              </div>
            )}
          </div>
          <button
            type="button"
            className="dt__toggle"
            aria-expanded={expanded}
            aria-label={expanded ? "Hide question" : "Show question"}
            onClick={toggle}
          >
            {expanded ? "Hide ▾" : "Show ▸"}
          </button>
        </div>

        {expanded && (
          <div className="dt__card-body">
            {imageSrc && (
              <div className="dt__img-wrap">
                <img className="dt__img" src={imageSrc} alt="" />
              </div>
            )}
            <div className="dt__question">{questionNode}</div>
          </div>
        )}
      </div>

      {/* Meta row (only render score if we have it) */}
      {(hasTotals || timeReminder) && (
        <div className="dt__meta">
          {hasTotals && (
            <div className="dt__score">
              <span className="dt__meta-label">Current Total Score:</span>
              <span className="dt__meta-value">
                {ctxTotalScore.toFixed(1)} / {ctxTotalMax.toFixed(1)}
              </span>
            </div>
          )}
          {timeReminder && (
            <div className="dt__time">
              <span className="dt__meta-label">Time Remaining:</span>
              <span className="dt__meta-value">{timeReminder}</span>
            </div>
          )}
        </div>
      )}

      {/* Full-width progress (only if totals are valid) */}
      {hasTotals && (
        <div className="dt__progress">
          <ProgressBar
            value={ctxTotalScore}
            max={ctxTotalMax}
            variant="header"
            showThumb
            ariaLabel="Total score progress"
          />
        </div>
      )}

      <div className="dt__divider" />
    </section>
  );
};

export default DiscussionTopic;
