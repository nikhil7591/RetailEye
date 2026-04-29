import { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, Save, Trash2, Server, Database, Activity, Sliders } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { clearAllHistory } from "../services/api";
import { cn } from "../lib/utils";

export function Settings() {
  const [storeName, setStoreName]       = useState("RetailEye Store 001");
  const [storeId, setStoreId]           = useState("store_001");
  const [critThreshold, setCritThreshold] = useState(40);
  const [warnThreshold, setWarnThreshold] = useState(70);
  const [saved, setSaved]               = useState(false);
  const [clearing, setClearing]         = useState(false);
  const [clearMsg, setClearMsg]         = useState(null);
  const [backendStatus, setBackendStatus] = useState("checking"); // checking | online | offline

  useEffect(() => {
    fetch("http://localhost:8000/health")
      .then(r => r.ok ? setBackendStatus("online") : setBackendStatus("offline"))
      .catch(() => setBackendStatus("offline"));
  }, []);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearHistory = async () => {
    if (!confirm("This will permanently delete ALL analyses from the database. Are you sure?")) return;
    setClearing(true);
    try {
      const res = await clearAllHistory();
      setClearMsg(`Cleared ${res.deleted_count} analyses from database.`);
      setTimeout(() => setClearMsg(null), 4000);
    } catch (e) {
      setClearMsg("Error: " + e.message);
    } finally {
      setClearing(false);
    }
  };

  const InputField = ({ label, value, onChange, description, type = "text", ...props }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wide">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-[#E2E8F0] px-4 text-sm text-[#0F172A] font-medium focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10 transition-all bg-white"
        {...props}
      />
      {description && <p className="text-[10px] text-[#94A3B8]">{description}</p>}
    </div>
  );

  const StatusDot = ({ status }) => (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2.5 w-2.5">
        {status === "online" && <span className="animate-ping absolute h-full w-full rounded-full bg-[#22C55E] opacity-75" />}
        <span className={cn(
          "relative h-2.5 w-2.5 rounded-full",
          status === "online" ? "bg-[#22C55E]" : status === "checking" ? "bg-[#F59E0B]" : "bg-[#EF4444]"
        )} />
      </span>
      <span className={cn(
        "text-xs font-bold",
        status === "online" ? "text-[#22C55E]" : status === "checking" ? "text-[#F59E0B]" : "text-[#EF4444]"
      )}>
        {status === "online" ? "Connected" : status === "checking" ? "Checking..." : "Offline"}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 pb-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Settings</h1>
        <p className="text-sm text-[#64748B] mt-1">Configure RetailEye behaviour and preferences</p>
      </div>

      {/* Store Configuration */}
      <Card className="border-[#E2E8F0]">
        <CardHeader className="py-4 border-b border-[#E2E8F0]">
          <CardTitle className="text-[12px] font-bold tracking-wider text-[#0F172A] uppercase flex items-center gap-2">
            <Database className="h-4 w-4 text-[#4F46E5]" />
            Store Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-5">
            <InputField label="Store Name" value={storeName} onChange={setStoreName} description="Display name for your store" />
            <InputField label="Store ID" value={storeId} onChange={setStoreId} description="Unique identifier used in reports" />
          </div>
          <Button
            onClick={handleSave}
            className={cn(
              "w-fit gap-2 transition-all",
              saved ? "bg-[#22C55E] hover:bg-[#16A34A]" : "bg-[#4F46E5] hover:bg-[#4338CA]"
            )}
          >
            {saved ? <><CheckCircle2 className="h-4 w-4" /> Saved!</> : <><Save className="h-4 w-4" /> Save Changes</>}
          </Button>
        </CardContent>
      </Card>

      {/* Alert Thresholds */}
      <Card className="border-[#E2E8F0]">
        <CardHeader className="py-4 border-b border-[#E2E8F0]">
          <CardTitle className="text-[12px] font-bold tracking-wider text-[#0F172A] uppercase flex items-center gap-2">
            <Sliders className="h-4 w-4 text-[#F59E0B]" />
            Alert Thresholds
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-8">
            {/* Warning */}
            <div className="p-4 rounded-xl bg-[#FFFBEB] border border-[#FCD34D]/30">
              <div className="flex items-center justify-between mb-3">
                <label className="text-[11px] font-bold text-[#D97706] uppercase tracking-wide">Warning</label>
                <span className="text-lg font-bold text-[#D97706]">{warnThreshold}%</span>
              </div>
              <input
                type="range" min="10" max="90" value={warnThreshold}
                onChange={e => setWarnThreshold(Number(e.target.value))}
                className="w-full h-2 rounded-full accent-[#F59E0B] cursor-pointer"
              />
              <p className="text-[10px] text-[#D97706]/70 mt-2">Rows below this occupancy trigger a warning</p>
            </div>

            {/* Critical */}
            <div className="p-4 rounded-xl bg-[#FFF5F5] border border-[#FCA5A5]/30">
              <div className="flex items-center justify-between mb-3">
                <label className="text-[11px] font-bold text-[#DC2626] uppercase tracking-wide">Critical</label>
                <span className="text-lg font-bold text-[#DC2626]">{critThreshold}%</span>
              </div>
              <input
                type="range" min="5" max="60" value={critThreshold}
                onChange={e => setCritThreshold(Number(e.target.value))}
                className="w-full h-2 rounded-full accent-[#EF4444] cursor-pointer"
              />
              <p className="text-[10px] text-[#DC2626]/70 mt-2">Rows below this occupancy trigger a critical alert</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card className="border-[#E2E8F0]">
        <CardHeader className="py-4 border-b border-[#E2E8F0]">
          <CardTitle className="text-[12px] font-bold tracking-wider text-[#0F172A] uppercase flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#22C55E]" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 flex flex-col gap-3">
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#C7D2FE] transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-[#EEF2FF] flex items-center justify-center">
                <Server className="h-4 w-4 text-[#4F46E5]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#334155]">Backend Server</p>
                <p className="text-xs text-[#94A3B8] mt-0.5">http://localhost:8000</p>
              </div>
            </div>
            <StatusDot status={backendStatus} />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#C7D2FE] transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-[#F0FDF4] flex items-center justify-center">
                <Database className="h-4 w-4 text-[#22C55E]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#334155]">Database</p>
                <p className="text-xs text-[#94A3B8] mt-0.5">MongoDB · retaileye</p>
              </div>
            </div>
            <StatusDot status={backendStatus} />
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-[#FCA5A5]/50">
        <CardHeader className="py-4 border-b border-[#FCA5A5]/30">
          <CardTitle className="text-[12px] font-bold tracking-wider uppercase text-[#DC2626] flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#FFF5F5] border border-[#FCA5A5]/30">
            <div>
              <p className="text-sm font-semibold text-[#0F172A]">Clear All Analysis History</p>
              <p className="text-xs text-[#64748B] mt-0.5">Permanently deletes all analysis records from the database</p>
            </div>
            <Button
              onClick={handleClearHistory}
              disabled={clearing}
              className="gap-2 bg-[#EF4444] hover:bg-[#DC2626] text-white shrink-0"
            >
              {clearing ? "Clearing..." : <><Trash2 className="h-4 w-4" /> Clear History</>}
            </Button>
          </div>
          {clearMsg && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[#FEE2E2] border border-[#FCA5A5] mt-3">
              <AlertCircle className="h-4 w-4 text-[#EF4444] shrink-0" />
              <p className="text-xs text-[#DC2626] font-medium">{clearMsg}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
