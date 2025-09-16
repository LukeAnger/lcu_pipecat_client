// hooks/usePipecatClient.js
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  RTVIClient,
  RTVIClientHelper,
  RTVIEvent,
  LogLevel,
} from '@pipecat-ai/client-js';
import { DailyTransport } from '@pipecat-ai/daily-transport';

import {
  useActivity,
  useActivityDispatch,
  ActivityActions,
} from '../context/ActivityContext';

/* ---------- small utils ---------- */

/** Append ISO-timestamped lines to local log state. */
const appendLog = (setLogs) => (m) => {
  const line = `${new Date().toISOString()} - ${m}`;
  setLogs((p) => [...p, line]);
  console.log(m);
};

/** Route a remote audio track into the shared <audio> element. */
const attachAudioTrack = (audioRef, log) => (track) => {
  if (!audioRef.current) return;
  const ms = new MediaStream([track]);
  audioRef.current.srcObject = ms;
  audioRef.current.play().catch(() => log('Autoplay blocked — click Unmute.'));
};

/* ---------- RTVI helpers (message adapters) ---------- */

/** Adapts bot search responses into a renderable block for the chat UI. */
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

/** Forwards LC activity payloads into the app (reducer + preview block). */
class LearningCluesResponseHelper extends RTVIClientHelper {
  constructor(onMsg) { super(); this.onMsg = onMsg; }
  getMessageTypes() { return ['bot-lc-activity-response']; }
  handleMessage(msg) {
    const data = msg?.data || {};
    this.onMsg?.(data);
    console.log('[rtvi] LC activity message:', data);
  }
}

/* ---------- main hook ---------- */

export function usePipecatClient(audioRef) {
  const clientRef = useRef(null);

  // Transport/chat UI state
  const [status, setStatus] = useState('disconnected'); // disconnected | connecting | ready | talking | error
  const [transportState, setTransportState] = useState('init');
  const [logs, setLogs] = useState([]);
  const log = useCallback(appendLog(setLogs), []);

  const [userTranscript, setUserTranscript] = useState([]);
  const [botTranscript, setBotTranscript] = useState([]);
  const [searchBlock, setSearchBlock] = useState(null);
  const [activityBlock, setActivityBlock] = useState(null);

  // Activity store (rubric, scores, etc.)
  const activity = useActivity();
  const dispatch = useActivityDispatch();

  const attach = useCallback(attachAudioTrack(audioRef, log), [audioRef, log]);

  /** Attach any already-started remote tracks after reconnects. */
  const setupExistingTracks = useCallback(() => {
    const c = clientRef.current;
    if (!c) return;
    const tracks = c.tracks?.();
    if (tracks?.bot?.audio) attach(tracks.bot.audio);
  }, [attach]);

  /**
   * Mirror score updates to an embedding parent (iframe scenario),
   * using the same message shape as the legacy prototype.
   */
  const postActivityScoreUpdate = useCallback((payload) => {
    try {
      if (typeof window === 'undefined') return;
      if (window.parent === window) return;

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
      } catch { }

      window.parent.postMessage(msg, targetOrigin);
      console.log('[rtvi] posted activity-score-update ->', targetOrigin, msg);
    } catch (e) {
      console.warn('[rtvi] postMessage failed:', e);
    }
  }, []);

  /** Handle LC messages: update ActivityContext and reflect last block in chat. */
  const handleActivityMessage = useCallback((data) => {
    if (!data) return;
    setActivityBlock({
      state: data.activity_state,
      answer: data.activity_result,
      feedback: data.activity_feedback,
      rendered: data.rendered_content,
    });
    dispatch(ActivityActions.ingestRtvi(data));
    postActivityScoreUpdate(data);
  }, [dispatch, postActivityScoreUpdate]);

  /* ----- connect / disconnect ----- */

  /**
   * Open a new RTVI session.
   * - Sets up helpers, event listeners, devices, and transport.
   * - Streams remote audio into audioRef.
   */
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

      // App-specific payloads
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
      try { await clientRef.current?.disconnect(); } catch { }
      clientRef.current = null;
    }
  }, [attach, handleActivityMessage, log, setupExistingTracks]);

  /**
   * Close the session and release resources.
   * - Stops remote audio tracks and clears chat blocks.
   */
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
      // Optionally: dispatch(ActivityActions.reset());

      log('Disconnected & cleaned up');
    } catch (err) {
      log(`Disconnect error: ${err?.message || err}`);
    }
  }, [audioRef, dispatch, log]);

  // Ensure transport is torn down on unmount.
  useEffect(() => () => { clientRef.current?.disconnect().catch(() => { }); }, []);

  /* ---------- public shape ---------- */
  return {
    // transport/chat
    status,
    transportState,
    logs,
    userTranscript,
    botTranscript,
    searchBlock,
    activityBlock,

    // derived activity data (mirrors ActivityContext)
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

    // controls
    connect,
    disconnect,
  };
}
