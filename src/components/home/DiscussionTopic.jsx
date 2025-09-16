// src/components/home/DiscussionTopic.jsx
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

const firstImgSrc = (html) => {
    if (!html || typeof html !== "string") return null;
    const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    return m?.[1] || null;
};

const DiscussionTopic = ({
    // removed: title, question, imageSrc
    questionPreview,
    defaultExpanded = true,
    onToggle,
}) => {
    const {
        rubric,
        activityMetadata,
        welcomeHtml,
        totalScore: ctxTotalScore,
        totalMax: ctxTotalMax,
        timeReminder,
    } = useActivity();

    const effectiveTitle =
        activityMetadata?.title ??
        rubric?.question ??
        "";

    const questionNode =
        activityMetadata?.discussion_question ??
        rubric?.question ??
        "";

    const effectiveImg = firstImgSrc(welcomeHtml) ?? null;
    const previewText = questionPreview ?? toText(questionNode);

    const [expanded, setExpanded] = useState(defaultExpanded);
    const toggle = () => {
        const next = !expanded;
        setExpanded(next);
        onToggle && onToggle(next);
    };

    const hasTotals = useMemo(
        () => Number.isFinite(ctxTotalScore) && Number.isFinite(ctxTotalMax) && ctxTotalMax > 0,
        [ctxTotalScore, ctxTotalMax]
    );

    return (
        <section className="dt">
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
                        {effectiveImg && (
                            <div className="dt__img-wrap">
                                <img className="dt__img" src={effectiveImg} alt="" />
                            </div>
                        )}
                        <div className="dt__question">{questionNode}</div>
                    </div>
                )}
            </div>

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
