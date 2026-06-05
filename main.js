const monthTitle = document.getElementById("month-title");
const calendarGrid = document.getElementById("calendar-grid");
const todayButton = document.getElementById("today-button");
const prevButton = document.getElementById("prev-button");
const nextButton = document.getElementById("next-button");
const loginButton = document.getElementById("login-button");
const logoutButton = document.getElementById("logout-button");
const newEventButton = document.getElementById("new-event-button");
const authStatus = document.getElementById("auth-status");
const authHint = document.getElementById("auth-hint");
const permissionsNote = document.getElementById("permissions-note");
const authDialog = document.getElementById("auth-dialog");
const authForm = document.getElementById("auth-form");
const closeAuthDialog = document.getElementById("close-auth-dialog");
const authCancel = document.getElementById("auth-cancel");
const authUsername = document.getElementById("auth-username");
const authPassword = document.getElementById("auth-password");
const eventDialog = document.getElementById("event-dialog");
const eventForm = document.getElementById("event-form");
const closeEventDialog = document.getElementById("close-event-dialog");
const eventCancel = document.getElementById("event-cancel");
const eventDate = document.getElementById("event-date");
const eventTime = document.getElementById("event-time");
const eventTitle = document.getElementById("event-title");
const eventType = document.getElementById("event-type");
const eventNotes = document.getElementById("event-notes");
const selectedDateLabel = document.getElementById("selected-date-label");
const selectedDaySummary = document.getElementById("selected-day-summary");
const upcomingList = document.getElementById("upcoming-list");
const statQueue = document.getElementById("stat-queue");
const statPrinting = document.getElementById("stat-printing");
const statDone = document.getElementById("stat-done");

const STORAGE_KEY = "urt-calendar-events-v1";
const SESSION_KEY = "urt-calendar-session-v1";

const accounts = [
  { username: "ospite", password: "guest3d", label: "Ospite", role: "viewer", canEdit: false },
  { username: "operatore", password: "print3d", label: "Operatore", role: "editor", canEdit: true },
  { username: "responsabile", password: "teamfsae", label: "Responsabile", role: "admin", canEdit: true },
];

const monthFormatter = new Intl.DateTimeFormat("it-IT", {
  month: "long",
  year: "numeric",
});

const dayFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  weekday: "long",
  month: "long",
});

const shortDayFormatter = new Intl.DateTimeFormat("it-IT", { day: "numeric" });

const defaultEvents = [
  {
    date: "2026-06-03",
    title: "Supporto ala posteriore",
    type: "priority",
    time: "09:30",
    notes: "Stampa in PLA ad alta rigidità, verifica fori inserto dopo il raffreddamento.",
  },
  {
    date: "2026-06-05",
    title: "Dima freno anteriore",
    type: "printing",
    time: "11:00",
    notes: "Monitorare primo layer e temperatura camera.",
  },
  {
    date: "2026-06-05",
    title: "Cover sensori",
    type: "setup",
    time: "15:30",
    notes: "File pronto per slicing e orientamento finale da confermare.",
  },
  {
    date: "2026-06-07",
    title: "Spool check e ricarica",
    type: "service",
    time: "18:00",
    notes: "Aggiornare stock materiali e segnare bobine residue.",
  },
  {
    date: "2026-06-10",
    title: "Carter elettronica",
    type: "priority",
    time: "10:15",
    notes: "Richiesta del reparto elettrico con priorità alta.",
  },
  {
    date: "2026-06-13",
    title: "Inserti mockup cockpit",
    type: "setup",
    time: "14:00",
    notes: "Controllo tolleranze prima della finitura.",
  },
  {
    date: "2026-06-17",
    title: "Supporto sensore ABS",
    type: "printing",
    time: "12:45",
    notes: "Test funzionale dopo il post-processing.",
  },
  {
    date: "2026-06-21",
    title: "Riorganizzazione coda",
    type: "service",
    time: "17:30",
    notes: "Pulizia coda e priorità sprint successivo.",
  },
];

let currentView = new Date(2026, 5, 1);
let selectedDateKey = "2026-06-05";
let currentUser = loadSession();
let events = loadEvents();
authUsername.innerHTML = accounts

function cloneDefaultEvents() {
  return defaultEvents.map((event) => ({ ...event }));
}

function loadEvents() {
  try {
    const storedEvents = localStorage.getItem(STORAGE_KEY);
    if (!storedEvents) {
      return cloneDefaultEvents();
    }

    const parsedEvents = JSON.parse(storedEvents);
    if (!Array.isArray(parsedEvents)) {
      return cloneDefaultEvents();
    }

    return parsedEvents.filter((event) => event && event.date && event.title && event.time && event.type && event.notes);
  } catch {
    return cloneDefaultEvents();
  }
}

function saveEvents() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function loadSession() {
  try {
    const storedSession = sessionStorage.getItem(SESSION_KEY);
    if (!storedSession) {
      return null;
    }

    const parsedSession = JSON.parse(storedSession);
    return accounts.find((account) => account.username === parsedSession?.username) ?? null;
  } catch {
    return null;
  }
}

