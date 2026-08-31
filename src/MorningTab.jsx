import { useEffect, useMemo, useState } from "react";
import {
  formatHoursValue,
  getNearbyQuarterHourOptions,
  loadState,
  parseTime,
  saveState,
} from "./utils";

const STORAGE_KEY = "dayTool.morning";

const createEmptyMorningTask = () => ({
  id: crypto.randomUUID(),
  name: "",
  progressStart: "0",
  progressEnd: "100",
  hours: "",
  scope: "",
});

const createEmptyGroup = () => ({
  id: crypto.randomUUID(),
  name: "",
  tasks: [createEmptyMorningTask()],
});

const createEmptyMeeting = () => ({
  id: crypto.randomUUID(),
  startTime: "10:00",
  endTime: "10:15",
  name: "",
});

const taskIsFilled = (task) =>
  Boolean(task.name?.trim() || task.hours || task.scope?.trim());

const groupIsFilled = (group) =>
  Boolean(group.name?.trim() || group.tasks?.some(taskIsFilled));

const meetingIsFilled = (meeting) => Boolean(meeting.name?.trim());

const parseTaskHours = (task) => {
  const n = parseFloat(task.hours);
  return Number.isNaN(n) ? 0 : n;
};

const formatMorningTaskDetailLine = (task) => {
  const segments = [];
  const hasProgress = task.progressStart !== "" || task.progressEnd !== "";
  if (hasProgress) {
    const start = task.progressStart === "" ? "0" : task.progressStart;
    const end = task.progressEnd === "" ? "100" : task.progressEnd;
    segments.push(`進捗：${start}% → ${end}%`);
  }
  if (task.hours !== "" && task.hours != null) {
    const n = parseFloat(task.hours);
    if (!Number.isNaN(n)) {
      segments.push(`${formatHoursValue(n)}h`);
    }
  }
  return segments.length ? `　${segments.join("｜")}` : null;
};

const formatMorningTaskScopeLine = (task) => {
  const scope = task.scope?.trim();
  return scope ? `　対応範囲：${scope}` : null;
};

