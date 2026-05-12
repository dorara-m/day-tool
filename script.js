const reportDateInput = document.getElementById("report-date");
const startTimeInput = document.getElementById("start-time");
const endTimeInput = document.getElementById("end-time");
const breakStartInput = document.getElementById("break-start");
const breakEndInput = document.getElementById("break-end");
const workTimeDisplay = document.getElementById("work-time");
const tasksContainer = document.getElementById("tasks");
const addTaskButton = document.getElementById("add-task");
const generateButton = document.getElementById("generate");
const copyButton = document.getElementById("copy");
const output = document.getElementById("output");

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function init() {
  const today = new Date();
  reportDateInput.value = today.toISOString().slice(0, 10);
  addTask();
  addTask();
  addTaskButton.addEventListener("click", addTask);
  [startTimeInput, endTimeInput, breakStartInput, breakEndInput].forEach((input) => {
    input.addEventListener("change", updateWorkTime);
  });
  generateButton.addEventListener("click", generateReport);
  copyButton.addEventListener("click", copyReport);
}

function addTask() {
  const task = document.createElement("div");
  task.className = "task";
  task.innerHTML = `
    <div class="task-row">
      <input type="text" class="task-name" placeholder="タスク名" />
      <input type="number" min="0" step="0.25" class="task-hours" placeholder="時間" />
      <input type="text" class="task-status" placeholder="進捗 or 状況" />
    </div>
    <div class="task-actions">
      <button type="button" class="secondary remove-task">削除</button>
    </div>
  `;

  task.querySelector(".remove-task").addEventListener("click", () => {
    task.remove();
  });

  tasksContainer.appendChild(task);
}

function parseTime(value) {
  if (!value) return null;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function formatHours(minutes) {
  return (minutes / 60).toFixed(2).replace(/\.00$/, "");
}

function updateWorkTime() {
  const start = parseTime(startTimeInput.value);
  const end = parseTime(endTimeInput.value);
  const breakStart = parseTime(breakStartInput.value);
  const breakEnd = parseTime(breakEndInput.value);

  if (start == null || end == null) {
    workTimeDisplay.textContent = "0.00h";
    return;
  }

  let total = end - start;
  if (total < 0) {
    total = 0;
  }
  if (breakStart != null && breakEnd != null && breakEnd > breakStart) {
    const breakMinutes = breakEnd - breakStart;
    total -= breakMinutes;
  }
  workTimeDisplay.textContent = `${formatHours(total)}h`;
}

function getWeekday(dateString) {
  const date = new Date(dateString);
  return WEEKDAYS[date.getDay()];
}

function normalizeTaskText(name, hours, status) {
  let line = `・${name}`;
  if (hours !== "" && !isNaN(hours)) {
    line += `（${parseFloat(hours)}h`;
    if (status) {
      line += `（${status}`;
    }
    line += `）`;
  } else if (status) {
    line += `（${status}）`;
  }
  return line;
}

function generateReport() {
  const dateValue = reportDateInput.value;
  if (!dateValue) {
    alert("日付を入力してください。");
    return;
  }

  const start = startTimeInput.value;
  const end = endTimeInput.value;
  const breakStart = breakStartInput.value;
  const breakEnd = breakEndInput.value;
  const workTime = workTimeDisplay.textContent.replace(/h$/, "");

  const tasks = Array.from(document.querySelectorAll(".task")).map((task) => {
    const name = task.querySelector(".task-name").value.trim();
    const hours = task.querySelector(".task-hours").value.trim();
    const status = task.querySelector(".task-status").value.trim();
    return { name, hours, status };
  }).filter((item) => item.name || item.hours || item.status);

  if (tasks.length === 0) {
    alert("少なくとも1つの稼働内容を入力してください。");
    return;
  }

  const header = `【稼働終了報告 ${dateValue.slice(5).replace("-", "月")}日(${getWeekday(dateValue)})】`;
  const lines = [
    header,
    "お疲れ様です。",
    "本日の稼働を終了します。",
    `・稼働時間　${start}～${end}（実働${workTime}時間）`,
  ];

  if (breakStart && breakEnd) {
    const breakMinutes = parseTime(breakEnd) - parseTime(breakStart);
    const breakHours = formatHours(breakMinutes);
    lines.push(`・休憩時間　${breakStart}～${breakEnd}（${breakHours}h）`);
  }

  lines.push("", "【稼動内容】");
  tasks.forEach((task) => {
    lines.push(normalizeTaskText(task.name || "未入力", task.hours || "", task.status || ""));
  });

  output.value = lines.join("\n");
}

function copyReport() {
  if (!output.value) {
    alert("まず日報を生成してください。");
    return;
  }
  navigator.clipboard.writeText(output.value)
    .then(() => {
      alert("日報をクリップボードにコピーしました。");
    })
    .catch(() => {
      alert("コピーに失敗しました。ブラウザの権限を確認してください。");
    });
}

init();
