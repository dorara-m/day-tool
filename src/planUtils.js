import { formatHoursValue, parseTime } from "./utils";

export const createEmptyPlanTask = () => ({
  id: crypto.randomUUID(),
  name: "",
  progressStart: "0",
  progressEnd: "100",
  hours: "",
  scope: "",
});

export const createEmptyPlanGroup = () => ({
  id: crypto.randomUUID(),
  name: "",
  tasks: [createEmptyPlanTask()],
});

export const createEmptyMeeting = () => ({
  id: crypto.randomUUID(),
  startTime: "10:00",
  endTime: "10:15",
  name: "",
});

export const planTaskIsFilled = (task) =>
  Boolean(task.name?.trim() || task.hours || task.scope?.trim());

export const planGroupIsFilled = (group) =>
  Boolean(group.name?.trim() || group.tasks?.some(planTaskIsFilled));

export const meetingIsFilled = (meeting) => Boolean(meeting.name?.trim());

export const parsePlanTaskHours = (task) => {
  const n = parseFloat(task.hours);
  return Number.isNaN(n) ? 0 : n;
};

export const formatPlanTaskDetailLine = (task) => {
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

/** label: 「対応範囲」「対応結果」など、呼び出し側の文脈に応じたラベル */
export const formatPlanTaskScopeLine = (task, label) => {
  const scope = task.scope?.trim();
  return scope ? `　${label}：${scope}` : null;
};

export const sumPlanGroupsHours = (groups) =>
  groups.reduce(
    (sum, group) =>
      sum + group.tasks.reduce((s, task) => s + parsePlanTaskHours(task), 0),
    0,
  );

export const sumMeetingsHours = (meetings) =>
  meetings.reduce((sum, meeting) => {
    const start = parseTime(meeting.startTime);
    const end = parseTime(meeting.endTime);
    if (start == null || end == null || end <= start) return sum;
    return sum + (end - start) / 60;
  }, 0);
