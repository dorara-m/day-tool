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
import {
  createEmptyPlanGroup,
  createEmptyMeeting,
  formatPlanTaskDetailLine,
  formatPlanTaskScopeLine,
  meetingIsFilled,
  planGroupIsFilled,
  planTaskIsFilled,
  sumMeetingsHours,
  sumPlanGroupsHours,
} from "./planUtils";
import GroupsPanel from "./GroupsPanel";
import MeetingsPanel from "./MeetingsPanel";
import { MORNING_STORAGE_KEY } from "./MorningTab";

export const EVENING_STORAGE_KEY = "dayTool.evening";
const STORAGE_KEY = EVENING_STORAGE_KEY;

const createEmptyBreak = () => ({
  id: crypto.randomUUID(),
  start: "13:00",
  end: "14:00",
});

export default function EveningTab() {
  const today = new Date().toISOString().slice(0, 10);
  const [initial] = useState(() => loadState(STORAGE_KEY, {}));
  const [date, setDate] = useState(initial.date ?? today);
  const [startTime, setStartTime] = useState(initial.startTime ?? "10:00");
  const [endTime, setEndTime] = useState(initial.endTime ?? "19:00");
  const [breaks, setBreaks] = useState(initial.breaks ?? [createEmptyBreak()]);
  const [isRemote, setIsRemote] = useState(initial.isRemote ?? false);
  const [groups, setGroups] = useState(initial.groups ?? [createEmptyPlanGroup()]);
  const [meetings, setMeetings] = useState(
    initial.meetings ?? [createEmptyMeeting()],
  );
  const [output, setOutput] = useState("");

  useEffect(() => {
    saveState(STORAGE_KEY, {
      date,
      startTime,
      endTime,
      breaks,
      isRemote,
      groups,
      meetings,
    });
  }, [date, startTime, endTime, breaks, isRemote, groups, meetings]);

  const startTimeOptions = useMemo(() => getNearbyQuarterHourOptions(startTime), [startTime]);
  const endTimeOptions = useMemo(() => getNearbyQuarterHourOptions(endTime), [endTime]);

  const validBreaks = useMemo(
    () =>
      breaks.filter((b) => {
        const s = parseTime(b.start);
        const e = parseTime(b.end);
        return s != null && e != null && e > s;
      }),
    [breaks],
  );

  const breaksMinutes = useMemo(
    () =>
      validBreaks.reduce((sum, b) => sum + (parseTime(b.end) - parseTime(b.start)), 0),
    [validBreaks],
  );

  const workMinutes = useMemo(() => {
    const start = parseTime(startTime);
    const end = parseTime(endTime);
    if (start == null || end == null) return 0;
    let total = end - start;
    if (total < 0) total = 0;
    total -= breaksMinutes;
    return Math.max(total, 0);
  }, [startTime, endTime, breaksMinutes]);

  const workTime = formatHours(workMinutes);

  const updateBreak = (id, field, value) => {
    setBreaks((current) =>
      current.map((b) => (b.id === id ? { ...b, [field]: value } : b)),
    );
  };

  const addBreak = () => {
    setBreaks((current) => [...current, createEmptyBreak()]);
  };

  const removeBreak = (id) => {
    setBreaks((current) => current.filter((b) => b.id !== id));
  };

  const totalHours = useMemo(() => sumPlanGroupsHours(groups), [groups]);
  const meetingHours = useMemo(() => sumMeetingsHours(meetings), [meetings]);
  const grandTotalHours = totalHours + meetingHours;

  const workHours = workMinutes / 60;
  const hoursMatch = Math.abs(workHours - grandTotalHours) < 0.01;

  const importFromMorning = () => {
    const morning = loadState(MORNING_STORAGE_KEY, null);
    const hasMorningContent =
      morning?.groups?.some(planGroupIsFilled) ||
      morning?.meetings?.some(meetingIsFilled);

    if (!hasMorningContent) {
      alert("朝の予定がまだ入力されていません。");
      return;
    }

    if (!window.confirm("朝の予定を読み込み、現在の入力内容を上書きします。よろしいですか？")) {
      return;
    }

    setGroups(morning.groups);
    setMeetings(morning.meetings);
  };

  const generateReport = () => {
    const validGroups = groups
      .filter(planGroupIsFilled)
      .map((g) => ({ ...g, tasks: g.tasks.filter(planTaskIsFilled) }));
    const validMeetings = meetings.filter(meetingIsFilled);

    if (validGroups.length === 0 && validMeetings.length === 0) {
      alert("少なくとも1つの作業結果またはMTGを入力してください。");
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

    if (validBreaks.length > 0) {
      const rangesText = validBreaks.map((b) => `${b.start}～${b.end}`).join("、");
      const breakH = formatHoursForReport(breaksMinutes);
      lines.push(`・休憩時間　${rangesText}（${breakH}h）`);
    }
    if (isRemote) {
      lines.push("・勤務形態　在宅");
    }

    lines.push("", "【作業結果】");

    validGroups.forEach((group) => {
      lines.push(`＜${group.name?.trim() || "未入力"}＞`);
      group.tasks.forEach((task) => {
        lines.push(`・${task.name?.trim() || "未入力"}`);
        const detail = formatPlanTaskDetailLine(task);
        if (detail) lines.push(detail);
        const scope = formatPlanTaskScopeLine(task, "対応結果");
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
          <label>休憩</label>
          <div className="breaks-list">
            {breaks.map((b) => {
              const startOptions = getNearbyQuarterHourOptions(b.start);
              const endOptions = getNearbyQuarterHourOptions(b.end);
              return (
                <div key={b.id} className="break-row">
                  <select
                    value={b.start}
                    onChange={(e) => updateBreak(b.id, "start", e.target.value)}
                  >
                    {startOptions.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                  <span>〜</span>
                  <select
                    value={b.end}
                    onChange={(e) => updateBreak(b.id, "end", e.target.value)}
                  >
                    {endOptions.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="child-remove"
                    onClick={() => removeBreak(b.id)}
                    aria-label="休憩を削除"
                  >
                    ー
                  </button>
                </div>
              );
            })}
            <button type="button" className="secondary child-add" onClick={addBreak}>
              ＋
            </button>
          </div>
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

      <div className="add_task import-action">
        <button type="button" className="secondary" onClick={importFromMorning}>
          朝の予定を自動入力
        </button>
      </div>

      <GroupsPanel
        groups={groups}
        setGroups={setGroups}
        taskPlaceholder="作業内容（ex: 提案資料作成）"
        scopeLabel="対応結果"
        scopePlaceholder="対応結果（ex: クライアント提出まで完了）"
      />

      <MeetingsPanel meetings={meetings} setMeetings={setMeetings} />

      <section className="panel">
        <div className="hours-compare">
          <div className="hours-compare-item">
            <span className="hours-compare-label">プロジェクト合計</span>
            <span className="hours-compare-value">{formatHoursValue(totalHours)}h</span>
          </div>
          <div className="hours-compare-item">
            <span className="hours-compare-label">MTG合計</span>
            <span className="hours-compare-value">{formatHoursValue(meetingHours)}h</span>
          </div>
          <div className="hours-compare-item">
            <span className="hours-compare-label">合計</span>
            <span className={`hours-compare-value${hoursMatch ? " hours-compare-value--match" : ""}`}>
              {formatHoursValue(grandTotalHours)}h
            </span>
          </div>
          <div className="hours-compare-item">
            <span className="hours-compare-label">実働時間</span>
            <span className={`hours-compare-value${hoursMatch ? " hours-compare-value--match" : ""}`}>
              {workTime}h
            </span>
          </div>
        </div>
      </section>

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
