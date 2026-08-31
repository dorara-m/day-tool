import { useEffect, useState } from "react";
import EveningTab from "./EveningTab";
import MorningTab from "./MorningTab";

const TABS = [
  { id: "morning", label: "朝：本日の予定" },
  { id: "evening", label: "夕：日報" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("morning");

  useEffect(() => {
    document.title = "日報作成ツール";
  }, []);

  return (
    <div className="container">
      <h1>日報作成ツール</h1>

      <div className="tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`tab-button${activeTab === tab.id ? " tab-button--active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "morning" ? <MorningTab /> : <EveningTab />}
    </div>
  );
}
