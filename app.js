const STORAGE_KEY = "mvp-goals-tracker";

const taskForm = document.querySelector("#taskForm");
const taskTitleInput = document.querySelector("#taskTitle");
const startDateInput = document.querySelector("#startDate");
const endDateInput = document.querySelector("#endDate");
const taskTotalInput = document.querySelector("#taskTotal");
const tasksList = document.querySelector("#tasksList");
const emptyState = document.querySelector("#emptyState");
const taskTemplate = document.querySelector("#taskTemplate");
const summaryCount = document.querySelector("#summaryCount");
const summaryProgress = document.querySelector("#summaryProgress");
const openTaskFormButton = document.querySelector("#openTaskForm");
const taskSheet = document.querySelector("#taskSheet");
const periodButtons = document.querySelectorAll(".period-option");

let tasks = loadTasks();
let periodMode = "month";
let recentlyCompletedTaskId = null;

applyPeriodPreset(periodMode);
render();

openTaskFormButton.addEventListener("click", openTaskSheet);

taskSheet.addEventListener("click", (event) => {
  if (event.target.matches("[data-close-sheet]")) {
    closeTaskSheet();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !taskSheet.hidden) {
    closeTaskSheet();
  }
});

periodButtons.forEach((button) => {
  button.addEventListener("click", () => {
    periodMode = button.dataset.period;
    applyPeriodPreset(periodMode);
  });
});

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = taskTitleInput.value.trim();
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;
  const total = clampNumber(Number(taskTotalInput.value), 1, 999);

  if (!title || !startDate || !endDate) return;

  if (new Date(endDate) < new Date(startDate)) {
    endDateInput.setCustomValidity("Дата окончания должна быть позже даты начала");
    endDateInput.reportValidity();
    return;
  }

  endDateInput.setCustomValidity("");

  tasks.unshift({
    id: createId(),
    title,
    startDate,
    endDate,
    completed: 0,
    total,
  });

  saveTasks();
  taskForm.reset();
  periodMode = "month";
  applyPeriodPreset(periodMode);
  closeTaskSheet();
  render();
});

endDateInput.addEventListener("input", () => {
  endDateInput.setCustomValidity("");
});

function render() {
  tasksList.replaceChildren();

  getSortedTasks().forEach((task) => {
    tasksList.appendChild(createTaskCard(task));
  });

  emptyState.hidden = tasks.length > 0;
  updateSummary();
  recentlyCompletedTaskId = null;
}

function createTaskCard(task) {
  const card = taskTemplate.content.firstElementChild.cloneNode(true);
  const isComplete = isTaskComplete(task);
  const percent = getTaskPercent(task);
  const deadline = getDeadlineState(task);

  card.classList.toggle("is-complete", isComplete);
  card.classList.toggle("is-due-soon", deadline.isSoon && !isComplete);
  card.classList.toggle("just-completed", task.id === recentlyCompletedTaskId);
  card.querySelector(".task-title").textContent = task.title;
  card.querySelector(".task-status").textContent = isComplete ? "✓ Выполнено" : "В процессе";
  card.querySelector(".task-period").textContent = formatPeriod(task.startDate, task.endDate);
  card.querySelector(".task-counter").textContent = `${task.completed} / ${task.total}`;
  card.querySelector(".task-percent").textContent = `${percent}%`;
  const progressFill = card.querySelector(".progress-fill");
  progressFill.style.width = "0%";
  requestAnimationFrame(() => {
    progressFill.style.width = `${percent}%`;
  });
  card.querySelector(".deadline-indicator").style.setProperty("--deadline-progress", `${deadline.percent}%`);

  const decrementButton = card.querySelector('[data-action="decrement"]');
  const incrementButton = card.querySelector('[data-action="increment"]');
  const deleteButton = card.querySelector('[data-action="delete"]');

  decrementButton.disabled = task.completed <= 0;
  incrementButton.disabled = isComplete;

  decrementButton.addEventListener("click", () => {
    task.completed = clampNumber(task.completed - 1, 0, task.total);
    saveTasks();
    render();
  });

  incrementButton.addEventListener("click", () => {
    const wasComplete = isTaskComplete(task);
    task.completed = clampNumber(task.completed + 1, 0, task.total);
    if (!wasComplete && isTaskComplete(task)) {
      recentlyCompletedTaskId = task.id;
    }
    saveTasks();
    render();
  });

  deleteButton.addEventListener("click", () => {
    tasks = tasks.filter((item) => item.id !== task.id);
    saveTasks();
    render();
  });

  return card;
}

