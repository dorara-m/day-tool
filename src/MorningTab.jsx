import { useEffect, useMemo, useState } from "react";
import { formatHoursValue, loadState, saveState } from "./utils";
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

export const MORNING_STORAGE_KEY = "dayTool.morning";
const STORAGE_KEY = MORNING_STORAGE_KEY;

export default function MorningTab() {
  const [initial] = useState(() => loadState(STORAGE_KEY, {}));
  const [groups, setGroups] = useState(initial.groups ?? [createEmptyPlanGroup()]);
  const [meetings, setMeetings] = useState(
    initial.meetings ?? [createEmptyMeeting()],
  );
  const [output, setOutput] = useState("");

  useEffect(() => {
    saveState(STORAGE_KEY, { groups, meetings });
  }, [groups, meetings]);

  const totalHours = useMemo(() => sumPlanGroupsHours(groups), [groups]);
  const meetingHours = useMemo(() => sumMeetingsHours(meetings), [meetings]);
  const grandTotalHours = totalHours + meetingHours;
  const isOverEightHours = grandTotalHours >= 8;

  const generatePlan = () => {
    const validGroups = groups
      .filter(planGroupIsFilled)
      .map((g) => ({ ...g, tasks: g.tasks.filter(planTaskIsFilled) }));
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
        const detail = formatPlanTaskDetailLine(task);
        if (detail) lines.push(detail);
        const scope = formatPlanTaskScopeLine(task, "対応範囲");
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
      <GroupsPanel
        groups={groups}
        setGroups={setGroups}
        hint="優先度の高い案件から入力してください"
        scopeLabel="対応範囲"
        scopePlaceholder="対応範囲（ex: 先方報告まで）"
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
