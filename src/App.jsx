import { useEffect, useState } from "react";
import EveningTab, { EVENING_STORAGE_KEY } from "./EveningTab";
import MorningTab, { MORNING_STORAGE_KEY } from "./MorningTab";
import { clearState } from "./utils";

const TABS = [
  { id: "morning", label: "朝：本日の予定" },
  { id: "evening", label: "夕：日報" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("morning");
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    document.title = "日報作成ツール";
  }, []);

  const clearAll = () => {
    if (!window.confirm("朝・夕の入力内容をすべて削除します。よろしいですか？")) {
      return;
    }
    clearState(MORNING_STORAGE_KEY);
    clearState(EVENING_STORAGE_KEY);
    setResetKey((current) => current + 1);
  };

  return (
    <div className="container">
      <h1>日報作成ツール</h1>

      <div className="tabs-row">
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
        <button type="button" className="secondary clear-all" onClick={clearAll}>
          入力を全削除
        </button>
      </div>

      {activeTab === "morning" ? (
        <MorningTab key={`morning-${resetKey}`} />
      ) : (
        <EveningTab key={`evening-${resetKey}`} />
      )}
    </div>
  );
}
