import "./progressbar.css";

/**
 * ProgressBar
 *  - value, max
 *  - variant: "default" | "header" | "mini"
 *  - showThumb: boolean
 *  - ariaLabel: string (optional)
 */
const ProgressBar = ({ value = 0, max = 1, variant = "default", showThumb = false, ariaLabel }) => {
  const safeMax = Math.max(1, Number(max) || 1);
  const safeVal = Math.max(0, Math.min(Number(value) || 0, safeMax));
  const pct = (safeVal / safeMax) * 100;

  return (
    <div
      className={`progress-bar progress-bar--${variant} ${showThumb ? "progress-bar--thumb" : ""}`}
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={safeVal}
    >
      <div className="progress-bar__fill" style={{ width: `${pct}%` }} />
      {showThumb && <div className="progress-bar__thumb" style={{ left: `calc(${pct}% - 6px)` }} aria-hidden="true" />}
    </div>
  );
};

export default ProgressBar;
