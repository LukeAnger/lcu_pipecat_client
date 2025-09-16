// src/api/activity-summary.js
// Fetches analytics summary for an activity from /activity/summary (JSON body).
// - Returns raw server JSON (submission_count, average_duration, …)
// - Dev uses Vite proxy (BASE = '')

const isDev = !!import.meta.env?.DEV;
const PROD_BASE = (import.meta.env?.VITE_API_BASE || 'https://labs.dscovar.org').replace(/\/+$/, '');
const BASE = isDev ? '' : PROD_BASE;

/**
 * POST /activity/summary
 * @param {object} p
 * @param {string} p.activity_id
 * @param {string} [p.session_id='None']
 * @param {AbortSignal} [p.signal]
 */
export async function fetchActivitySummary({ activity_id, session_id = 'None', signal } = {}) {
    if (!activity_id) throw new Error('fetchActivitySummary: activity_id is required');

    const res = await fetch(`${BASE}/activity/summary`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            'Accept': 'application/json',
        },
        body: JSON.stringify({ activity_id, session_id }),
        signal,
    });

    const text = await res.text();
    if (!res.ok) {
        throw new Error(`POST /activity/summary failed: ${res.status} ${res.statusText} ${text.slice(0, 400)}`);
    }

    try { return JSON.parse(text); } catch { throw new Error('POST /activity/summary: invalid JSON'); }
}