export default function MorningTab() {
  const [initial] = useState(() => loadState(STORAGE_KEY, {}));
  const [groups, setGroups] = useState(initial.groups ?? [createEmptyGroup()]);
  const [meetings, setMeetings] = useState(
    initial.meetings ?? [createEmptyMeeting()],
  );
  const [output, setOutput] = useState("");

  useEffect(() => {
    saveState(STORAGE_KEY, { groups, meetings });
  }, [groups, meetings]);

  const totalHours = useMemo(
    () =>
      groups.reduce(
        (sum, group) =>
          sum + group.tasks.reduce((s, task) => s + parseTaskHours(task), 0),
        0,
      ),
    [groups],
  );

  const meetingHours = useMemo(
    () =>
      meetings.reduce((sum, meeting) => {
        const start = parseTime(meeting.startTime);
        const end = parseTime(meeting.endTime);
        if (start == null || end == null || end <= start) return sum;
        return sum + (end - start) / 60;
      }, 0),
    [meetings],
  );

  const grandTotalHours = totalHours + meetingHours;
  const isOverEightHours = grandTotalHours > 8;

  const updateGroup = (groupId, field, value) => {
    setGroups((current) =>
      current.map((g) => (g.id === groupId ? { ...g, [field]: value } : g)),
    );
  };

  const addGroup = () => {
    setGroups((current) => [...current, createEmptyGroup()]);
  };

  const removeGroup = (groupId) => {
    setGroups((current) => current.filter((g) => g.id !== groupId));
  };

  const updateTask = (groupId, taskId, field, value) => {
    setGroups((current) =>
      current.map((g) =>
        g.id !== groupId
          ? g
          : {
              ...g,
              tasks: g.tasks.map((t) =>
                t.id === taskId ? { ...t, [field]: value } : t,
              ),
            },
      ),
    );
  };

  const addTask = (groupId) => {
    setGroups((current) =>
      current.map((g) =>
        g.id !== groupId
          ? g
          : { ...g, tasks: [...g.tasks, createEmptyMorningTask()] },
      ),
    );
  };

  const removeTask = (groupId, taskId) => {
    setGroups((current) =>
      current.map((g) => {
        if (g.id !== groupId) return g;
        const next = g.tasks.filter((t) => t.id !== taskId);
        return { ...g, tasks: next.length > 0 ? next : [createEmptyMorningTask()] };
      }),
    );
  };

  const updateMeeting = (meetingId, field, value) => {
    setMeetings((current) =>
      current.map((m) => (m.id === meetingId ? { ...m, [field]: value } : m)),
    );
  };

  const addMeeting = () => {
    setMeetings((current) => [...current, createEmptyMeeting()]);
  };

  const removeMeeting = (meetingId) => {
    setMeetings((current) => current.filter((m) => m.id !== meetingId));
  };

  const generatePlan = () => {
    const validGroups = groups
      .filter(groupIsFilled)
      .map((g) => ({ ...g, tasks: g.tasks.filter(taskIsFilled) }));
    const validMeetings = meetings.filter(meetingIsFilled);

    if (validGroups.length === 0 && validMeetings.length === 0) {
      alert("少なくとも1つの作業内容またはMTGを入力してください。");
      return;
    }

    const lines = ["■本日の予定", "【作業内容】"];

    validGroups.forEach((group, index) => {
      if (index > 0) lines.push("");
      lines.push(`＜${group.name?.trim() || "未入力"}＞`);
      group.tasks.forEach((task) => {
        lines.push(`・${task.name?.trim() || "未入力"}`);
        const detail = formatMorningTaskDetailLine(task);
        if (detail) lines.push(detail);
        const scope = formatMorningTaskScopeLine(task);
        if (scope) lines.push(scope);
      });
    });

    if (validMeetings.length > 0) {
      lines.push("", "【MTG】");
      validMeetings.forEach((m) => {
        lines.push(`・${m.startTime}〜${m.endTime}　${m.name.trim()}`);
      });
    }

    setOutput(lines.join("\n"));
  };

  const copyPlan = async () => {
    if (!output) {
      alert("まず予定を生成してください。");
      return;
    }
    try {
      await navigator.clipboard.writeText(output);
      alert("本日の予定をクリップボードにコピーしました。");
    } catch {
      alert("コピーに失敗しました。ブラウザの権限を確認してください。");
    }
  };

  return (
    <>
      <section className="panel">
        <div id="groups" className="tasks">
          {groups.map((group) => (
            <div key={group.id} className="task morning-group">
              <div className="task-remove">
                <button
                  type="button"
                  onClick={() => removeGroup(group.id)}
                  aria-label="このプロジェクトを削除"
                >
                  ー
                </button>
              </div>
              <input
                type="text"
                className="task-name morning-group-name"
                placeholder="プロジェクト名（ex: 案件A）"
                value={group.name}
                onChange={(e) => updateGroup(group.id, "name", e.target.value)}
              />
              <div className="morning-tasks">
                {group.tasks.map((task) => (
                  <div key={task.id} className="morning-task">
                    <div className="morning-task-row1">
                      <input
                        type="text"
                        className="task-name"
                        placeholder="作業内容（ex: 追加FB対応）"
                        value={task.name}
                        onChange={(e) =>
                          updateTask(group.id, task.id, "name", e.target.value)
                        }
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.25"
                        className="task-hours"
                        placeholder="時間(h)"
                        value={task.hours}
                        onChange={(e) =>
                          updateTask(group.id, task.id, "hours", e.target.value)
                        }
                      />
                    </div>
                    <div className="morning-task-row2">
                      <div className="progress-range">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="10"
                          className="progress-input"
                          placeholder="0"
                          value={task.progressStart}
                          onChange={(e) =>
                            updateTask(
                              group.id,
                              task.id,
                              "progressStart",
                              e.target.value,
                            )
                          }
                        />
                        <span>%　→</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="10"
                          className="progress-input"
                          placeholder="100"
                          value={task.progressEnd}
                          onChange={(e) =>
                            updateTask(
                              group.id,
                              task.id,
                              "progressEnd",
                              e.target.value,
                            )
                          }
                        />
                        <span>%</span>
                      </div>
                      <input
                        type="text"
                        className="task-status morning-scope"
                        placeholder="対応範囲（ex: 先方報告まで）"
                        value={task.scope}
                        onChange={(e) =>
                          updateTask(group.id, task.id, "scope", e.target.value)
                        }
                      />
                    </div>
                    <button
                        type="button"
                        className="child-remove"
                        onClick={() => removeTask(group.id, task.id)}
                        aria-label="作業内容を削除"
                      >
                        ー
                      </button>
                  </div>
                ))}
                <div className="secondary_add">
                  <button
                    type="button"
                    className="secondary child-add"
                    onClick={() => addTask(group.id)}
                  >
                    ＋
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="add_task">
          <button type="button" className="secondary" onClick={addGroup}>
            プロジェクトを追加
          </button>
        </div>
      </section>

      <section className="panel">
        <div id="meetings" className="tasks">
          {meetings.map((meeting) => {
            const startOptions = getNearbyQuarterHourOptions(meeting.startTime);
            const endOptions = getNearbyQuarterHourOptions(meeting.endTime);
            return (
              <div key={meeting.id} className="meeting-row">
                <select
                  value={meeting.startTime}
                  onChange={(e) =>
                    updateMeeting(meeting.id, "startTime", e.target.value)
                  }
                >
                  {startOptions.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
                <span>〜</span>
                <select
                  value={meeting.endTime}
                  onChange={(e) =>
                    updateMeeting(meeting.id, "endTime", e.target.value)
                  }
                >
                  {endOptions.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  className="task-name"
                  placeholder="MTG名（ex: 【社内MTG】進捗確認）"
                  value={meeting.name}
                  onChange={(e) =>
                    updateMeeting(meeting.id, "name", e.target.value)
                  }
                />
                <button
                  type="button"
                  className="child-remove"
                  onClick={() => removeMeeting(meeting.id)}
                  aria-label="MTGを削除"
                >
                  ー
                </button>
              </div>
            );
          })}
        </div>
        <div className="add_task">
          <button type="button" className="secondary" onClick={addMeeting}>
            MTGを追加
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="field-row note-row tasks-total">
          <label>プロジェクト合計</label>
          <span>{formatHoursValue(totalHours)}h</span>
        </div>
        <div className="field-row note-row tasks-total">
          <label>MTG合計</label>
          <span>{formatHoursValue(meetingHours)}h</span>
        </div>
        <div
          className={`field-row note-row tasks-total${isOverEightHours ? " tasks-total--warning" : ""}`}
        >
          <label>合計</label>
          <span>{formatHoursValue(grandTotalHours)}h</span>
        </div>
        <p className="panel-hint">※合計が8hを超えると赤字で表示されます</p>
      </section>

      <section className="panel result">
        <div className="btns">
          <button type="button" className="primary" onClick={generatePlan}>
            予定を生成
          </button>
          <button type="button" className="secondary" onClick={copyPlan}>
            コピー
          </button>
        </div>
        <textarea
          readOnly
          value={output}
          placeholder="ここに本日の予定が生成されます"
        />
      </section>
    </>
  );
}
