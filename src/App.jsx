import { useEffect, useMemo, useState } from "react";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const parseTime = (value) => {
  if (!value) return null;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
};

const formatHours = (minutes) => {
  return (minutes / 60).toFixed(2).replace(/\.00$/, "");
};

const normalizeTaskText = (name, hours, status) => {
  let line = `・${name}`;
  if (hours !== "" && !isNaN(hours)) {
    line += `（${parseFloat(hours)}h）`;
    if (status) {
      line += `（${status}`;
    }
    line += `）`;
  } else if (status) {
    line += `（${status}）`;
  }
  return line;
};

const getWeekday = (dateString) => {
  const date = new Date(dateString);
  return WEEKDAYS[date.getDay()];
};

const createEmptyTask = () => ({ id: crypto.randomUUID(), name: "", hours: "", status: "" });

export default function App() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("19:00");
  const [breakStart, setBreakStart] = useState("13:00");
  const [breakEnd, setBreakEnd] = useState("14:00");
  const [tasks, setTasks] = useState([createEmptyTask(), createEmptyTask()]);
  const [output, setOutput] = useState("");

  const workMinutes = useMemo(() => {
    const start = parseTime(startTime);
    const end = parseTime(endTime);
    if (start == null || end == null) return 0;
    let total = end - start;
    if (total < 0) total = 0;
    const breakStartMin = parseTime(breakStart);
    const breakEndMin = parseTime(breakEnd);
    if (breakStartMin != null && breakEndMin != null && breakEndMin > breakStartMin) {
      total -= breakEndMin - breakStartMin;
    }
    return Math.max(total, 0);
  }, [startTime, endTime, breakStart, breakEnd]);

  const workTime = formatHours(workMinutes);

  const updateTask = (id, field, value) => {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, [field]: value } : task))
    );
  };

  const addTask = () => {
    setTasks((current) => [...current, createEmptyTask()]);
  };

  const removeTask = (id) => {
    setTasks((current) => current.filter((task) => task.id !== id));
  };

  const generateReport = () => {
    const validTasks = tasks.filter((task) => task.name || task.hours || task.status);
    if (validTasks.length === 0) {
      alert("少なくとも1つの稼働内容を入力してください。");
      return;
    }

    const header = `【稼働終了報告 ${date.slice(5).replace("-", "月")}日(${getWeekday(date)})】`;
    const lines = [
      header,
      "お疲れ様です。",
      "本日の稼働を終了します。",
      `・稼働時間　${startTime}～${endTime}（実働${workTime}時間）`,
    ];

    const breakStartMin = parseTime(breakStart);
    const breakEndMin = parseTime(breakEnd);
    if (breakStart && breakEnd && breakEndMin > breakStartMin) {
      const breakHours = formatHours(breakEndMin - breakStartMin);
      lines.push(`・休憩時間　${breakStart}～${breakEnd}（${breakHours}h）`);
    }

    lines.push("", "【稼動内容】");
    validTasks.forEach((task) => {
      lines.push(normalizeTaskText(task.name || "未入力", task.hours || "", task.status || ""));
    });

    setOutput(lines.join("\n"));
  };

  const copyReport = async () => {
    if (!output) {
      alert("まず日報を生成してください。");
      return;
    }
    try {
      await navigator.clipboard.writeText(output);
      alert("日報をクリップボードにコピーしました。");
    } catch {
      alert("コピーに失敗しました。ブラウザの権限を確認してください。");
    }
  };

  useEffect(() => {
    document.title = "日報作成ツール";
  }, []);

  return (
    <div className="container">
      <h1>日報作成ツール</h1>
      
      <div className="wrap">
        <div className="main">
          <section className="panel">
            <h2>基本情報</h2>
            <div className="field-row">
              <label htmlFor="report-date">日付</label>
              <input id="report-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="field-row">
              <label htmlFor="start-time">開始</label>
              <input id="start-time" type="time" step="900" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="field-row">
              <label htmlFor="end-time">終了</label>
              <input id="end-time" type="time" step="900" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
            <div className="field-row">
              <label htmlFor="break-start">休憩開始</label>
              <input id="break-start" type="time" step="900" value={breakStart} onChange={(e) => setBreakStart(e.target.value)} />
            </div>
            <div className="field-row">
              <label htmlFor="break-end">休憩終了</label>
              <input id="break-end" type="time" step="900" value={breakEnd} onChange={(e) => setBreakEnd(e.target.value)} />
            </div>
            <div className="field-row note-row">
              <label>実働時間</label>
              <span>{workTime}h</span>
            </div>
          </section>

          <section className="panel">
            <h2>稼働内容</h2>
            <div id="tasks" className="tasks">
              {tasks.map((task) => (
                <div key={task.id} className="task">
                  <div className="task-row">
                    <input
                      type="text"
                      className="task-name"
                      placeholder="タスク名"
                      value={task.name}
                      onChange={(e) => updateTask(task.id, "name", e.target.value)}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.25"
                      className="task-hours"
                      placeholder="かかった時間"
                      value={task.hours}
                      onChange={(e) => updateTask(task.id, "hours", e.target.value)}
                    />
                    <input
                      type="text"
                      className="task-status"
                      placeholder="進捗 or 状況"
                      value={task.status}
                      onChange={(e) => updateTask(task.id, "status", e.target.value)}
                    />
                  </div>
                  <div className="task-actions">
                    <button type="button" onClick={() => removeTask(task.id)}>
                      ー
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="add_task">
              <button type="button" className="secondary" onClick={addTask}>
                タスクを追加
              </button>
            </div>
          </section>
        </div>

        <section className="side panel">
          <div className="btns">
            <button type="button" className="primary" onClick={generateReport}>
              日報を生成
            </button>
            <button type="button" className="secondary" onClick={copyReport}>
              コピー
            </button>
          </div>
          <textarea readOnly value={output} placeholder="ここに日報が表示されます" />
        </section>
      </div>

    </div>
  );
}
