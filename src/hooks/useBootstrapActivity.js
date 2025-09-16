import { useEffect } from 'react';
import { fetchActivity, parseRubricJson } from '../api/activity-get';
import { useActivityDispatch, ActivityActions } from '../context/ActivityContext';

function pickNumber(n, fallback = null) {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}

/**
 * Load activity record once (or whenever the id changes)
 * and hydrate ActivityContext (rubric + welcome + meta).
 */
export function useBootstrapActivity(activityId, sessionId = 'None') {
  const dispatch = useActivityDispatch();

  useEffect(() => {
    if (!activityId) return;

    let cancelled = false;

    (async () => {
      try {
        const record = await fetchActivity({ activity_id: activityId, session_id: sessionId });
        if (cancelled) return;

        // 1) rubric
        const rubric = parseRubricJson(record?.rubric_json);
        if (rubric?.items) {
          dispatch(ActivityActions.setRubric(rubric));
        }

        // 2) welcome HTML (optional)
        if (typeof record?.activity_welcome === 'string') {
          dispatch(ActivityActions.setWelcomeHtml(record.activity_welcome));
        }

        // 3) meta (handy for UI)
        dispatch(ActivityActions.setActivityMeta({
          activity_id: record?.activity_id,
          title: record?.title || '',
          discussion_question: record?.discussion_question || rubric?.question || '',
          max_duration_minutes: pickNumber(record?.max_duration_minutes, rubric?.max_duration_minutes ?? null),
          suggested_duration_minutes: pickNumber(record?.suggested_duration_minutes, rubric?.suggested_duration_minutes ?? null),
          created_at: record?.created_at ?? null,
          class_id: record?.class_id ?? null,
          language: record?.language ?? 'EN',
        }));

        // Optional: if rubric.question is empty, but API has discussion_question:
        // You can also merge/override here if your UX prefers that.

        console.log('[bootstrap] activity loaded:', record?.activity_id);
      } catch (err) {
        console.error('[bootstrap] load failed:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [activityId, sessionId, dispatch]);
}
