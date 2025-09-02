// client/src/App.jsx
import { useRef, useState } from 'react';
import { usePipecatClient } from './hooks/usePipecatClient';

export default function App() {
  const audioRef = useRef(null);
  const {
    status, transportState, logs,
    userTranscript, botTranscript, searchBlock,
    connect, disconnect
  } = usePipecatClient(audioRef);

  const [unmuted, setUnmuted] = useState(false);

  return (
    <div className="container">
      <div className="status-bar">
        <div className="status">
          Status: <span id="connection-status">{status} ({transportState})</span>
        </div>
        <div className="controls">
          {(status === 'disconnected' || status === 'error') ? (
            <button id="connect-btn" onClick={connect}>Connect</button>
          ) : (
            <button id="disconnect-btn" onClick={disconnect}>Disconnect</button>
          )}
          <button
            onClick={() => audioRef.current?.play().then(() => setUnmuted(true))}
            disabled={!audioRef.current}
            title="Fix autoplay if blocked"
          >
            {unmuted ? 'Audio OK' : 'Unmute'}
          </button>
        </div>
      </div>

      <div className="main-content">
        <div className="bot-container">
          <div id="search-result-container">
            {!searchBlock ? (
              <p className="muted">No search results yet.</p>
            ) : (
              <div className="content-container">
                {searchBlock.text && <div className="search-result">{searchBlock.text}</div>}
                {searchBlock.origins && (
                  <div className="sources">
                    <h3 className="sources-title">Sources:</h3>
                    {searchBlock.origins.map((o, i) => (
                      <a key={i} className="source-link" href={o.site_uri} target="_blank" rel="noreferrer">
                        {o.site_title}
                      </a>
                    ))}
                  </div>
                )}
                {searchBlock.rendered && (
                  <iframe className="iframe-container" title="rendered" srcDoc={searchBlock.rendered} />
                )}
              </div>
            )}
          </div>

          {/* transcripts (optional) */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12, width:'100%', marginTop:16}}>
            <div>
              <h3>You</h3>
              <ul>{userTranscript.map((t,i)=><li key={i}>{t}</li>)}</ul>
            </div>
            <div>
              <h3>Bot</h3>
              <ul>{botTranscript.map((t,i)=><li key={i}>{t}</li>)}</ul>
            </div>
          </div>

          {/* inline audio element the bot plays into */}
          <audio id="bot-audio" ref={audioRef} autoPlay playsInline />
        </div>
      </div>

      <div className="debug-panel">
        <h3>Debug Info</h3>
        <div id="debug-log">
          {logs.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>
    </div>
  );
}
