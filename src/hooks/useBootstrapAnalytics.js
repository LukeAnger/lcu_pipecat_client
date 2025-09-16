// hooks/useBootstrapAnalytics.js
import { useEffect } from "react";
import { useActivity } from "../context/ActivityContext";

/**
 * One-shot loader for /activity/summary.
 * - Runs whenever {activityId, sessionId} change.
 * - Writes the server response into ActivityContext via loadAnalyticsSummary.
 * - Uses AbortController to cancel in-flight requests on unmount or id change.
 */
export function useBootstrapAnalytics(activityId, sessionId = "None") {
    const { loadAnalyticsSummary } = useActivity();

    useEffect(() => {
        if (!activityId) return;

        const ctrl = new AbortController();

        loadAnalyticsSummary({
            activity_id: activityId,
            session_id: sessionId,
            signal: ctrl.signal,
        }).catch((e) => console.error("[analytics] summary failed:", e));

        return () => ctrl.abort();
    }, [activityId, sessionId, loadAnalyticsSummary]);
}
