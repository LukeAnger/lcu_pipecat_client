import { useEffect } from "react";
import { useActivity } from "../context/ActivityContext";

export function useBootstrapAnalytics(activityId, sessionId = "None") {
  const { loadAnalyticsSummary } = useActivity();

  useEffect(() => {
    if (!activityId) return;
    const ctrl = new AbortController();
    loadAnalyticsSummary({ activity_id: activityId, session_id: sessionId, signal: ctrl.signal })
      .catch((e) => console.error("[analytics] summary failed:", e));
    return () => ctrl.abort();
  }, [activityId, sessionId, loadAnalyticsSummary]);
}
