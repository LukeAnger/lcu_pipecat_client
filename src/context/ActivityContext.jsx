import { createContext, useContext, useMemo, useReducer, useCallback } from "react";
import { fetchActivity, parseRubricJson } from "../api/activity-get";
import { fetchActivitySummary } from "../api/activity-summary";

/* ---------- helpers ---------- */
function parseMaybeJSON(x) {
  if (x == null) return null;
  if (typeof x === "object") return x;
  if (typeof x !== "string") return null;
  const s = x.trim();
  if (!s || (!s.startsWith("{") && !s.startsWith("["))) return null;
  try { return JSON.parse(s); } catch { return null; }
}

function computeTotals(rubric, scoresById, participationScore) {
  const maxFromItems = (rubric?.items || []).reduce(
    (sum, it) => sum + (Number(it.external_max_score) || 0), 0
  );
  const participationMax = Number(rubric?.participation_criteria?.max_score) || 0;
  const totalMax = maxFromItems + participationMax;

  const itemsSum = (rubric?.items || []).reduce((sum, it) => {
    const val = scoresById[it.id]?.score;
    return sum + (typeof val === "number" ? val : 0);
  }, 0);

  const partScore = Number(participationScore?.score) || 0;
  const totalScore = itemsSum + partScore;

  return { totalScore, totalMax, participationMax };
}

/* ---------- state ---------- */
const initialState = {
  rubric: null,
  scoresById: {},
  participationScore: null,
  lastActivityState: null,
  welcomeHtml: "",
  timeReminder: null,
  finalAssessment: null,
  submissionId: null,
  lastBlock: null,
  activityMetadata: null,      // from /activity/get
  analyticsSummary: null,      // from /activity/summary
};

/* ---------- actions ---------- */
const types = {
  RESET: "RESET",
  SET_RUBRIC: "SET_RUBRIC",
  UPSERT_ITEM_SCORE: "UPSERT_ITEM_SCORE",
  UPSERT_BATCH_SCORES: "UPSERT_BATCH_SCORES",
  SET_PARTICIPATION_SCORE: "SET_PARTICIPATION_SCORE",
  SET_FINAL_ASSESSMENT: "SET_FINAL_ASSESSMENT",
  SET_SUBMISSION_ID: "SET_SUBMISSION_ID",
  SET_TIME_REMINDER: "SET_TIME_REMINDER",
  SET_WELCOME_HTML: "SET_WELCOME_HTML",
  SET_LAST_ACTIVITY_STATE: "SET_LAST_ACTIVITY_STATE",
  SET_LAST_BLOCK: "SET_LAST_BLOCK",
  SET_ACTIVITY_METADATA: "SET_ACTIVITY_METADATA",
  SET_ANALYTICS_SUMMARY: "SET_ANALYTICS_SUMMARY",
  INGEST_RTVI_ACTIVITY: "INGEST_RTVI_ACTIVITY",
};

