import { useCallback, useEffect, useRef, useState } from 'react';
import {
  RTVIClient,
  RTVIClientHelper,
  RTVIEvent,
  LogLevel,
} from '@pipecat-ai/client-js';
import { DailyTransport } from '@pipecat-ai/daily-transport';

// pull in the Activity reducer/context
import {
  useActivity,
  useActivityDispatch,
  ActivityActions,
} from '../context/ActivityContext';

/* ---------- small utils ---------- */
const appendLog = (setLogs) => (m) => {
  const line = `${new Date().toISOString()} - ${m}`;
  setLogs((p) => [...p, line]);
  console.log(m);
};

const attachAudioTrack = (audioRef, log) => (track) => {
  if (!audioRef.current) return;
  const ms = new MediaStream([track]);
  audioRef.current.srcObject = ms;
  audioRef.current.play().catch(() => log('Autoplay blocked — click Unmute.'));
};

/* ---------- RTVI helpers (0.3.x style) ---------- */
class SearchResponseHelper extends RTVIClientHelper {
  constructor(onMsg) { super(); this.onMsg = onMsg; }
  getMessageTypes() { return ['bot-llm-search-response']; }
  handleMessage(msg) {
    const data = msg?.data || {};
    this.onMsg?.({
      text: data.search_result,
      origins: data.origins,
      rendered: data.rendered_content,
    });
    console.log('[rtvi] LLM search message:', data);
  }
}

class LearningCluesResponseHelper extends RTVIClientHelper {
  constructor(onMsg) { super(); this.onMsg = onMsg; }
  getMessageTypes() { return ['bot-lc-activity-response']; }
  handleMessage(msg) {
    const data = msg?.data || {};
    this.onMsg?.(data);
    console.log('[rtvi] LC activity message:', data);
  }
}

