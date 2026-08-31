export const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export const parseTime = (value) => {
  if (!value) return null;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
};

export const QUARTER_HOUR_OPTIONS = Array.from({ length: 96 }, (_, index) => {
  const totalMinutes = index * 15;
  const hour = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minute = (totalMinutes % 60).toString().padStart(2, "0");
  return `${hour}:${minute}`;
});

export const getNearbyQuarterHourOptions = (time, spanMinutes = 120) => {
  const center = parseTime(time);
  if (center == null) return QUARTER_HOUR_OPTIONS;
  const min = Math.max(0, center - spanMinutes);
  const max = Math.min(23 * 60 + 45, center + spanMinutes);
  return QUARTER_HOUR_OPTIONS.filter((option) => {
    const mins = parseTime(option);
    return mins != null && mins >= min && mins <= max;
  });
};

export const formatHours = (minutes) => {
  return (minutes / 60).toFixed(2).replace(/\.00$/, "");
};

/** 実働・休憩など日報用の時間表記（整数時間は小数なし） */
export const formatHoursForReport = (minutes) => {
  if (minutes <= 0) return "0";
  const h = minutes / 60;
  if (Number.isInteger(h)) return String(h);
  return h.toFixed(2).replace(/\.?0+$/, "");
};

/** YYYY-MM-DD → 05月18日（先頭ゼロ付き） */
export const formatReportDateLabel = (dateString) => {
  const [, month, day] = dateString.split("-");
  return `${month ?? ""}月${day ?? ""}日`;
};

export const getWeekday = (dateString) => {
  const date = new Date(dateString + "T12:00:00");
  return WEEKDAYS[date.getDay()];
};

export const formatHoursValue = (n) => {
  if (Number.isInteger(n)) return String(n);
  return String(n).replace(/\.0+$/, "");
};

/** 入力内容の一時保存用（保存/読み込みに失敗しても無視する） */
export const loadState = (key, fallback) => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const saveState = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 保存できない環境（プライベートモード等）では諦める
  }
};
