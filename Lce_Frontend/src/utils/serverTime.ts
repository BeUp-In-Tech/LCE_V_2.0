
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

let timeOffsetMs = 0;
let initialized = false;

export const getServerNow = (): Date => {
    return new Date(Date.now() + timeOffsetMs);
};

export const isTimeSynced = (): boolean => initialized;

export const initServerTime = async (): Promise<void> => {
    try {
        const beforeMs = Date.now();
        const response = await fetch(`${API_BASE_URL}/server-time`);
        const afterMs = Date.now();

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const serverTimestampMs = data.timestamp * 1000; 

        
        const networkLatencyMs = (afterMs - beforeMs) / 2;
        const browserTimeAtServerResponse = beforeMs + networkLatencyMs;

        timeOffsetMs = serverTimestampMs - browserTimeAtServerResponse;
        initialized = true;

        console.log(`[ServerTime] Synced. Offset: ${timeOffsetMs}ms (${(timeOffsetMs / 1000).toFixed(1)}s)`);
    } catch (error) {
        console.warn('[ServerTime] Failed to sync, using browser clock as fallback:', error);
        timeOffsetMs = 0;
        initialized = false;
    }
};
