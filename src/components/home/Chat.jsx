import { useEffect, useMemo, useRef, useState } from "react";
import "./Chat.css";

const interleave = (user = [], bot = []) => {
  const out = [];
  const n = Math.max(user.length, bot.length);
  for (let i = 0; i < n; i++) {
    if (i < user.length) out.push({ role: "user", text: user[i] });
    if (i < bot.length) out.push({ role: "bot", text: bot[i] });
  }
  return out;
};

/** Treat these values as ONLINE/OFFLINE for both status and transport */
const ONLINE_STATUSES = new Set([
  "connected",
  "ready",
  "active",
  "listening",
  "speaking",
  "streaming",
  "running",
  "open",
  "ok",
]);

const OFFLINE_STATUSES = new Set([
  "disconnected",
  "not connected",
  "closed",
  "error",
  "failed",
]);

export default function Chat({
  status,
  transportState,
  logs,
  userTranscript,
  botTranscript,
  searchBlock,
  activityBlock,
  connect,
  disconnect,
  audioRef,
  unmuted,
  setUnmuted,
  showRight,
  openRight,
}) {
  const [tab, setTab] = useState("conversation"); // conversation | hints
  const [mode, setMode] = useState("type");       // 'type' | 'speak' — default to keyboard so controls are visible
  const [everConnected, setEverConnected] = useState(false);

  const messages = useMemo(
    () => interleave(userTranscript, botTranscript),
    [userTranscript, botTranscript]
  );

  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, tab]);

  const s = String(status || "").toLowerCase();
  const t = String(transportState || "").toLowerCase();

  // Determine connectivity robustly:
  const connectedNow = ONLINE_STATUSES.has(s) || ONLINE_STATUSES.has(t);
  const explicitlyOffline = OFFLINE_STATUSES.has(s) && OFFLINE_STATUSES.has(t);

  // Remember if we were connected at least once this session.
  useEffect(() => {
    if (connectedNow) setEverConnected(true);
  }, [connectedNow]);

  // UI should remain "connected" unless both channels are explicitly offline.
  const uiConnected = connectedNow || (!explicitlyOffline && everConnected);

  const handleUnmute = () => {
    if (!audioRef?.current) return;
    audioRef.current.play().then(() => setUnmuted?.(true)).catch(() => {});
  };

  const switchToSpeak = () => {
    handleUnmute();
    setMode("speak");
  };
  const switchToType = () => setMode("type");

  return (
    <div className="chat">
      <div className="chat__sectionbar">
        <h3 className="chat__sectiontitle">Conversation</h3>
        {showRight === false && (
          <button className="chat__link" onClick={openRight}>
            Show Score Breakdown »
          </button>
        )}
      </div>

      <div className="chat__card">
        {/* Tabs row */}
        <div className="chat__tabs">
          <button
            className={`chat__tab ${tab === "conversation" ? "chat__tab--active" : ""}`}
            onClick={() => setTab("conversation")}
            role="tab"
            aria-selected={tab === "conversation"}
            id="tab-conversation"
          >
            Conversation
          </button>
          <button
            className={`chat__tab ${tab === "hints" ? "chat__tab--active" : ""}`}
            onClick={() => setTab("hints")}
            role="tab"
            aria-selected={tab === "hints"}
            id="tab-hints"
          >
            Hints
          </button>

          <div className="chat__spacer" />

          <div className="chat__statusbar">
            <span className="chat__statustext">
              Status: {uiConnected ? "Connected" : "Not Connected"}
            </span>
            <button
              type="button"
              className="chat__hintbtn"
              disabled={!uiConnected || tab !== "conversation"}
              title="Request a hint"
            >
              Get Hint <span className="chat__hintbulb" aria-hidden>💡</span>
            </button>
          </div>
        </div>

        {/* ===== BODY ===== */}
        {tab === "conversation" ? (
          <div className="chat__body" role="tabpanel" aria-labelledby="tab-conversation">
            {/* Empty state (never connected yet) */}
            {!uiConnected && !everConnected && messages.length === 0 ? (
              <div className="chat__emptybox">
                <div className="chat__emptystate">
                  <div className="chat__emptytitle">Status: Not Connected</div>
                  <div className="chat__emptyhint">
                    Click the Start button to start the conversation
                  </div>
                  <button className="btn btn--primary" onClick={connect}>Start</button>
                </div>
              </div>
            ) : (
              <>
                {/* Messages */}
                <div
                  className="chat__messages"
                  id="chat-scroll"
                  role="log"
                  aria-live="polite"
                  aria-relevant="additions"
                >
                  {messages.map((m, i) => (
                    <div key={i} className={`msg ${m.role === "user" ? "msg--user" : "msg--bot"}`}>
                      <div className="msg__bubble">{m.text}</div>
                    </div>
                  ))}

                  {/* Optional search/rendered block */}
                  {searchBlock && (
                    <div className="msg msg--bot">
                      <div className="msg__bubble">
                        <div className="chat__search">
                          {searchBlock.text && (
                            <div className="chat__searchtext">{searchBlock.text}</div>
                          )}
                          {Array.isArray(searchBlock.origins) && searchBlock.origins.length > 0 && (
                            <div className="chat__sources">
                              <div className="chat__sourcestitle">Sources</div>
                              <div className="chat__sourcelinks">
                                {searchBlock.origins.map((o, i) => (
                                  <a
                                    key={i}
                                    className="chat__sourcelink"
                                    href={o.site_uri}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    {o.site_title || o.site_uri}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                          {searchBlock.rendered && (
                            <iframe className="chat__iframe" title="rendered" srcDoc={searchBlock.rendered} />
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={endRef} />
                </div>

                {/* Composer (stays mounted unless both status & transport are offline) */}
                {uiConnected && (
                  <div className="chat__composer">
                    {mode === "type" ? (
                      <>
                        <input
                          className="chat__input"
                          placeholder="Type your answer"
                          aria-label="Type your answer"
                        />
                        <div className="chat__composerBtns">
                          <button
                            type="button"
                            className="chat__modebtn"
                            onClick={switchToSpeak}
                            disabled={!audioRef?.current}
                            title={unmuted ? "Speak" : "Enable audio"}
                          >
                            Speak <span className="chat__mic" aria-hidden>🎤</span>
                          </button>
                          <button
                            type="button"
                            className="chat__kbdbtn chat__kbdbtn--active"
                            onClick={switchToType}
                            title="Keyboard input"
                          >
                            ⌨️
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="chat__speakwrap">
                        <button
                          type="button"
                          className="chat__speakcircle"
                          onClick={switchToType}
                          title="Switch to keyboard"
                        >
                          ⌨️
                        </button>
                        <div className="chat__speakfield">
                          <span>Speaking…</span>
                          <span className="chat__mic" aria-hidden>🎤</span>
                        </div>
                        <button
                          type="button"
                          className="chat__modebtn"
                          onClick={switchToSpeak}
                          disabled={!audioRef?.current}
                        >
                          Speak
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="chat__body chat__body--hints" role="tabpanel" aria-labelledby="tab-hints">
            <div className="chat__hints-empty">Hints will appear here when available.</div>
          </div>
        )}

        {/* Bottom transport row (shows while UI is connected) */}
        {uiConnected && (
          <div className="chat__transport">
            <div className="chat__pills">
              <span className="pill pill--ok">Connected</span>
              <span className="pill pill--ghost">{transportState}</span>
              {!unmuted && (
                <button className="pill pill--action" onClick={switchToSpeak}>
                  Unmute
                </button>
              )}
            </div>
            <div className="chat__actions">
              <button className="btn" onClick={disconnect}>Disconnect</button>
            </div>
          </div>
        )}
      </div>

      {/* keep audio in the component */}
      <audio id="bot-audio" ref={audioRef} autoPlay playsInline />
    </div>
  );
}