function saveSession() {
  if (!currentUser) {
    sessionStorage.removeItem(SESSION_KEY);
    return;
  }

  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ username: currentUser.username }));
}

function canEdit() {
  return Boolean(currentUser?.canEdit);
}

function getAccountByUsername(username) {
  return accounts.find((account) => account.username === username) ?? null;
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function parseDate(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function groupedEvents() {
  return events.reduce((accumulator, event) => {
    if (!accumulator.has(event.date)) {
      accumulator.set(event.date, []);
    }
    accumulator.get(event.date).push(event);
    return accumulator;
  }, new Map());
}

function eventLabel(type) {
  if (type === "priority") return "Priorità alta";
  if (type === "printing") return "In stampa";
  if (type === "setup") return "Setup";
  return "Servizio";
}

function eventBadgeClass(type) {
  if (type === "service") return "blocked";
  if (type === "printing") return "active";
  return "ready";
}

function updateAuthUi() {
  if (currentUser) {
    authStatus.textContent = `${currentUser.label} collegato`;
    authHint.textContent = currentUser.canEdit
      ? "Hai i permessi per modificare priorità e aggiungere eventi."
      : "Il tuo account può solo visualizzare il calendario.";
    logoutButton.hidden = false;
    loginButton.textContent = "Account";
    newEventButton.hidden = !currentUser.canEdit;
    permissionsNote.textContent = currentUser.canEdit
      ? `Accesso attivo per ${currentUser.label}: puoi aggiungere eventi e aggiornare priorità.`
      : `Accesso attivo per ${currentUser.label}: modalità sola lettura.`;
    return;
  }

  authStatus.textContent = "Modalità ospite";
  authHint.textContent = "Solo gli account autorizzati possono modificare priorità e aggiungere eventi.";
  logoutButton.hidden = true;
  loginButton.textContent = "Accedi";
  newEventButton.hidden = true;
  permissionsNote.textContent = "Sei in sola visualizzazione. Accedi con un account autorizzato per modificare la pianificazione.";
}

function renderCalendar() {
  const monthStart = startOfMonth(currentView);
  const firstVisibleDay = new Date(monthStart);
  firstVisibleDay.setDate(monthStart.getDate() - ((monthStart.getDay() + 6) % 7));

  monthTitle.textContent = monthFormatter.format(monthStart);
  calendarGrid.innerHTML = "";

  const eventsByDate = groupedEvents();
  const todayKey = dateKey(new Date());
  const selectedKey = selectedDateKey;
  const totalCells = 42;

  for (let index = 0; index < totalCells; index += 1) {
    const cellDate = new Date(firstVisibleDay);
    cellDate.setDate(firstVisibleDay.getDate() + index);

    const cellKey = dateKey(cellDate);
    const dayEvents = eventsByDate.get(cellKey) ?? [];
    const isOutsideMonth = cellDate.getMonth() !== monthStart.getMonth();
    const isToday = cellKey === todayKey;
    const isSelected = cellKey === selectedKey;

    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = ["day-cell", isOutsideMonth ? "outside" : "", isToday ? "today" : "", isSelected ? "selected" : ""]
      .filter(Boolean)
      .join(" ");
    cell.dataset.date = cellKey;
    cell.setAttribute("aria-label", dayFormatter.format(cellDate));

    cell.innerHTML = `
      <span class="day-number">${shortDayFormatter.format(cellDate)}</span>
      <div class="event-stack">
        ${dayEvents
          .slice(0, 3)
          .map(
            (event) => `
              <span class="event-pill ${event.type}">${event.time} · ${event.title}</span>
            `,
          )
          .join("")}
      </div>
    `;

    cell.addEventListener("click", () => {
      selectedDateKey = cellKey;
      renderCalendar();
      renderSelectedDay();
    });

    calendarGrid.appendChild(cell);
  }
}

function renderSelectedDay() {
  const eventsByDate = groupedEvents();
  const selectedDate = parseDate(selectedDateKey);
  const dayEvents = eventsByDate.get(selectedDateKey) ?? [];

  selectedDateLabel.textContent = dayFormatter.format(selectedDate);

  if (dayEvents.length === 0) {
    selectedDaySummary.innerHTML = `
      <p class="summary-empty">Nessuna stampa pianificata per questo giorno. Puoi usare questa vista per aggiungere un nuovo job o tenere libero il banco.</p>
    `;
    return;
  }

  selectedDaySummary.innerHTML = dayEvents
    .map(
      (event) => `
        <article class="summary-card">
          <p class="summary-title">${event.time} · ${event.title}</p>
          <p class="summary-meta">${eventLabel(event.type)}</p>
          <p class="summary-meta">${event.notes}</p>
          ${
            canEdit()
              ? `
                <label class="field field-inline">
                  <span>Priorità / stato</span>
                  <select data-event-date="${event.date}" data-event-time="${event.time}" class="event-type-select">
                    <option value="priority" ${event.type === "priority" ? "selected" : ""}>Priorità alta</option>
                    <option value="printing" ${event.type === "printing" ? "selected" : ""}>In stampa</option>
                    <option value="setup" ${event.type === "setup" ? "selected" : ""}>Setup</option>
                    <option value="service" ${event.type === "service" ? "selected" : ""}>Servizio</option>
                  </select>
                </label>
              `
              : ""
          }
        </article>
      `,
    )
    .join("");

  selectedDaySummary.querySelectorAll(".event-type-select").forEach((selectElement) => {
    selectElement.addEventListener("change", (event) => {
      if (!canEdit()) {
        return;
      }

      const target = event.currentTarget;
      const targetDate = target.dataset.eventDate;
      const targetTime = target.dataset.eventTime;
      const nextType = target.value;
      const matchedEvent = events.find((item) => item.date === targetDate && item.time === targetTime);

      if (!matchedEvent) {
        return;
      }

      matchedEvent.type = nextType;
      saveEvents();
      renderCalendar();
      renderSelectedDay();
      renderUpcoming();
      renderStats();
    });
  });
}

function renderUpcoming() {
  const nextEvents = [...events]
    .sort((left, right) => left.date.localeCompare(right.date) || left.time.localeCompare(right.time))
    .slice(0, 5);

  upcomingList.innerHTML = nextEvents
    .map(
      (event) => `
        <li>
          <div class="task-topline">
            <span>${event.title}</span>
            <span class="task-badge ${event.type === "service" ? "blocked" : event.type === "printing" ? "active" : "ready"}">${eventLabel(event.type)}</span>
          </div>
          <div class="task-meta">${dayFormatter.format(parseDate(event.date))} · ${event.time}</div>
        </li>
      `,
    )
    .join("");
}

function renderStats() {
  const todayKey = dateKey(new Date());
  const queue = events.filter((event) => event.date >= todayKey && event.type !== "service").length;
  const printing = events.filter((event) => event.type === "printing").length;
  const done = 12;

  statQueue.textContent = String(queue);
  statPrinting.textContent = String(printing);
  statDone.textContent = String(done);
}

function openAuthDialog() {
  authUsername.value = "";
  authPassword.value = "";

  if (typeof authDialog.showModal === "function") {
    authDialog.showModal();
    return;
  }

  authDialog.setAttribute("open", "");
}

function openEventDialog() {
  eventDate.value = selectedDateKey;
  eventTime.value = "09:00";
  eventTitle.value = "";
  eventType.value = "priority";
  eventNotes.value = "";
  if (typeof eventDialog.showModal === "function") {
    eventDialog.showModal();
    return;
  }

  eventDialog.setAttribute("open", "");
}

function closeDialog(dialogElement) {
  if (dialogElement.open) {
    dialogElement.close();
    return;
  }

  dialogElement.removeAttribute("open");
}

function normalizeType(type) {
  if (type === "priority" || type === "printing" || type === "setup" || type === "service") {
    return type;
  }

  return "priority";
}

function createEvent() {
  if (!canEdit()) {
    return;
  }

  const nextEvent = {
    date: eventDate.value,
    time: eventTime.value,
    title: eventTitle.value.trim(),
    type: normalizeType(eventType.value),
    notes: eventNotes.value.trim(),
  };

  events = [...events, nextEvent].sort((left, right) => left.date.localeCompare(right.date) || left.time.localeCompare(right.time));
  saveEvents();
  selectedDateKey = nextEvent.date;
  currentView = startOfMonth(parseDate(nextEvent.date));
  closeDialog(eventDialog);
  renderCalendar();
  renderSelectedDay();
  renderUpcoming();
  renderStats();
}

function goToToday() {
  const today = new Date();
  currentView = startOfMonth(today);
  selectedDateKey = dateKey(today);
  renderCalendar();
  renderSelectedDay();
}

todayButton.addEventListener("click", goToToday);
prevButton.addEventListener("click", () => {
  currentView = addMonths(currentView, -1);
  renderCalendar();
});
nextButton.addEventListener("click", () => {
  currentView = addMonths(currentView, 1);
  renderCalendar();
});

loginButton.addEventListener("click", openAuthDialog);
logoutButton.addEventListener("click", () => {
  currentUser = null;
  saveSession();
  updateAuthUi();
  renderSelectedDay();
});

newEventButton.addEventListener("click", openEventDialog);
closeAuthDialog.addEventListener("click", () => closeDialog(authDialog));
authCancel.addEventListener("click", () => closeDialog(authDialog));
closeEventDialog.addEventListener("click", () => closeDialog(eventDialog));
eventCancel.addEventListener("click", () => closeDialog(eventDialog));

authForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const account = getAccountByUsername(authUsername.value.trim());
  if (!account || account.password !== authPassword.value) {
    authHint.textContent = "Credenziali non valide. Controlla account e password demo.";
    return;
  }

  currentUser = account;
  saveSession();
  updateAuthUi();
  closeDialog(authDialog);
  renderSelectedDay();
});

eventForm.addEventListener("submit", (event) => {
  event.preventDefault();
  createEvent();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeDialog(authDialog);
    closeDialog(eventDialog);
  }
});

updateAuthUi();
renderStats();
renderUpcoming();
renderCalendar();
renderSelectedDay();