function getSortedTasks() {
  return [...tasks].sort((first, second) => {
    const firstEnd = parseInputDate(first.endDate).getTime();
    const secondEnd = parseInputDate(second.endDate).getTime();
    const firstStart = parseInputDate(first.startDate).getTime();
    const secondStart = parseInputDate(second.startDate).getTime();

    return firstEnd - secondEnd || firstStart - secondStart || first.title.localeCompare(second.title);
  });
}

function openTaskSheet() {
  taskSheet.hidden = false;
  requestAnimationFrame(() => {
    taskSheet.classList.add("is-open");
    taskTitleInput.focus();
  });
}

function closeTaskSheet() {
  taskSheet.classList.remove("is-open");
  setTimeout(() => {
    if (!taskSheet.classList.contains("is-open")) {
      taskSheet.hidden = true;
    }
  }, 180);
}

function applyPeriodPreset(mode) {
  periodButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.period === mode);
  });

  startDateInput.disabled = mode !== "custom";
  endDateInput.disabled = mode !== "custom";

  if (mode === "custom") return;

  const start = new Date();
  const end = new Date(start);

  if (mode === "year") {
    end.setFullYear(start.getFullYear() + 1);
  } else {
    end.setMonth(start.getMonth() + 1);
  }

  startDateInput.value = toInputDate(start);
  endDateInput.value = toInputDate(end);
}

function updateSummary() {
  const totalPoints = tasks.reduce((sum, task) => sum + task.total, 0);
  const completedPoints = tasks.reduce((sum, task) => sum + task.completed, 0);
  const percent = totalPoints === 0 ? 0 : Math.round((completedPoints / totalPoints) * 100);

  summaryCount.textContent = formatTasksCount(tasks.length);
  summaryProgress.textContent = `${percent}%`;
}

function loadTasks() {
  try {
    const savedItems = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (!Array.isArray(savedItems)) return [];

    if (savedItems.some((item) => Array.isArray(item.tasks))) {
      return savedItems.flatMap(normalizeGoalAsTasks);
    }

    return savedItems.map(normalizeTask);
  } catch {
    return [];
  }
}

function normalizeGoalAsTasks(goal) {
  const startDate = goal.startDate || toInputDate(new Date());
  const endDate = goal.endDate || startDate;
  const nestedTasks = Array.isArray(goal.tasks) ? goal.tasks : [];

  if (nestedTasks.length === 0) {
    return [
      normalizeTask({
        id: goal.id,
        title: goal.title,
        startDate,
        endDate,
        completed: 0,
        total: 1,
      }),
    ];
  }

  return nestedTasks.map((task) =>
    normalizeTask({
      ...task,
      title: task.title || task.text,
      startDate,
      endDate,
    }),
  );
}

function normalizeTask(task) {
  const total = clampNumber(Number(task.total ?? 1), 1, 999);
  const completed = Number.isFinite(Number(task.completed))
    ? clampNumber(Number(task.completed), 0, total)
    : task.done
      ? total
      : 0;

  return {
    id: task.id || createId(),
    title: task.title || task.text || "Задача",
    startDate: task.startDate || toInputDate(new Date()),
    endDate: task.endDate || task.startDate || toInputDate(new Date()),
    completed,
    total,
  };
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function isTaskComplete(task) {
  return task.total > 0 && task.completed >= task.total;
}

function getTaskPercent(task) {
  return task.total === 0 ? 0 : Math.round((task.completed / task.total) * 100);
}

function getDeadlineState(task) {
  const start = parseInputDate(task.startDate).getTime();
  const end = parseInputDate(task.endDate).getTime();
  const now = Date.now();
  const total = Math.max(end - start, 1);
  const remaining = end - now;
  const percent = clampNumber(((now - start) / total) * 100, 0, 100);
  const soonWindow = Math.max(total * 0.18, 3 * 24 * 60 * 60 * 1000);

  return {
    percent,
    isSoon: remaining <= soonWindow,
  };
}

function toInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatPeriod(startDate, endDate) {
  const formatter = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return `${formatter.format(new Date(startDate))} - ${formatter.format(new Date(endDate))}`;
}

function parseInputDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatTasksCount(count) {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (lastDigit === 1 && lastTwoDigits !== 11) return `${count} задача`;
  if ([2, 3, 4].includes(lastDigit) && ![12, 13, 14].includes(lastTwoDigits)) {
    return `${count} задачи`;
  }

  return `${count} задач`;
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(Math.round(value), min), max);
}

function createId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
