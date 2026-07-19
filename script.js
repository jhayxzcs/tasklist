const STORAGE_KEYS = {
  tasks: "todo_tasks",
  name: "todo_name",
  quote: "todo_quote",
  mood: "todo_mood",
};

let tasks = loadTasks();
let currentFilter = "all";
let currentSort = "dueDate";
let searchTerm = "";
let selectedColor = "#a78bfa";
let taskPendingDeleteId = null;

const taskListEl = document.getElementById("task-list");
const emptyStateEl = document.getElementById("empty-state");
const searchInput = document.getElementById("search-input");
const filterChips = document.getElementById("filter-chips");
const sortCurrent = document.getElementById("sort-current");
const sortDropdown = document.getElementById("sort-dropdown");

const modalOverlay = document.getElementById("modal-overlay");
const modalTitle = document.getElementById("modal-title");
const taskForm = document.getElementById("task-form");
const fabAdd = document.getElementById("fab-add");
const modalClose = document.getElementById("modal-close");
const modalCancel = document.getElementById("modal-cancel");

const confirmOverlay = document.getElementById("confirm-overlay");
const confirmDeleteBtn = document.getElementById("confirm-delete");
const confirmCancelBtn = document.getElementById("confirm-cancel");

const toastContainer = document.getElementById("toast-container");

function loadTasks() {
  const raw = localStorage.getItem(STORAGE_KEYS.tasks);
  return raw ? JSON.parse(raw) : [];
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("out");
    setTimeout(() => toast.remove(), 250);
  }, 2200);
}

const nameEl = document.getElementById("user-name");
const quoteEl = document.getElementById("user-quote");

nameEl.textContent = localStorage.getItem(STORAGE_KEYS.name) || "Jhay";
quoteEl.textContent = localStorage.getItem(STORAGE_KEYS.quote) || "Click here to write your status...";

nameEl.addEventListener("blur", () => {
  const value = nameEl.textContent.trim() || "Jhay";
  nameEl.textContent = value;
  localStorage.setItem(STORAGE_KEYS.name, value);
});

quoteEl.addEventListener("blur", () => {
  const value = quoteEl.textContent.trim() || "Click here to write your status...";
  quoteEl.textContent = value;
  localStorage.setItem(STORAGE_KEYS.quote, value);
});

[nameEl, quoteEl].forEach((el) => {
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      el.blur();
    }
  });
});

const moodCurrent = document.getElementById("mood-current");
const moodDropdown = document.getElementById("mood-dropdown");

const savedMood = localStorage.getItem(STORAGE_KEYS.mood);
if (savedMood) moodCurrent.textContent = savedMood;

moodCurrent.addEventListener("click", (e) => {
  e.stopPropagation();
  moodDropdown.classList.toggle("open");
});

document.querySelectorAll(".mood-option").forEach((btn) => {
  btn.addEventListener("click", () => {
    const mood = btn.dataset.mood;
    moodCurrent.textContent = mood;
    moodCurrent.style.animation = "none";
    void moodCurrent.offsetWidth;
    moodCurrent.style.animation = "checkPop 0.3s ease";
    localStorage.setItem(STORAGE_KEYS.mood, mood);
    moodDropdown.classList.remove("open");
    showToast(`Mood set to ${btn.dataset.label}`, "info");
  });
});

document.addEventListener("click", () => moodDropdown.classList.remove("open"));

const dayEl = document.getElementById("clock-day");
const dateEl = document.getElementById("clock-date");
const timeEl = document.getElementById("clock-time");

function updateClock() {
  const now = new Date();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  dayEl.textContent = days[now.getDay()];
  dateEl.textContent = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  timeEl.textContent = `${hours}:${minutes}:${seconds} ${ampm}`;
}

updateClock();
setInterval(updateClock, 1000);

function getFilteredSortedTasks() {
  let list = [...tasks];

  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    list = list.filter(
      (t) =>
        t.title.toLowerCase().includes(term) ||
        t.description.toLowerCase().includes(term) ||
        t.category.toLowerCase().includes(term)
    );
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  if (currentFilter === "active") list = list.filter((t) => !t.completed);
  if (currentFilter === "completed") list = list.filter((t) => t.completed);
  if (currentFilter === "today") list = list.filter((t) => t.dueDate === todayStr);
  if (currentFilter === "high") list = list.filter((t) => t.priority === "high");

  if (currentSort === "dueDate") {
    list.sort((a, b) => new Date(a.dueDate || "9999-12-31") - new Date(b.dueDate || "9999-12-31"));
  } else if (currentSort === "priority") {
    const rank = { high: 0, medium: 1, low: 2 };
    list.sort((a, b) => rank[a.priority] - rank[b.priority]);
  }

  return list;
}

