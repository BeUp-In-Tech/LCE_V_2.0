import { useState, useEffect } from "react";
import { utilityAPI } from "../../services/api";
import { getPTDate, addBusinessDays } from "../../utils/dateHelpers";
import { Clock, Server, Monitor, Globe, Activity } from "lucide-react";

interface ServerTimeResponse {
    iso: string;
    formatted: string;
    timezone: string;
    timestamp: number;
}

const TimezoneDiagnostic = () => {
    const [serverData, setServerData] = useState<ServerTimeResponse | null>(null);
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        
        const interval = setInterval(() => setNow(new Date()), 1000);
        
        
        utilityAPI.getServerTime()
            .then((res) => setServerData(res.data))
            .catch((err: unknown) => console.error("Failed to fetch server time diagnostic", err));

        return () => clearInterval(interval);
    }, []);

    
    const localSystemTime = now.toString();
    
    
    const browserJSTime = now.toLocaleString();
    
    
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    
    const utcTime = now.toISOString();
    
    
    const unixTimestamp = now.getTime();
    
    
    const utcOffset = now.getTimezoneOffset(); 
    
    
    const year = now.getFullYear();
    const janOffset = new Date(year, 0, 1).getTimezoneOffset();
    const julOffset = new Date(year, 6, 1).getTimezoneOffset();
    const hasDST = janOffset !== julOffset;
    const isCurrentlyDST = now.getTimezoneOffset() < Math.max(janOffset, julOffset);
    
    
    const browserLocale = navigator.language;
    
    
    const testISO = "2026-03-10T12:00:00Z";
    const parsedISO = new Date(testISO).toLocaleString();
    
    
    

    
    const caliConversion = new Date(testISO).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
    
    
    if (serverData?.timestamp) {
        const diff = Math.abs(unixTimestamp - (serverData.timestamp * 1000));
        let timeDiffMs = `${diff.toLocaleString()} ms difference`;
        let latencyStatus = diff > 5000 ? "text-red-600" : "text-emerald-600";
        
        console.log(`Diagnostic: Time Diff: ${timeDiffMs}, Status: ${latencyStatus}`);
    }
    
    
    const tzMatch = serverData?.timezone === browserTimezone;
    
    
    const formatCheckPattern = serverData?.iso ? (serverData.iso.includes('T') ? "Valid (ISO-8601)" : "Invalid") : "Waiting...";
    
    
    
    const ptDateCheck = getPTDate().toString();
    
    
    
    const tzExpected = new Date().toLocaleString('en-US', { timeZoneName: 'short' });

    
    const overrideTokyo = now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' });
    
    
    
    const futureDate = addBusinessDays(getPTDate(), 5).toDateString();
    
    
    
    const pastDate = new Date(1700000000000).toLocaleString(); 
    
    
    const midnightTest = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    midnightTest.setSeconds(midnightTest.getSeconds() + 2); 
    const rolloverSuccess = midnightTest.getDate() !== now.getDate();

    return (
        <div className="mt-12 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100 overflow-hidden w-full transition-all duration-300">
            {}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-blue-500/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-blue-400/30">
                        <Activity className="text-blue-400" size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white tracking-tight">System Timezone Telemetry</h2>
                   
                    </div>
                </div>
                
            </div>
            
            <div className="p-6">
                {}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    {}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                            <Monitor className="text-[#00A7EE]" size={16} />
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Browser Context</h3>
                        </div>
                        <DiagnosticItem label="1. OS Native Clock" value={localSystemTime} />
                        <DiagnosticItem label="2. JS Interp Time" value={browserJSTime} />
                        <DiagnosticItem label="3. JS IANA Timezone" value={browserTimezone} />
                        <DiagnosticItem label="8. Browser Locale" value={browserLocale} />
                        <DiagnosticItem label="16. Detected Abbr" value={tzExpected.split(' ').pop() || 'Unknown'} />
                    </div>

                    {}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                            <Globe className="text-[#00A7EE]" size={16} />
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Global Standards</h3>
                        </div>
                        <DiagnosticItem label="4. Absolute UTC" value={utcTime} />
                        <DiagnosticItem label="5. Unix Epoch" value={unixTimestamp.toString() + " ms"} />
                        <DiagnosticItem label="6. Base Offset" value={`${utcOffset > 0 ? '-' : '+'}${Math.abs(utcOffset / 60)} hours`} />
                        <DiagnosticItem label="7. Daylight Saving" value={hasDST ? (isCurrentlyDST ? "Yes (Active)" : "Yes (Inactive)") : "No DST in region"} />
                        <DiagnosticItem label="17. Tokyo Override" value={overrideTokyo} />
                    </div>

                    {}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                            <Server className="text-[#00A7EE]" size={16} />
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Server Pipeline</h3>
                        </div>
                        <DiagnosticItem label="12. Pipeline Match" value={tzMatch ? "Tolerant (Perfect Sync)" : `${browserTimezone} vs ${serverData?.timezone || '??'}`} valueColor={tzMatch ? 'text-emerald-600' : 'text-amber-600'} />
                        <DiagnosticItem label="13. API Format" value={formatCheckPattern} />
                        <DiagnosticItem label="9 & 10. Local Parsing" value={parsedISO} />
                        <DiagnosticItem label="11. PT Translation" value={caliConversion} />
                    </div>

                    {}
                    <div className="space-y-4 md:col-span-2 lg:col-span-3">
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100 mt-2">
                            <Clock className="text-[#00A7EE]" size={16} />
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Business Logic Integrations</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <DiagnosticItem label="14. getPTDate() Core" value={ptDateCheck.split(' GMT')[0]} />
                            <DiagnosticItem label="18. +5 Biz Days Rule" value={futureDate} />
                            <DiagnosticItem label="19. Static Historical" value={pastDate} />
                            <DiagnosticItem 
                                label="20. Midnight Rollover" 
                                value={rolloverSuccess ? "Passed (+2s = New Day)" : "Failed"} 
                                valueColor={rolloverSuccess ? 'text-emerald-600' : 'text-red-600'}
                            />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

const DiagnosticItem = ({ label, value, valueColor = "text-slate-800" }: { label: string, value: string, valueColor?: string }) => (
    <div className="bg-slate-50 hover:bg-blue-50/50 transition-colors rounded-xl p-3 border border-slate-100 flex flex-col justify-center w-full">
        <span className="text-[10px] sm:text-xs font-bold text-slate-400 tracking-wider mb-1 uppercase">
            {label}
        </span>
        <span className={`text-sm sm:text-[15px] font-semibold leading-tight break-words ${valueColor}`}>
            {value}
        </span>
    </div>
);

export default TimezoneDiagnostic;
