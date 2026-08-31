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

const STORAGE_KEY = "dayTool.evening";
const MORNING_STORAGE_KEY = "dayTool.morning";

export default function EveningTab() {
  const today = new Date().toISOString().slice(0, 10);
  const [initial] = useState(() => loadState(STORAGE_KEY, {}));
  const [date, setDate] = useState(initial.date ?? today);
  const [startTime, setStartTime] = useState(initial.startTime ?? "10:00");
  const [endTime, setEndTime] = useState(initial.endTime ?? "19:00");
  const [breakStart, setBreakStart] = useState(initial.breakStart ?? "13:00");
  const [breakEnd, setBreakEnd] = useState(initial.breakEnd ?? "14:00");
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
      breakStart,
      breakEnd,
      isRemote,
      groups,
      meetings,
    });
  }, [date, startTime, endTime, breakStart, breakEnd, isRemote, groups, meetings]);

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

  const totalHours = useMemo(() => sumPlanGroupsHours(groups), [groups]);
  const meetingHours = useMemo(() => sumMeetingsHours(meetings), [meetings]);
  const grandTotalHours = totalHours + meetingHours;
  const isOverEightHours = grandTotalHours >= 8;

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

    lines.push("", "■進んだところ", "【作業結果】");

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
        <p className="panel-hint">※合計が8h以上になると赤字で表示されます</p>
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
