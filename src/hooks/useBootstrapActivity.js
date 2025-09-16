// hooks/useBootstrapActivity.js
import { useEffect } from 'react';
import { fetchActivity, parseRubricJson } from '../api/activity-get';
import { useActivityDispatch, ActivityActions } from '../context/ActivityContext';

/** Casts numeric-ish values; falls back when invalid. */
function pickNumber(n, fallback = null) {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}

/**
 * Bootstraps ActivityContext from /activity/get.
 * - Fetches the activity record when {activityId, sessionId} change.
 * - Hydrates: rubric, welcome HTML, and lightweight metadata.
 * - Guards against late state writes via a cancellation flag.
 */
export function useBootstrapActivity(activityId, sessionId = 'None') {
  const dispatch = useActivityDispatch();

  useEffect(() => {
    if (!activityId) return;

    let cancelled = false;

    (async () => {
      try {
        const record = await fetchActivity({
          activity_id: activityId,
          session_id: sessionId,
        });
        if (cancelled) return;

        // Rubric (parsed from record.rubric_json)
        const rubric = parseRubricJson(record?.rubric_json);
        if (rubric?.items) dispatch(ActivityActions.setRubric(rubric));

        // Optional welcome/description HTML
        if (typeof record?.activity_welcome === 'string') {
          dispatch(ActivityActions.setWelcomeHtml(record.activity_welcome));
        }

        // Compact metadata used by the UI
        dispatch(
          ActivityActions.setActivityMeta({
            activity_id: record?.activity_id,
            title: record?.title || '',
            discussion_question:
              record?.discussion_question || rubric?.question || '',
            max_duration_minutes: pickNumber(
              record?.max_duration_minutes,
              rubric?.max_duration_minutes ?? null
            ),
            suggested_duration_minutes: pickNumber(
              record?.suggested_duration_minutes,
              rubric?.suggested_duration_minutes ?? null
            ),
            created_at: record?.created_at ?? null,
            class_id: record?.class_id ?? null,
            language: record?.language ?? 'EN',
          })
        );

        console.log('[bootstrap] activity loaded:', record?.activity_id);
      } catch (err) {
        console.error('[bootstrap] load failed:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activityId, sessionId, dispatch]);
}
