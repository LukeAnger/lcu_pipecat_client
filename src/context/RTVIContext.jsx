import { createContext, useContext, useMemo, useRef } from "react";
import { usePipecatClient } from "../hooks/usePipecatClient";

/**
 * RtviContext exposes everything returned by usePipecatClient,
 * plus the shared audioRef you pass into that hook.
 */
const RtviContext = createContext(null);

export function RtviProvider({ children }) {
    const audioRef = useRef(null);
    const client = usePipecatClient(audioRef);

    const value = useMemo(() => ({ audioRef, ...client }), [client]);

    return (
        <RtviContext.Provider value={value}>
            {children}
        </RtviContext.Provider>
    );
}

/** Consume RTVI state anywhere in the app */
export function useRtvi() {
    const ctx = useContext(RtviContext);
    if (!ctx) {
        throw new Error("useRtvi must be used within a RtviProvider");
    }
    return ctx;
}
