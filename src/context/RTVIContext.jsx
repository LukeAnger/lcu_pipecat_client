// context/RTVIContext.jsx
import { createContext, useContext, useMemo, useRef } from "react";
import { usePipecatClient } from "../hooks/usePipecatClient";

/**
 * Thin wrapper around usePipecatClient.
 * - Creates a shared <audio> ref for bot output.
 * - Exposes the hook result + audioRef via context.
 */
const RtviContext = createContext(null);

export function RtviProvider({ children }) {
    const audioRef = useRef(null);
    const client = usePipecatClient(audioRef);

    // Stable object for consumers; re-computes only when client state changes.
    const value = useMemo(() => ({ audioRef, ...client }), [client]);

    return (
        <RtviContext.Provider value={value}>
            {children}
        </RtviContext.Provider>
    );
}

/** Access RTVI client state/methods anywhere below <RtviProvider>. */
export function useRtvi() {
    const ctx = useContext(RtviContext);
    if (!ctx) throw new Error("useRtvi must be used within a RtviProvider");
    return ctx;
}
