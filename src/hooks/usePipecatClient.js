// client/src/hooks/usePipecatClient.js
import { useCallback, useEffect, useRef, useState } from 'react';
import { PipecatClient, RTVIEvent } from '@pipecat-ai/client-js';
import { DailyTransport } from '@pipecat-ai/daily-transport';

export function usePipecatClient(audioRef) {
  const clientRef = useRef(null);

  const [status, setStatus] = useState('disconnected'); // disconnected | connecting | ready | talking | error
  const [transportState, setTransportState] = useState('init');
  const [logs, setLogs] = useState([]);
  const [userTranscript, setUserTranscript] = useState([]);
  const [botTranscript, setBotTranscript] = useState([]);
  const [searchBlock, setSearchBlock] = useState(null);

  const log = useCallback((m) => {
    const line = `${new Date().toISOString()} - ${m}`;
    setLogs((prev) => [...prev, line]);
    console.log(m);
  }, []);

  const attachAudioTrack = useCallback((track) => {
    if (!audioRef.current) return;
    const ms = new MediaStream([track]);
    audioRef.current.srcObject = ms;
    audioRef.current.play().catch(() => {
      log('Autoplay blocked — click Unmute.');
    });
  }, [audioRef, log]);

  const setupExistingTracks = useCallback(() => {
    const c = clientRef.current;
    if (!c) return;
    const tracks = c.tracks();
    if (tracks.bot?.audio) attachAudioTrack(tracks.bot.audio);
  }, [attachAudioTrack]);

  const connect = useCallback(async () => {
    try {
      setStatus('connecting');
      const client = new PipecatClient({
        transport: new DailyTransport({ bufferLocalAudioUntilBotReady: true }),
        enableMic: true,
        enableCam: false,
        callbacks: {
          onConnected: () => { setStatus('ready'); log('Connected'); },
          onDisconnected: () => { setStatus('disconnected'); log('Disconnected'); },
          onTransportStateChanged: (s) => { setTransportState(String(s)); log(`Transport: ${s}`); if (s === 'ready') setupExistingTracks(); },
          onBotReady: () => { setStatus('talking'); log('Bot ready'); setupExistingTracks(); },
          onUserTranscript: (d) => { if (d?.final) setUserTranscript((p) => [...p, d.text]); },
          onBotTranscript:  (d) => { if (d?.text) setBotTranscript((p) => [...p, d.text]); },
          onBotLlmSearchResponse: (resp) => {
            setSearchBlock({
              text: resp?.search_result,
              origins: resp?.origins,
              rendered: resp?.rendered_content,
            });
          },
          onMessageError: (e) => log(`Message error: ${e?.message || e}`),
          onError: (e) => log(`Error: ${e?.message || e}`),
        },
      });

      client.on(RTVIEvent.TrackStarted, (track, participant) => {
        if (!participant?.local && track.kind === 'audio') attachAudioTrack(track);
      });

      clientRef.current = client;

      log('Init devices…');
      await client.initDevices();

      const endpoint = import.meta.env.VITE_CONNECT_URL || '/connect';
      log(`Connecting to ${endpoint} …`);
      await client.startBotAndConnect({ endpoint });

      log('Connection complete');
    } catch (err) {
      setStatus('error');
      log(`Connect failed: ${err?.message || err}`);
      try { await clientRef.current?.disconnect(); } catch {}
      clientRef.current = null;
    }
  }, [attachAudioTrack, log, setupExistingTracks]);

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
      log('Disconnected & cleaned up');
    } catch (err) { log(`Disconnect error: ${err?.message || err}`); }
  }, [audioRef, log]);

  useEffect(() => () => { clientRef.current?.disconnect().catch(() => {}); }, []);

  return { status, transportState, logs, userTranscript, botTranscript, searchBlock, connect, disconnect };
}
