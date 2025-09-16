import { useState, useCallback } from "react";
import "./Setup.css";

const Setup = () => {
  const [participationEnabled, setParticipationEnabled] = useState(false);
  const [participationValue, setParticipationValue] = useState(0);
  const [lastParticipationValue, setLastParticipationValue] = useState(0);

  const toNumber = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };

  const handleParticipationChange = useCallback((e) => {
    setParticipationValue(toNumber(e.target.value));
  }, []);

  const handleParticipationToggle = useCallback(
    (e) => {
      const checked = e.target.checked;
      if (!checked) {
        setLastParticipationValue(participationValue);
        setParticipationValue(0);
        setParticipationEnabled(false);
      } else {
        setParticipationValue(lastParticipationValue ?? 0);
        setParticipationEnabled(true);
      }
    },
    [participationValue, lastParticipationValue]
  );

  return (
    <section className="setup">
      <div className="setup__box">
        <h5 className="setup__title">Activity Type</h5>
        <select className="setup__select" defaultValue="">
          <option value="" disabled>
            Select Activity Type
          </option>
          <option value="discussion">Discussion</option>
        </select>
      </div>

      <div className="setup__box">
        <h5 className="setup__title">Activity Title (Max 100 characters)</h5>
        <input
          type="text"
          className="setup__input"
          maxLength="100"
          placeholder="Enter Activity Title"
        />
      </div>

      <div className="setup__box">
        <h5 className="setup__title">Activity Description</h5>
        <textarea
          className="setup__textarea"
          maxLength="500"
          placeholder="Enter Activity Description"
        ></textarea>
      </div>

      <div className="setup__box">
        <h5 className="setup__title">Activity Image (Optional)</h5>
        <input type="file" className="setup__input" accept="image/*" />
        <h5 className="setup__title">Accepted Formats: JPG, JPEG, PNG</h5>
      </div>

      <div className="setup__box_grid_2x2">
        <div className="setup__box">
          <h5 className="setup__title">Maximum Score</h5>
          <input
            type="number"
            className="setup__input"
            min="0"
            max="100"
            placeholder="0.0"
          />
        </div>

        <div className="setup__box">
          <div className="flex-row">
            <h5
              className="setup__title"
              title="Enable or disable participation scoring for this activity."
            >
              Participation Score
            </h5>
            <label
              className="setup__switch"
              title="Enable or disable participation scoring for this activity."
            >
              <input
                type="checkbox"
                checked={participationEnabled}
                onChange={handleParticipationToggle}
                aria-label="Toggle participation score"
              />
              <span className="setup__slider"></span>
            </label>
          </div>

          <input
            type="number"
            className="setup__input setup__input--participation"
            min="0"
            step="0.1"
            placeholder="0.0"
            title="Set the maximum participation points for this activity."
            disabled={!participationEnabled}
            value={participationValue}
            onChange={handleParticipationChange}
          />
        </div>

        <div className="setup__box">
          <h5 className="setup__title">Maximum Time (minutes)</h5>
          <input
            type="text"
            className="setup__input"
            placeholder="Unlimited"
          />
        </div>

        <div className="setup__box">
          <h5 className="setup__title">Suggested Time (minutes)</h5>
          <input
            type="number"
            className="setup__input"
            min="1"
            max="180"
            placeholder="60"
          />
        </div>
      </div>

      <div className="setup__box">
        <h5 className="setup__title">Rubric</h5>
        <div className="setup__rubric-actions">
          <button type="button" className="setup__btn setup__btn--primary">
            Autogenerate Rubric
          </button>
          <button type="button" className="setup__btn setup__btn--ghost">
            Create Rubric
          </button>
        </div>
      </div>

      <div className="setup__actions">
        <button type="button" className="setup__link">
          Advanced Settings
        </button>
        <button type="button" className="setup__btn setup__btn--disabled" disabled>
          Save Activity Settings
        </button>
      </div>
    </section>
  );
};

export default Setup;