/* ---------- the hook ---------- */
export function usePipecatClient(audioRef) {
  const clientRef = useRef(null);

  // local chat/transport UI state
  const [status, setStatus] = useState('disconnected'); // disconnected | connecting | ready | talking | error
  const [transportState, setTransportState] = useState('init');
  const [logs, setLogs] = useState([]);
  const log = useCallback(appendLog(setLogs), []);

  const [userTranscript, setUserTranscript] = useState([]);
  const [botTranscript, setBotTranscript] = useState([]);
  const [searchBlock, setSearchBlock] = useState(null);
  const [activityBlock, setActivityBlock] = useState(null);

  // global activity store
  const activity = useActivity();                 // read derived values
  const dispatch = useActivityDispatch();         // dispatch reducer actions

  const attach = useCallback(attachAudioTrack(audioRef, log), [audioRef, log]);

  const setupExistingTracks = useCallback(() => {
    const c = clientRef.current;
    if (!c) return;
    const tracks = c.tracks?.();
    if (tracks?.bot?.audio) attach(tracks.bot.audio);
  }, [attach]);

  // forward LC score updates to parent window (same contract as your prototype)
  const postActivityScoreUpdate = useCallback((payload) => {
    try {
      if (typeof window === 'undefined') return;
      if (window.parent === window) return; // not embedded

      const msg = {
        type: 'activity-score-update',
        state: payload?.activity_state ?? null,
        answer: payload?.activity_result ?? null,
        feedback: payload?.activity_feedback ?? null,
      };

      let targetOrigin = window.location.origin;
      try {
        if (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_PARENT_ORIGIN) {
          targetOrigin = import.meta.env.VITE_PARENT_ORIGIN;
        }
      } catch {}

      window.parent.postMessage(msg, targetOrigin);
      console.log('[rtvi] posted activity-score-update ->', targetOrigin, msg);
    } catch (e) {
      console.warn('[rtvi] postMessage failed:', e);
    }
  }, []);

  // handle LC activity messages -> reducer + keep last block for chat pane
  const handleActivityMessage = useCallback((data) => {
    if (!data) return;
    setActivityBlock({
      state: data.activity_state,
      answer: data.activity_result,
      feedback: data.activity_feedback,
      rendered: data.rendered_content,
    });

    // reducer: one high-level action that handles all activity_state cases
    dispatch(ActivityActions.ingestRtvi(data));

    // keep compatibility with parent page
    postActivityScoreUpdate(data);
  }, [dispatch, postActivityScoreUpdate]);

  // connect/disconnect using RTVIClient (0.3.x)
  const connect = useCallback(async () => {
    try {
      setStatus('connecting');

      const client = new RTVIClient({
        transport: new DailyTransport(),
        params: {
          baseUrl: import.meta.env?.VITE_RTVI_BASE_URL || 'https://server.dscovar.org',
          endpoints: { connect: '/connect' },
          requestData: {
            session_id: import.meta.env?.VITE_SESSION_ID || 'None',
            activity_id: import.meta.env?.VITE_ACTIVITY_ID || 'a5cb8d4b-5776-4947-b93d-b766533458e5',
          },
        },
        enableMic: true,
        enableCam: false,
        callbacks: {
          onConnected: () => { setStatus('ready'); log('Connected'); },
          onDisconnected: () => { setStatus('disconnected'); log('Disconnected'); },
          onTransportStateChanged: (s) => {
            setTransportState(String(s));
            log(`Transport: ${s}`);
            if (s === 'ready') setupExistingTracks();
          },
          onBotReady: () => { setStatus('talking'); log('Bot ready'); setupExistingTracks(); },
          onUserTranscript: (d) => { if (d?.final) setUserTranscript((p) => [...p, d.text]); },
          onBotTranscript: (d) => { if (d?.text) setBotTranscript((p) => [...p, d.text]); },
          onMessageError: (e) => log(`Message error: ${e?.message || e}`),
          onError: (e) => log(`Error: ${e?.message || e}`),
        },
      });

      client.setLogLevel?.(LogLevel.DEBUG);

      // register helpers that deliver app-specific payloads
      client.registerHelper('llm', new SearchResponseHelper((blk) => setSearchBlock(blk)));
      client.registerHelper('lc', new LearningCluesResponseHelper(handleActivityMessage));

      client.on(RTVIEvent.TrackStarted, (track, participant) => {
        console.log('[rtvi] track started:', track.kind, participant?.local ? 'local' : 'remote');
        if (!participant?.local && track.kind === 'audio') attach(track);
      });

      clientRef.current = client;

      log('Init devices…');
      await client.initDevices();

      log('Connecting to bot…');
      await client.connect();

      log('Connection complete');
    } catch (err) {
      setStatus('error');
      log(`Connect failed: ${err?.message || err}`);
      try { await clientRef.current?.disconnect(); } catch {}
      clientRef.current = null;
    }
  }, [attach, handleActivityMessage, log, setupExistingTracks]);

  const disconnect = useCallback(async () => {
    const c = clientRef.current;
    if (!c) return;
    try {
      await c.disconnect();
      clientRef.current = null;
      setStatus('disconnected');

      if (audioRef.current?.srcObject instanceof MediaStream) {
        audioRef.current.srcObject.getTracks().forEach((t) => t.stop());
        audioRef.current.srcObject = null;
      }

      setSearchBlock(null);
      setActivityBlock(null);

      // Optional: reset activity store if you want a clean slate per session
      // dispatch(ActivityActions.reset());

      log('Disconnected & cleaned up');
    } catch (err) {
      log(`Disconnect error: ${err?.message || err}`);
    }
  }, [audioRef, dispatch, log]);

  useEffect(() => () => { clientRef.current?.disconnect().catch(() => {}); }, []);

  /* expose the same API you had before, but rubric/score data now comes from ActivityContext */
  return {
    status,
    transportState,
    logs,
    userTranscript,
    botTranscript,
    searchBlock,
    activityBlock,

    // passthrough from ActivityContext
    rubric: activity.rubric,
    rubricWithScores: activity.rubricWithScores,
    scoresById: activity.scoresById,
    participationScore: activity.participationScore,
    participationMax: activity.participationMax,
    totalScore: activity.totalScore,
    totalMax: activity.totalMax,
    lastActivityState: activity.lastActivityState,
    timeReminder: activity.timeReminder,
    finalAssessment: activity.finalAssessment,
    submissionId: activity.submissionId,

    connect,
    disconnect,
  };
}
