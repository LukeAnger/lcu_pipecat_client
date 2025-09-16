// src/api/activity.js

const isDev = !!import.meta.env?.DEV;
const PROD_BASE = (import.meta.env?.VITE_API_BASE || 'https://labs.dscovar.org').replace(/\/+$/, '');
const BASE = isDev ? '' : PROD_BASE;

/**
 * POST /activity/get (x-www-form-urlencoded)
 * @param {object} p
 * @param {string} p.activity_id
 * @param {string} [p.session_id='None']
 * @param {AbortSignal} [p.signal]
 */
export async function fetchActivity({ activity_id, session_id = 'None', signal } = {}) {
  if (!activity_id) throw new Error('fetchActivity: activity_id is required');

  const body = new URLSearchParams({ activity_id, session_id });

  const res = await fetch(`${BASE}/activity/get`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'Accept': 'application/json',
    },
    body,
    signal,
  });

  const ctype = res.headers.get('content-type') || '';
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`GET /activity/get failed: ${res.status} ${res.statusText} ${text.slice(0, 512)}`);
  }

  // Some servers mislabel; try JSON first, else parse from text
  let data;
  try {
    data = ctype.includes('application/json') ? JSON.parse(text) : JSON.parse(text);
  } catch {
    throw new Error(`GET /activity/get: invalid JSON response`);
  }

  return {
    ...data,
    rubric: parseRubricJson(data.rubric_json), // convenience
  };
}

/** Safe JSON parse for the rubric_json string from the API */
export function parseRubricJson(rubric_json) {
  if (!rubric_json || typeof rubric_json !== 'string') return null;
  try {
    return JSON.parse(rubric_json);
  } catch {
    return null;
  }
}