/* ---------- reducer ---------- */
function reducer(state, action) {
  switch (action.type) {
    case types.RESET:
      return { ...initialState };

    case types.SET_LAST_ACTIVITY_STATE:
      return { ...state, lastActivityState: action.payload || null };

    case types.SET_LAST_BLOCK:
      return { ...state, lastBlock: action.payload || null };

    case types.SET_ACTIVITY_METADATA:
      return { ...state, activityMetadata: action.payload || null };

    case types.SET_ANALYTICS_SUMMARY:
      return { ...state, analyticsSummary: action.payload || null };

    case types.SET_RUBRIC:
      return {
        ...state,
        rubric: action.payload || null,
        scoresById: {},
        participationScore: null,
        finalAssessment: null,
        submissionId: null,
      };

    case types.UPSERT_ITEM_SCORE: {
      const item = action.payload;
      if (!item || typeof item.rubric_item_id !== "number") return state;
      return {
        ...state,
        scoresById: {
          ...state.scoresById,
          [item.rubric_item_id]: {
            ...state.scoresById[item.rubric_item_id],
            ...item,
          },
        },
      };
    }

    case types.UPSERT_BATCH_SCORES: {
      const list = Array.isArray(action.payload) ? action.payload : [];
      if (!list.length) return state;
      const next = { ...state.scoresById };
      for (const s of list) {
        if (s && typeof s.rubric_item_id === "number") {
          next[s.rubric_item_id] = { ...next[s.rubric_item_id], ...s };
        }
      }
      return { ...state, scoresById: next };
    }

    case types.SET_PARTICIPATION_SCORE:
      return { ...state, participationScore: action.payload || null };

    case types.SET_FINAL_ASSESSMENT:
      return { ...state, finalAssessment: action.payload || null };

    case types.SET_SUBMISSION_ID:
      return { ...state, submissionId: typeof action.payload === "string" ? action.payload : null };

    case types.SET_TIME_REMINDER:
      return { ...state, timeReminder: typeof action.payload === "string" ? action.payload : null };

    case types.SET_WELCOME_HTML:
      return { ...state, welcomeHtml: typeof action.payload === "string" ? action.payload : "" };

    case types.INGEST_RTVI_ACTIVITY: {
      const data = action.payload || {};
      const stateName = data.activity_state;
      const raw = data.activity_result;
      const parsed = parseMaybeJSON(raw) ?? raw;

      let next = reducer(state, { type: types.SET_LAST_ACTIVITY_STATE, payload: stateName });
      next = reducer(next, { type: types.SET_LAST_BLOCK, payload: data });

      switch (stateName) {
        case "activity-start": {
          const rubricObj = parsed && typeof parsed === "object" ? parsed : null;
          if (!rubricObj?.items) return next;
          return reducer(next, { type: types.SET_RUBRIC, payload: rubricObj });
        }
        case "activity-start-welcome": {
          if (typeof raw === "string") {
            return reducer(next, { type: types.SET_WELCOME_HTML, payload: raw });
          }
          return next;
        }
        case "activity-intermediate-evaluation-update-result": {
          const item = parsed && typeof parsed === "object" ? parsed : null;
          if (!item || typeof item.rubric_item_id !== "number") return next;
          return reducer(next, { type: types.UPSERT_ITEM_SCORE, payload: item });
        }
        case "activity-intermediate-evaluation-end": {
          const res = parsed && typeof parsed === "object" ? parsed : null;
          if (!res?.scores?.length) return next;
          return reducer(next, { type: types.UPSERT_BATCH_SCORES, payload: res.scores });
        }
        case "activity-evaluation-end": {
          const res = parsed && typeof parsed === "object" ? parsed : null;
          if (!res?.scores?.length) return next;
          let after = reducer(next, { type: types.UPSERT_BATCH_SCORES, payload: res.scores });
          after = reducer(after, { type: types.SET_PARTICIPATION_SCORE, payload: res.participation_score || null });
          after = reducer(after, { type: types.SET_FINAL_ASSESSMENT, payload: res });
          return after;
        }
        case "activity-end":
          return reducer(next, { type: types.SET_SUBMISSION_ID, payload: typeof raw === "string" ? raw : null });
        case "activity-time-reminder":
          return reducer(next, { type: types.SET_TIME_REMINDER, payload: typeof raw === "string" ? raw : null });
        default:
          return next;
      }
    }

    default:
      return state;
  }
}

/* ---------- context ---------- */
const ActivityStateContext = createContext(null);
const ActivityDispatchContext = createContext(null);

