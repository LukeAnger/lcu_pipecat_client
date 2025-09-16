import ProgressBar from "../common/ProgressBar";
import "./Sidepanel.css";
import { useActivity } from "../../context/ActivityContext";

const f1 = (n) => Number(n ?? 0).toFixed(1);

const Sidepanel = ({ setShowRight }) => {
  const {
    rubricWithScores, participationScore, participationMax,
  } = useActivity();

  const hasRubric = Array.isArray(rubricWithScores) && rubricWithScores.length > 0;

  return (
    <aside className="sidepanel">
      <div className="sidepanel__header">
        <h3 className="sidepanel__title">Score Breakdown</h3>
        <button
          className="sidepanel__link"
          type="button"
          onClick={() => setShowRight?.(false)}
        >
          Hide »
        </button>
      </div>

      {!hasRubric ? (
        <div className="sidepanel__empty">
          Real-time updates for scores per rubric item will appear here.
        </div>
      ) : (
        <section className="sidepanel__cards">
          {rubricWithScores.map(({ id, title, desc, score, max }) => (
            <article key={id} className="sidepanel__card">
              <h5 className="sidepanel__card-title">{title}</h5>
              <p className="sidepanel__card-desc">{desc}</p>

              <div className="sidepanel__line sidepanel__line--tight">
                <span className="sidepanel__label">Score:</span>
                <span className="sidepanel__value">
                  {f1(score)} / {f1(max)}
                </span>
              </div>

              <div className="sidepanel__rubric_pgbar">
                <ProgressBar
                  value={Number(score || 0)}
                  max={Number(max || 0)}
                  variant="mini"
                  showThumb
                  ariaLabel={`${title} progress`}
                />
              </div>
            </article>
          ))}

          {participationMax > 0 && (
            <article className="sidepanel__card">
              <h5 className="sidepanel__card-title">Participation</h5>
              <p className="sidepanel__card-desc">
                Curiosity, persistence, and relevant comments.
              </p>

              <div className="sidepanel__line sidepanel__line--tight">
                <span className="sidepanel__label">Score:</span>
                <span className="sidepanel__value">
                  {f1(participationScore?.score)} / {f1(participationMax)}
                </span>
              </div>

              <div className="sidepanel__rubric_pgbar">
                <ProgressBar
                  value={Number(participationScore?.score || 0)}
                  max={Number(participationMax || 0)}
                  variant="mini"
                  showThumb
                  ariaLabel="Participation progress"
                />
              </div>
            </article>
          )}
        </section>
      )}
    </aside>
  );
};

export default Sidepanel;