function isOverdue(task) {
  if (task.completed || !task.dueDate) return false;
  const due = new Date(`${task.dueDate}T${task.dueTime || "23:59"}`);
  return due < new Date();
}

function renderTasks() {
  const list = getFilteredSortedTasks();
  taskListEl.innerHTML = "";

  emptyStateEl.classList.toggle("show", list.length === 0);

  list.forEach((task) => {
    const overdue = isOverdue(task);

    const card = document.createElement("div");
    card.className = `task-card card${task.completed ? " completed" : ""}${overdue ? " overdue" : ""}`;
    card.dataset.id = task.id;

    card.innerHTML = `
      <div class="task-color-bar" style="background:${task.color}"></div>
      <button class="task-checkbox ${task.completed ? "checked" : ""}" data-action="toggle"></button>
      <div class="task-body">
        <div class="task-title-row">
          <span class="task-title">${escapeHtml(task.title)}</span>
        </div>
        ${task.description ? `<div class="task-desc">${escapeHtml(task.description)}</div>` : ""}
        <div class="task-meta">
          ${task.category ? `<span class="tag">${escapeHtml(task.category)}</span>` : ""}
          <span class="tag priority-${task.priority}">${task.priority}</span>
          ${task.dueDate ? `<span class="tag">${formatDate(task.dueDate)}${task.dueTime ? " · " + formatTime(task.dueTime) : ""}</span>` : ""}
          ${overdue ? `<span class="tag overdue-tag">Overdue</span>` : ""}
        </div>
      </div>
      <div class="task-actions">
        <button data-action="edit" title="Edit">✏️</button>
        <button data-action="delete" title="Delete">🗑️</button>
      </div>
    `;

    taskListEl.appendChild(card);
  });

  updateDashboard();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatTime(timeStr) {
  const [h, m] = timeStr.split(":");
  let hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${m} ${ampm}`;
}

taskListEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const card = e.target.closest(".task-card");
  const id = card.dataset.id;
  const action = btn.dataset.action;

  if (action === "toggle") toggleComplete(id);
  if (action === "edit") openEditModal(id);
  if (action === "delete") openConfirmDelete(id);
});

const statTotal = document.getElementById("stat-total");
const statCompleted = document.getElementById("stat-completed");
const statPending = document.getElementById("stat-pending");
const progressPercentEl = document.getElementById("progress-percent");
const progressRingFill = document.getElementById("progress-ring-fill");

const RING_CIRCUMFERENCE = 2 * Math.PI * 30;

function updateDashboard() {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const pending = total - completed;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  statTotal.textContent = total;
  statCompleted.textContent = completed;
  statPending.textContent = pending;
  progressPercentEl.textContent = percent + "%";

  const offset = RING_CIRCUMFERENCE - (percent / 100) * RING_CIRCUMFERENCE;
  progressRingFill.style.strokeDasharray = RING_CIRCUMFERENCE;
  progressRingFill.style.strokeDashoffset = offset;
}

const titleInput = document.getElementById("task-title");
const descInput = document.getElementById("task-description");
const categoryInput = document.getElementById("task-category");
const priorityInput = document.getElementById("task-priority");
const priorityCurrent = document.getElementById("priority-current");
const priorityDropdown = document.getElementById("priority-dropdown");
const dateInput = document.getElementById("task-date");
const timeInput = document.getElementById("task-time");
const idInput = document.getElementById("task-id");
const colorPicker = document.getElementById("color-picker");

function setPriority(value) {
  priorityInput.value = value;
  const option = document.querySelector(`.priority-option[data-priority="${value}"]`);
  priorityCurrent.textContent = option ? option.textContent : value;
  document.querySelectorAll(".priority-option").forEach((b) => b.classList.remove("active"));
  if (option) option.classList.add("active");
}

priorityCurrent.addEventListener("click", (e) => {
  e.stopPropagation();
  priorityDropdown.classList.toggle("open");
});

document.querySelectorAll(".priority-option").forEach((btn) => {
  btn.addEventListener("click", () => {
    setPriority(btn.dataset.priority);
    priorityDropdown.classList.remove("open");
  });
});

document.addEventListener("click", () => priorityDropdown.classList.remove("open"));

function openAddModal() {
  taskForm.reset();
  idInput.value = "";
  modalTitle.textContent = "Add Task";
  selectedColor = "#a78bfa";
  setSelectedColorDot();
  setPriority("medium");
  modalOverlay.classList.add("open");
  setTimeout(() => titleInput.focus(), 50);
}

function openEditModal(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  idInput.value = task.id;
  titleInput.value = task.title;
  descInput.value = task.description;
  categoryInput.value = task.category;
  setPriority(task.priority);
  dateInput.value = task.dueDate;
  timeInput.value = task.dueTime;
  selectedColor = task.color;
  setSelectedColorDot();

  modalTitle.textContent = "Edit Task";
  modalOverlay.classList.add("open");
  setTimeout(() => titleInput.focus(), 50);
}

function closeModal() {
  modalOverlay.classList.remove("open");
}

function setSelectedColorDot() {
  document.querySelectorAll(".color-dot").forEach((dot) => {
    dot.classList.toggle("selected", dot.dataset.color === selectedColor);
  });
}

colorPicker.addEventListener("click", (e) => {
  const dot = e.target.closest(".color-dot");
  if (!dot) return;
  selectedColor = dot.dataset.color;
  setSelectedColorDot();
});

fabAdd.addEventListener("click", openAddModal);
modalClose.addEventListener("click", closeModal);
modalCancel.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});

titleInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    taskForm.requestSubmit();
  }
});

taskForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const id = idInput.value;
  const taskData = {
    title: titleInput.value.trim(),
    description: descInput.value.trim(),
    category: categoryInput.value.trim(),
    priority: priorityInput.value,
    dueDate: dateInput.value,
    dueTime: timeInput.value,
    color: selectedColor,
  };

  if (!taskData.title) return;

  if (id) {
    updateTask(id, taskData);
  } else {
    createTask(taskData);
  }

  closeModal();
});

function createTask(data) {
  const task = {
    id: Date.now().toString(),
    ...data,
    completed: false,
  };
  tasks.push(task);
  saveTasks();
  renderTasks();
  showToast("Task added", "success");
}

function updateTask(id, data) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  Object.assign(task, data);
  saveTasks();
  renderTasks();
  showToast("Task updated", "info");
}

function toggleComplete(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  saveTasks();
  renderTasks();
}

function openConfirmDelete(id) {
  taskPendingDeleteId = id;
  confirmOverlay.classList.add("open");
}

function closeConfirmDelete() {
  confirmOverlay.classList.remove("open");
  taskPendingDeleteId = null;
}

confirmCancelBtn.addEventListener("click", closeConfirmDelete);
confirmOverlay.addEventListener("click", (e) => {
  if (e.target === confirmOverlay) closeConfirmDelete();
});

confirmDeleteBtn.addEventListener("click", () => {
  if (!taskPendingDeleteId) return;

  const idToDelete = taskPendingDeleteId;
  const card = taskListEl.querySelector(`.task-card[data-id="${idToDelete}"]`);
  closeConfirmDelete();

  if (card) {
    card.classList.add("removing");
    setTimeout(() => {
      tasks = tasks.filter((t) => t.id !== idToDelete);
      saveTasks();
      renderTasks();
      showToast("Task deleted", "danger");
    }, 280);
  } else {
    tasks = tasks.filter((t) => t.id !== idToDelete);
    saveTasks();
    renderTasks();
  }
});

searchInput.addEventListener("input", (e) => {
  searchTerm = e.target.value;
  renderTasks();
});

filterChips.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
  chip.classList.add("active");
  currentFilter = chip.dataset.filter;
  renderTasks();
});

sortCurrent.addEventListener("click", (e) => {
  e.stopPropagation();
  sortDropdown.classList.toggle("open");
});

document.querySelectorAll(".sort-option").forEach((btn) => {
  btn.addEventListener("click", () => {
    currentSort = btn.dataset.sort;
    sortCurrent.textContent = btn.textContent;
    document.querySelectorAll(".sort-option").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    sortDropdown.classList.remove("open");
    renderTasks();
  });
});

document.addEventListener("click", () => sortDropdown.classList.remove("open"));

setSelectedColorDot();
renderTasks();

const preloader = document.getElementById("preloader");
const appEl = document.getElementById("app");

window.addEventListener("load", () => {
  setTimeout(() => {
    preloader.classList.add("hidden");
    appEl.classList.add("revealed");
  }, 350);
});