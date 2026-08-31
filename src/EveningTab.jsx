import { useEffect, useMemo, useState } from "react";
import {
  formatHours,
  formatHoursForReport,
  formatHoursValue,
  formatReportDateLabel,
  getNearbyQuarterHourOptions,
  getWeekday,
  loadState,
  parseTime,
  saveState,
} from "./utils";

const STORAGE_KEY = "dayTool.evening";

const createEmptyChild = () => ({
  id: crypto.randomUUID(),
  name: "",
  hours: "",
  status: "",
});

const createEmptyTask = () => ({
  id: crypto.randomUUID(),
  name: "",
  hours: "",
  hoursManual: false,
  progress: "",
  children: [createEmptyChild()],
});

const sumChildHours = (children) =>
  children.reduce((sum, child) => {
    if (child.hours === "" || child.hours == null) return sum;
    const n = parseFloat(child.hours);
    return Number.isNaN(n) ? sum : sum + n;
  }, 0);

const hoursSumToInput = (sum) => (sum > 0 ? formatHoursValue(sum) : "");

/** 手入力でないとき、親の時間を子の合計で同期する */
const applyAutoParentHours = (task) => {
  if (task.hoursManual) return task;
  return { ...task, hours: hoursSumToInput(sumChildHours(task.children)) };
};

const getParentHoursValue = (task) => {
  if (task.hoursManual) {
    const n = parseFloat(task.hours);
    return Number.isNaN(n) ? 0 : n;
  }
  const sum = sumChildHours(task.children);
  if (sum > 0) return sum;
  const n = parseFloat(task.hours);
  return Number.isNaN(n) ? 0 : n;
};

const formatParentHoursPart = (totalHours) => {
  if (!totalHours || totalHours <= 0) return "";
  return `（${formatHoursValue(totalHours)}h）`;
};

const formatProgressPart = (progress) => {
  const p = progress?.trim();
  if (!p) return "";
  return `（進捗：${p}）`;
};

const formatChildLine = (child) => {
  let line = `　■ ${child.name?.trim() || "未入力"}`;
  if (child.hours !== "" && child.hours != null) {
    const n = parseFloat(child.hours);
    if (!Number.isNaN(n)) {
      line += `（${formatHoursValue(n)}h）`;
    }
  }
  if (child.status?.trim()) {
    line += `（${child.status.trim()}）`;
  }
  return line;
};

const childIsFilled = (c) =>
  Boolean(c.name?.trim() || c.hours || c.status?.trim());

const taskIsFilled = (task) =>
  Boolean(
    task.name?.trim() ||
    task.hours ||
    task.progress?.trim() ||
    task.children?.some(childIsFilled),
  );

