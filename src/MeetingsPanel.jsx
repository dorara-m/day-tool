import { createEmptyMeeting } from "./planUtils";
import {
  QUARTER_HOUR_OPTIONS,
  formatTime,
  getNearbyQuarterHourOptions,
  getQuarterHourOptionsInRange,
  parseTime,
} from "./utils";

const MEETING_TIME_OPTIONS = getQuarterHourOptionsInRange("10:00", "19:00");
const DEFAULT_MEETING_DURATION = 15;
const LAST_QUARTER_HOUR_MINUTES = 23 * 60 + 45; // 23:45（1日の最終枠）

/** 通常は10:00〜19:00、境界付近の値のときはその前後2時間も候補に含める */
const getMeetingTimeOptions = (value) => {
  const nearby = getNearbyQuarterHourOptions(value, 120);
  const merged = new Set([...MEETING_TIME_OPTIONS, ...nearby]);
  return QUARTER_HOUR_OPTIONS.filter((time) => merged.has(time));
};

/** MTGの時間帯＋名称の入力パネル。朝タブ・夕タブで共用。 */
export default function MeetingsPanel({
  meetings,
  setMeetings,
  namePlaceholder = "MTG名（ex: 【社内MTG】進捗確認）",
  addLabel = "MTGを追加",
}) {
  const updateMeeting = (meetingId, field, value) => {
    setMeetings((current) =>
      current.map((m) => (m.id === meetingId ? { ...m, [field]: value } : m)),
    );
  };

  const updateMeetingStart = (meetingId, value) => {
    setMeetings((current) =>
      current.map((m) => {
        if (m.id !== meetingId) return m;
        const startMin = parseTime(value);
        const endTime =
          startMin != null
            ? formatTime(Math.min(startMin + DEFAULT_MEETING_DURATION, LAST_QUARTER_HOUR_MINUTES))
            : m.endTime;
        return { ...m, startTime: value, endTime };
      }),
    );
  };

  const addMeeting = () => {
    setMeetings((current) => [...current, createEmptyMeeting()]);
  };

  const removeMeeting = (meetingId) => {
    setMeetings((current) => current.filter((m) => m.id !== meetingId));
  };

  return (
    <section className="panel">
      <div id="meetings" className="tasks">
        {meetings.map((meeting) => {
          const startOptions = getMeetingTimeOptions(meeting.startTime);
          const endOptions = getMeetingTimeOptions(meeting.endTime);
          return (
            <div key={meeting.id} className="meeting-row">
              <select
                value={meeting.startTime}
                onChange={(e) => updateMeetingStart(meeting.id, e.target.value)}
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
                placeholder={namePlaceholder}
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
          {addLabel}
        </button>
      </div>
    </section>
  );
}