/* ---------- provider ---------- */
export function ActivityProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // derived
  const totals = useMemo(
    () => computeTotals(state.rubric, state.scoresById, state.participationScore),
    [state.rubric, state.scoresById, state.participationScore]
  );

  const rubricWithScores = useMemo(() => {
    if (!state.rubric) return [];
    return state.rubric.items.map((it) => ({
      id: it.id,
      title: it.external_title,
      desc: it.external_user_description,
      max: Number(it.external_max_score) || 0,
      score: typeof state.scoresById[it.id]?.score === "number" ? state.scoresById[it.id].score : 0,
      justification: state.scoresById[it.id]?.justification || "",
    }));
  }, [state.rubric, state.scoresById]);

  // ---- Loaders (exposed to consumers) ----
  const loadActivityMeta = useCallback(async ({ activity_id, session_id = 'None', signal } = {}) => {
    const meta = await fetchActivity({ activity_id, session_id, signal });
    dispatch({ type: types.SET_ACTIVITY_METADATA, payload: meta });

    if (!state.rubric && meta?.rubric_json) {
      const parsed = parseRubricJson(meta.rubric_json);
      if (parsed?.items) dispatch({ type: types.SET_RUBRIC, payload: parsed });
    }
    if (typeof meta?.activity_welcome === 'string') {
      dispatch({ type: types.SET_WELCOME_HTML, payload: meta.activity_welcome });
    }
    return meta;
  }, [state.rubric]);

  const loadAnalyticsSummary = useCallback(async ({ activity_id, session_id = 'None', signal } = {}) => {
    const summary = await fetchActivitySummary({ activity_id, session_id, signal });
    dispatch({ type: types.SET_ANALYTICS_SUMMARY, payload: summary });
    return summary;
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      totalScore: totals.totalScore,
      totalMax: totals.totalMax,
      participationMax: totals.participationMax,
      rubricWithScores,
      // loaders
      loadActivityMeta,
      loadAnalyticsSummary,
      dispatch,
    }),
    [state, totals, rubricWithScores, loadActivityMeta, loadAnalyticsSummary]
  );

  return (
    <ActivityStateContext.Provider value={value}>
      <ActivityDispatchContext.Provider value={dispatch}>
        {children}
      </ActivityDispatchContext.Provider>
    </ActivityStateContext.Provider>
  );
}

/* ---------- hooks ---------- */
export function useActivity() {
  const ctx = useContext(ActivityStateContext);
  if (!ctx) throw new Error("useActivity must be used within <ActivityProvider>");
  return ctx;
}
export function useActivityDispatch() {
  const ctx = useContext(ActivityDispatchContext);
  if (!ctx) throw new Error("useActivityDispatch must be used within <ActivityProvider>");
  return ctx;
}

/* ---------- action creators ---------- */
export const ActivityActions = {
  reset:             () => ({ type: types.RESET }),
  setRubric:         (rubric) => ({ type: types.SET_RUBRIC, payload: rubric }),
  upsertItemScore:   (item) => ({ type: types.UPSERT_ITEM_SCORE, payload: item }),
  upsertBatchScores: (scores) => ({ type: types.UPSERT_BATCH_SCORES, payload: scores }),
  setParticipationScore: (ps) => ({ type: types.SET_PARTICIPATION_SCORE, payload: ps }),
  setFinalAssessment:    (res) => ({ type: types.SET_FINAL_ASSESSMENT, payload: res }),
  setSubmissionId:       (id) => ({ type: types.SET_SUBMISSION_ID, payload: id }),
  setTimeReminder:       (msg) => ({ type: types.SET_TIME_REMINDER, payload: msg }),
  setWelcomeHtml:        (html) => ({ type: types.SET_WELCOME_HTML, payload: html }),
  setLastActivityState:  (name) => ({ type: types.SET_LAST_ACTIVITY_STATE, payload: name }),
  setActivityMetadata:   (meta) => ({ type: types.SET_ACTIVITY_METADATA, payload: meta }),
  setAnalyticsSummary:   (s) => ({ type: types.SET_ANALYTICS_SUMMARY, payload: s }),
  ingestRtvi: (payload) => ({ type: types.INGEST_RTVI_ACTIVITY, payload }),
};
