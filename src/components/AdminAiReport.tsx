import React, { useState } from "react";
import { adminAiService, AppointmentData } from "../services/adminAiService";

interface AdminAiReportProps {
  appointments?: AppointmentData[];
  targetDate?: string;
}

export const AdminAiReport: React.FC<AdminAiReportProps> = ({ 
  appointments = [], 
  targetDate = new Date().toISOString().split('T')[0] 
}) => {
  const [report, setReport] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // If no appointments are passed via props, fallback to sample mock data to test the engine
      const dataToAnalyze = appointments.length > 0 ? appointments : [
        { id: "1", clientName: "Walk-in Client", serviceName: "Skin Fade & Beard", price: 250, timeSlot: "09:00", status: "completed", isReturningClient: true },
        { id: "2", clientName: "Sipho M.", serviceName: "Premium Scissor Cut", price: 200, timeSlot: "11:30", status: "booked", isReturningClient: false },
        { id: "3", clientName: "David K.", serviceName: "Classic Haircut", price: 150, timeSlot: "14:00", status: "completed", isReturningClient: true },
        { id: "4", clientName: "Thabo B.", serviceName: "Beard Line-up", price: 80, timeSlot: "16:00", status: "booked", isReturningClient: true }
      ] as AppointmentData[];

      const generatedText = await adminAiService.generateBusinessReport(dataToAnalyze, targetDate);
      setReport(generatedText);
    } catch (err) {
      setError("Failed to communicate with AI Business Engine. Check console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      backgroundColor: "#1e1e1e",
      border: "1px solid #333",
      borderRadius: "12px",
      padding: "20px",
      marginTop: "24px",
      marginBottom: "24px",
      color: "#fff",
      fontFamily: "sans-serif",
      boxShadow: "0 4px 16px rgba(0,0,0,0.4)"
    }}>
      {/* Header & Trigger Action */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", borderBottom: "1px solid #333", paddingBottom: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>⚡</span>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "bold", color: "#f59e0b" }}>Sizabantu Executive AI Insights</h3>
          </div>
          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#aaa" }}>
            Automated daily summaries, revenue velocity, and schedule optimization.
          </p>
        </div>

        <button
          onClick={handleGenerateReport}
          disabled={isLoading}
          style={{
            backgroundColor: isLoading ? "#4b5563" : "#d97706",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "10px 18px",
            fontSize: "13px",
            fontWeight: "bold",
            cursor: isLoading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "background 0.2s shadow 0.2s",
            boxShadow: "0 2px 8px rgba(217, 119, 6, 0.3)"
          }}
        >
          {isLoading ? (
            <>
              <span style={{ display: "inline-block", width: "12px", height: "12px", border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }}></span>
              Analyzing Shop Data...
            </>
          ) : (
            <>📊 Generate Today's AI Report</>
          )}
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div style={{ marginTop: "16px", padding: "12px", backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444", borderRadius: "8px", color: "#f87171", fontSize: "13px" }}>
          {error}
        </div>
      )}

      {/* Report Output Screen */}
      {report && !isLoading && (
        <div style={{
          marginTop: "16px",
          padding: "16px",
          backgroundColor: "#252526",
          borderRadius: "8px",
          borderLeft: "4px solid #d97706",
          fontSize: "14px",
          lineHeight: "1.6",
          whiteSpace: "pre-wrap",
          color: "#e5e7eb"
        }}>
          {report}
        </div>
      )}

      {/* Initial Empty State Prompt */}
      {!report && !isLoading && !error && (
        <div style={{ textAlign: "center", padding: "24px 0", color: "#6b7280", fontSize: "13px", fontStyle: "italic" }}>
          Click "Generate Today's AI Report" above to compile real-time metrics from your active schedule.
        </div>
      )}
    </div>
  );
};

export default AdminAiReport;
