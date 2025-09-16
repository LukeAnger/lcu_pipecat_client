//src/components/home/Chat.jsx
// Conversation UI: messages, hint tab, composer, and transport status.
// Consumes RTVI/Pipecat props from parent and renders an audio stream.

import { useEffect, useMemo, useRef, useState } from "react";
import "./Chat.css";

// Merge parallel user/bot arrays into a single ordered list
const interleave = (user = [], bot = []) => {
    const out = [];
    const n = Math.max(user.length, bot.length);
    for (let i = 0; i < n; i++) {
        if (i < user.length) out.push({ role: "user", text: user[i] });
        if (i < bot.length) out.push({ role: "bot", text: bot[i] });
    }
    return out;
};

// Connection heuristics shared by status and transport
const ONLINE_STATUSES = new Set([
    "connected", "ready", "active", "listening", "speaking",
    "streaming", "running", "open", "ok",
]);
const OFFLINE_STATUSES = new Set([
    "disconnected", "not connected", "closed", "error", "failed",
]);

/**
 * Props:
 * - status, transportState, logs
 * - userTranscript[], botTranscript[]
 * - searchBlock, activityBlock
 * - connect(), disconnect()
 * - audioRef, unmuted, setUnmuted()
 * - showRight?, openRight?      // optional split-pane affordance
 */
const Chat = ({
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
}) => {
    // Tabs and input mode
    const [tab, setTab] = useState("conversation"); // conversation | hints
    const [mode, setMode] = useState("type");       // type | speak
    const [everConnected, setEverConnected] = useState(false);

    // Build visible message stream
    const messages = useMemo(
        () => interleave(userTranscript, botTranscript),
        [userTranscript, botTranscript]
    );

    // Auto-scroll to latest message and when switching tabs
    const endRef = useRef(null);
    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [messages.length, tab]);

    // Normalize connection state from both status channels
    const s = String(status || "").toLowerCase();
    const t = String(transportState || "").toLowerCase();
    const connectedNow = ONLINE_STATUSES.has(s) || ONLINE_STATUSES.has(t);
    const explicitlyOffline = OFFLINE_STATUSES.has(s) && OFFLINE_STATUSES.has(t);

    // Remember that a session was connected at least once
    useEffect(() => {
        if (connectedNow) setEverConnected(true);
    }, [connectedNow]);

    // Keep UI "connected" unless both channels are explicitly offline
    const uiConnected = connectedNow || (!explicitlyOffline && everConnected);

    // Kick audio playback (browser autoplay guard)
    const handleUnmute = () => {
        if (!audioRef?.current) return;
        audioRef.current.play().then(() => setUnmuted?.(true)).catch(() => { });
    };

    // Input mode switches
    const switchToSpeak = () => { handleUnmute(); setMode("speak"); };
    const switchToType = () => setMode("type");

    return (
        <div className="chat">
            {/* Section header with optional link to open the right pane */}
            <div className="chat__sectionbar">
                <h3 className="chat__sectiontitle">Conversation</h3>
                {showRight === false && (
                    <button className="chat__link" onClick={openRight}>
                        Show Score Breakdown »
                    </button>
                )}
            </div>

            <div className="chat__card">
                {/* Top tabs and status */}
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

                {/* Body: messages or empty-state; sticky composer when connected */}
                {tab === "conversation" ? (
                    <div className="chat__body" role="tabpanel" aria-labelledby="tab-conversation">
                        {!uiConnected && !everConnected && messages.length === 0 ? (
                            // First-time empty state
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
                                {/* Transcript */}
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

                                    {/* Optional search/rendered block from RTVI helper */}
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

                                {/* Composer (only while UI is connected) */}
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
                    // Hints tab placeholder
                    <div className="chat__body chat__body--hints" role="tabpanel" aria-labelledby="tab-hints">
                        <div className="chat__hints-empty">Hints will appear here when available.</div>
                    </div>
                )}

                {/* Bottom transport row */}
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

            {/* Audio element for remote bot stream */}
            <audio id="bot-audio" ref={audioRef} autoPlay playsInline />
        </div>
    );
}

export default Chat;