export default function EveningTab() {
  const today = new Date().toISOString().slice(0, 10);
  const [initial] = useState(() => loadState(STORAGE_KEY, {}));
  const [date, setDate] = useState(initial.date ?? today);
  const [startTime, setStartTime] = useState(initial.startTime ?? "10:00");
  const [endTime, setEndTime] = useState(initial.endTime ?? "19:00");
  const [breakStart, setBreakStart] = useState(initial.breakStart ?? "13:00");
  const [breakEnd, setBreakEnd] = useState(initial.breakEnd ?? "14:00");
  const [isRemote, setIsRemote] = useState(initial.isRemote ?? false);
  const [tasks, setTasks] = useState(
    initial.tasks ?? [createEmptyTask(), createEmptyTask()],
  );
  const [output, setOutput] = useState("");

  useEffect(() => {
    saveState(STORAGE_KEY, {
      date,
      startTime,
      endTime,
      breakStart,
      breakEnd,
      isRemote,
      tasks,
    });
  }, [date, startTime, endTime, breakStart, breakEnd, isRemote, tasks]);
  const startTimeOptions = useMemo(() => getNearbyQuarterHourOptions(startTime), [startTime]);
  const endTimeOptions = useMemo(() => getNearbyQuarterHourOptions(endTime), [endTime]);
  const breakStartOptions = useMemo(
    () => getNearbyQuarterHourOptions(breakStart),
    [breakStart],
  );
  const breakEndOptions = useMemo(() => getNearbyQuarterHourOptions(breakEnd), [breakEnd]);

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

  const totalTasksHours = useMemo(
    () => tasks.reduce((sum, task) => sum + getParentHoursValue(task), 0),
    [tasks],
  );

  const isEightHours = Math.abs(totalTasksHours - 8) < 0.01;

  const updateTask = (id, field, value) => {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, [field]: value } : task))
    );
  };

  const updateTaskHours = (id, value) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === id ? { ...task, hours: value, hoursManual: true } : task,
      ),
    );
  };

  const resetTaskHoursToAuto = (id) => {
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== id) return task;
        return applyAutoParentHours({ ...task, hoursManual: false });
      }),
    );
  };

  const updateChild = (taskId, childId, field, value) => {
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== taskId) return task;
        const next = {
          ...task,
          children: task.children.map((c) =>
            c.id === childId ? { ...c, [field]: value } : c,
          ),
        };
        return applyAutoParentHours(next);
      }),
    );
  };

  const addChild = (taskId) => {
    setTasks((current) =>
      current.map((task) =>
        task.id !== taskId
          ? task
          : applyAutoParentHours({
              ...task,
              children: [...task.children, createEmptyChild()],
            }),
      ),
    );
  };

  const removeChild = (taskId, childId) => {
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== taskId) return task;
        const next = task.children.filter((c) => c.id !== childId);
        const updated = {
          ...task,
          children: next.length > 0 ? next : [createEmptyChild()],
        };
        return applyAutoParentHours(updated);
      }),
    );
  };

  const addTask = () => {
    setTasks((current) => [...current, createEmptyTask()]);
  };

  const removeTask = (id) => {
    setTasks((current) => current.filter((task) => task.id !== id));
  };

  const generateReport = () => {
    const validTasks = tasks.filter(taskIsFilled);
    if (validTasks.length === 0) {
      alert("少なくとも1つの稼働内容を入力してください。");
      return;
    }

    const dateLabel = formatReportDateLabel(date);
    const header = `【稼働終了報告 ${dateLabel}(${getWeekday(date)})】`;
    const actualWork = formatHoursForReport(workMinutes);

    const lines = [
      header,
      "お疲れ様です。",
      "本日の稼働を終了します。",
      "",
      "【稼働】",
      `・稼働時間　${startTime}～${endTime}（実働${actualWork}時間）`,
    ];

    const breakStartMin = parseTime(breakStart);
    const breakEndMin = parseTime(breakEnd);
    if (breakStart && breakEnd && breakEndMin > breakStartMin) {
      const breakMins = breakEndMin - breakStartMin;
      const breakH = formatHoursForReport(breakMins);
      lines.push(`・休憩時間　${breakStart}～${breakEnd}（${breakH}h）`);
    }
    if (isRemote) {
      lines.push("・勤務形態　在宅");
    }

    lines.push("", "【内容】");

    validTasks.forEach((task) => {
      const parentHours = getParentHoursValue(task);
      const parentLine = `● ${task.name?.trim() || "未入力"}${formatParentHoursPart(parentHours)}${formatProgressPart(task.progress)}`;
      lines.push(parentLine);
      task.children.filter(childIsFilled).forEach((child) => {
        lines.push(formatChildLine(child));
      });
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

  return (
    <>
      <div className="inputArea">
        <section className="panel">
          <div className="field-row">
            <label htmlFor="report-date">日付</label>
            <input
              id="report-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="field-row">
            <label htmlFor="start-time">開始</label>
            <select
              id="start-time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            >
              {startTimeOptions.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>
          <div className="field-row">
            <label htmlFor="end-time">終了</label>
            <select id="end-time" value={endTime} onChange={(e) => setEndTime(e.target.value)}>
              {endTimeOptions.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>
          <div className="field-row">
            <label htmlFor="break-start">休憩開始</label>
            <select
              id="break-start"
              value={breakStart}
              onChange={(e) => setBreakStart(e.target.value)}
            >
              {breakStartOptions.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>
          <div className="field-row">
            <label htmlFor="break-end">休憩終了</label>
            <select id="break-end" value={breakEnd} onChange={(e) => setBreakEnd(e.target.value)}>
              {breakEndOptions.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>
          <div className="field-row note-row">
            <label>実働時間</label>
            <span>{workTime}h</span>
          </div>
          <div className="field-row">
            <label htmlFor="is-remote">在宅</label>
            <input
              id="is-remote"
              type="checkbox"
              checked={isRemote}
              onChange={(e) => setIsRemote(e.target.checked)}
            />
          </div>
        </section>

        <section className="panel">
          <div id="tasks" className="tasks">
            {tasks.map((task) => {
              const childSum = sumChildHours(task.children);
              return (
                <div key={task.id} className="task">
                  <div className="task-remove">
                    <button
                      type="button"
                      onClick={() => removeTask(task.id)}
                      aria-label="このブロックを削除"
                    >
                      ー
                    </button>
                  </div>
                  <div className="task-row task-row-parent">
                    <input
                      type="text"
                      className="task-name"
                      placeholder="親タスク名（ex: 案件B）"
                      value={task.name}
                      onChange={(e) =>
                        updateTask(task.id, "name", e.target.value)
                      }
                    />
                    <div className="task-hours-wrap">
                      <input
                        type="number"
                        min="0"
                        step="0.25"
                        className={`task-hours${!task.hoursManual && childSum > 0 ? " task-hours--auto" : ""}`}
                        placeholder="親の時間(h)"
                        title={
                          !task.hoursManual && childSum > 0
                            ? "子タスクの合計（自動）"
                            : "親の時間を直接入力"
                        }
                        value={task.hours}
                        onChange={(e) =>
                          updateTaskHours(task.id, e.target.value)
                        }
                      />
                      {task.hoursManual && childSum > 0 && (
                        <button
                          type="button"
                          className="hours-reset-auto"
                          onClick={() => resetTaskHoursToAuto(task.id)}
                          title="子の合計に戻す"
                        >
                          自動
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      className="task-progress"
                      placeholder="進捗（ex: 10P/57P）"
                      value={task.progress}
                      onChange={(e) =>
                        updateTask(task.id, "progress", e.target.value)
                      }
                    />
                  </div>
                  <div className="task-children">
                    {task.children.map((child) => (
                      <div key={child.id} className="task-row task-row-child">
                        <input
                          type="text"
                          className="task-name"
                          placeholder="小タスク名（ex. ページA）"
                          value={child.name}
                          onChange={(e) =>
                            updateChild(
                              task.id,
                              child.id,
                              "name",
                              e.target.value,
                            )
                          }
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.25"
                          className="task-hours"
                          placeholder="時間(h)"
                          value={child.hours}
                          onChange={(e) =>
                            updateChild(
                              task.id,
                              child.id,
                              "hours",
                              e.target.value,
                            )
                          }
                        />
                        <input
                          type="text"
                          className="task-status"
                          placeholder="状況（ex: 完了）"
                          value={child.status}
                          onChange={(e) =>
                            updateChild(
                              task.id,
                              child.id,
                              "status",
                              e.target.value,
                            )
                          }
                        />
                        <button
                          type="button"
                          className="child-remove"
                          onClick={() => removeChild(task.id, child.id)}
                          aria-label="子タスクを削除"
                        >
                          ー
                        </button>
                      </div>
                    ))}
                    <div className="secondary_add">
                      <button
                        type="button"
                        className="secondary child-add"
                        onClick={() => addChild(task.id)}
                      >
                        ＋
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="add_task">
            <button type="button" className="secondary" onClick={addTask}>
              タスクを追加
            </button>
          </div>
          <div
            className={`field-row note-row tasks-total${!isEightHours ? " tasks-total--warning" : ""}`}
          >
            <label>タスク合計</label>
            <span>{formatHoursValue(totalTasksHours)}h / 8h</span>
          </div>
        </section>
      </div>

      <section className="panel result">
        <div className="btns">
          <button type="button" className="primary" onClick={generateReport}>
            日報を生成
          </button>
          <button type="button" className="secondary" onClick={copyReport}>
            コピー
          </button>
        </div>
        <textarea
          readOnly
          value={output}
          placeholder="ここに日報が生成されます"
        />
      </section>
    </>
  );
}
