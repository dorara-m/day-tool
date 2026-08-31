import { createEmptyMeeting } from "./planUtils";
import { getNearbyQuarterHourOptions } from "./utils";

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
