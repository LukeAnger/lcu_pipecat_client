// src/components/home/ScoreStrip.jsx
// Compact summary strip:
//   - "Current Total Score: X / Y"
//   - "Time Remaining: hh:mm:ss"
//   - Full-width progress bar underneath.

import ProgressBar from "../common/ProgressBar";
import "./ScoreStrip.css";

/**
 * Props:
 * - totalScore: number
 * - totalMax:   number
 * - timeRemaining: string (hh:mm:ss)
 */
export default function ScoreStrip({
    totalScore = 0,
    totalMax = 35,
    timeRemaining = "00:30:00",
}) {
    return (
        <div className="score-strip">
            <div className="score-strip__row">
                <div className="score-strip__left">
                    <strong>Current Total Score:</strong>&nbsp;
                    {totalScore.toFixed(1)} / {totalMax.toFixed(1)}
                </div>
                <div className="score-strip__right">
                    <strong>Time Remaining:</strong>&nbsp;{timeRemaining}
                </div>
            </div>

            <ProgressBar
                value={totalScore}
                max={totalMax}
                variant="header"
                showThumb
                ariaLabel="Total score progress"
            />
        </div>
    );
}
