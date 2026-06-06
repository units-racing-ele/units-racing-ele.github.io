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
const eventPriority = document.getElementById("event-priority");
const eventNotes = document.getElementById("event-notes");
const eventFormMessage = document.getElementById("event-form-message");
const selectedDateLabel = document.getElementById("selected-date-label");
const selectedDaySummary = document.getElementById("selected-day-summary");
const upcomingList = document.getElementById("upcoming-list");
const statQueue = document.getElementById("stat-queue");
const statPrinting = document.getElementById("stat-printing");
const statDone = document.getElementById("stat-done");

const STORAGE_KEY = "urt-calendar-events-v1";
const SESSION_KEY = "urt-calendar-session-v1";
const SUPABASE_URL = "https://hlpnlwtrjgxxkqnnuqfy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscG5sd3Ryamd4eGtxbm51cWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NDA3NzYsImV4cCI6MjA5NjMxNjc3Nn0.erK5_oh75YiZtXSOa6mEgEBghPRQ6r9vQ0zY4fJ8AMs";
const SUPABASE_TABLE = "events";
const HAS_SUPABASE_CONFIG =
  !SUPABASE_URL.includes("YOUR_PROJECT_ID") && !SUPABASE_ANON_KEY.includes("YOUR_SUPABASE_ANON_KEY");

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
    priority: "high",
    time: "09:30",
    notes: "Stampa in PLA ad alta rigidità, verifica fori inserto dopo il raffreddamento.",
  },
  {
    date: "2026-06-05",
    title: "Dima freno anteriore",
    type: "printing",
    priority: "high",
    time: "11:00",
    notes: "Monitorare primo layer e temperatura camera.",
  },
  {
    date: "2026-06-05",
    title: "Cover sensori",
    type: "setup",
    priority: "medium",
    time: "15:30",
    notes: "File pronto per slicing e orientamento finale da confermare.",
  },
  {
    date: "2026-06-07",
    title: "Spool check e ricarica",
    type: "service",
    priority: "low",
    time: "18:00",
    notes: "Aggiornare stock materiali e segnare bobine residue.",
  },
  {
    date: "2026-06-10",
    title: "Carter elettronica",
    type: "priority",
    priority: "high",
    time: "10:15",
    notes: "Richiesta del reparto elettrico con priorità alta.",
  },
  {
    date: "2026-06-13",
    title: "Inserti mockup cockpit",
    type: "setup",
    priority: "medium",
    time: "14:00",
    notes: "Controllo tolleranze prima della finitura.",
  },
  {
    date: "2026-06-17",
    title: "Supporto sensore ABS",
    type: "printing",
    priority: "high",
    time: "12:45",
    notes: "Test funzionale dopo il post-processing.",
  },
  {
    date: "2026-06-21",
    title: "Riorganizzazione coda",
    type: "service",
    priority: "low",
    time: "17:30",
    notes: "Pulizia coda e priorità sprint successivo.",
  },
];

let currentView = new Date(2026, 5, 1);
let selectedDateKey = "2026-06-05";
let currentUser = loadSession();
let events = [];
let editingEventId = null;

function cloneDefaultEvents() {
  return defaultEvents.map((event) => ({ ...event }));
}

function ensureEventId(event) {
  return event.id ?? `${event.date}-${event.time}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeEvents(records) {
  return records
    .filter((event) => event && event.date && event.title && event.time && event.type && event.notes)
    .map((event) => ({
      ...event,
      id: ensureEventId(event),
      priority: normalizePriority(event.priority ?? event.type),
    }));
}

function getLocalEvents() {
  try {
    const storedEvents = localStorage.getItem(STORAGE_KEY);
    if (!storedEvents) {
      return cloneDefaultEvents();
    }

    const parsedEvents = JSON.parse(storedEvents);
    if (!Array.isArray(parsedEvents)) {
      return cloneDefaultEvents();
    }

    return normalizeEvents(parsedEvents);
  } catch {
    return cloneDefaultEvents();
  }
}

function getSeedEvents() {
  return normalizeEvents(defaultEvents).map((event) => ({ ...event }));
}

function supabaseHeaders(includeJson = false) {
  return {
    apikey: SUPABASE_ANON_KEY,
    ...(includeJson ? { "Content-Type": "application/json" } : {}),
  };
}

async function loadEvents() {
  if (!HAS_SUPABASE_CONFIG) {
    return getLocalEvents();
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?select=*&order=date.asc,time.asc`, {
    headers: supabaseHeaders(),
  });

  if (!response.ok) {
    console.warn("Supabase load failed, falling back to localStorage", response.status, response.statusText);
    authHint.textContent = "Supabase configurato, ma la tabella events non e' ancora pronta. Il sito sta usando il salvataggio locale finche' non crei la tabella events.";
    return getLocalEvents();
  }

  const data = await response.json();
  if (!data || data.length === 0) {
    const seedEvents = getSeedEvents();
    const seedResponse = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`, {
      method: "POST",
      headers: {
        ...supabaseHeaders(true),
        Prefer: "return=representation",
      },
      body: JSON.stringify(seedEvents),
    });

    if (seedResponse.ok) {
      return seedEvents;
    }
  }

  return normalizeEvents(data ?? []);
}

function saveLocalEvents() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

async function initSupabaseClient() {
  return HAS_SUPABASE_CONFIG ? true : null;
}

async function persistEventRecord(event) {
  if (!HAS_SUPABASE_CONFIG) {
    saveLocalEvents();
    return;
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?on_conflict=id`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(true),
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    throw new Error(`Supabase save failed (${response.status})`);
  }
}

async function removeEventRecord(eventId) {
  if (!HAS_SUPABASE_CONFIG) {
    saveLocalEvents();
    return;
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?id=eq.${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    headers: supabaseHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Supabase delete failed (${response.status})`);
  }
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
  // use local date components to avoid UTC shifts from toISOString()
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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

function priorityLabel(priority) {
  if (priority === "high") return "Alta";
  if (priority === "low") return "Bassa";
  return "Media";
}

function priorityBadgeClass(priority) {
  if (priority === "high") return "high";
  if (priority === "low") return "low";
  return "medium";
}

function updateAuthUi() {
  const syncMode = HAS_SUPABASE_CONFIG ? "Sincronizzazione condivisa attiva" : "Salvataggio locale attivo";

  if (currentUser) {
    authStatus.textContent = `${currentUser.label} collegato`;
    authHint.textContent = currentUser.canEdit
      ? `Hai i permessi per modificare priorità e aggiungere eventi. ${syncMode}.`
      : `Il tuo account può solo visualizzare il calendario. ${syncMode}.`;
    logoutButton.hidden = false;
    loginButton.textContent = "Account";
    newEventButton.hidden = !currentUser.canEdit;
    permissionsNote.textContent = currentUser.canEdit
      ? `Accesso attivo per ${currentUser.label}: puoi aggiungere eventi e aggiornare priorità. ${syncMode}.`
      : `Accesso attivo per ${currentUser.label}: modalità sola lettura. ${syncMode}.`;
    return;
  }

  authStatus.textContent = "Modalità ospite";
  authHint.textContent = `Solo gli account autorizzati possono modificare priorità e aggiungere eventi. ${syncMode}.`;
  logoutButton.hidden = true;
  loginButton.textContent = "Accedi";
  newEventButton.hidden = true;
  permissionsNote.textContent = `Sei in sola visualizzazione. Accedi con un account autorizzato per modificare la pianificazione. ${syncMode}.`;
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
          <p class="summary-meta">Priorità ${priorityLabel(event.priority)}</p>
          <p class="summary-meta">${event.notes}</p>
          ${
            canEdit()
              ? `
                <div class="summary-actions">
                  <button class="ghost-button small edit-event" data-event-id="${event.id}" type="button">Modifica</button>
                  <button class="ghost-button small danger delete-event" data-event-id="${event.id}" type="button">Elimina</button>
                </div>
              `
              : ""
          }
        </article>
      `,
    )
    .join("");

  // Edit / Delete handlers
  selectedDaySummary.querySelectorAll(".edit-event").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.dataset.eventId;
      const matched = events.find((it) => it.id === id);
      if (!matched) return;
      // prefill form and open dialog in edit mode
      editingEventId = id;
      eventDate.value = matched.date;
      eventTime.value = matched.time;
      eventTitle.value = matched.title;
      eventPriority.value = matched.priority || "medium";
      eventNotes.value = matched.notes;
      eventFormMessage.textContent = "Modifica evento";
      if (typeof eventDialog.showModal === "function") eventDialog.showModal(); else eventDialog.setAttribute("open", "");
    });
  });

  selectedDaySummary.querySelectorAll(".delete-event").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.dataset.eventId;
      if (!confirm("Confermi eliminazione di questo evento?")) return;
      events = events.filter((it) => it.id !== id);
      removeEventRecord(id).catch((error) => {
        eventFormMessage.textContent = `Errore eliminazione: ${error.message ?? error}`;
      });
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
            <span class="task-badge ${priorityBadgeClass(event.priority)}">Priorità ${priorityLabel(event.priority)}</span>
          </div>
          <div class="task-meta">${dayFormatter.format(parseDate(event.date))} · ${event.time}</div>
        </li>
      `,
    )
    .join("");
}

function renderStats() {
  const today = new Date();
  const todayKey = dateKey(today);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowKey = dateKey(tomorrow);
  const monthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const todaysCount = events.filter((event) => event.date === todayKey).length;
  const tomorrowsCount = events.filter((event) => event.date === tomorrowKey).length;
  const monthlyCount = events.filter((event) => event.date.startsWith(monthPrefix)).length;

  statQueue.textContent = String(todaysCount);
  statPrinting.textContent = String(tomorrowsCount);
  statDone.textContent = String(monthlyCount);
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
  eventPriority.value = "medium";
  eventNotes.value = "";
  editingEventId = null;
  eventFormMessage.textContent = "";
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

function normalizePriority(priority) {
  if (priority === "high" || priority === "medium" || priority === "low") {
    return priority;
  }

  return "medium";
}

async function createEvent() {
  if (!canEdit()) {
    return;
  }
  const proposedDate = eventDate.value;
  const proposedTime = eventTime.value;

  const conflictExists = events.some((event) => {
    if (editingEventId && event.id === editingEventId) return false;
    return event.date === proposedDate && event.time === proposedTime;
  });
  if (conflictExists) {
    eventFormMessage.textContent = "Esiste già un evento in questo orario. Scegli un altro slot.";
    return;
  }

  if (editingEventId) {
    // update existing
    const found = events.find((e) => e.id === editingEventId);
    if (!found) {
      eventFormMessage.textContent = "Evento non trovato per la modifica.";
      return;
    }

    found.date = proposedDate;
    found.time = proposedTime;
    found.title = eventTitle.value.trim();
    found.type = "printing";
    found.priority = normalizePriority(eventPriority.value);
    found.notes = eventNotes.value.trim();

    events = [...events].sort((left, right) => left.date.localeCompare(right.date) || left.time.localeCompare(right.time));
  } else {
    const nextEvent = {
      id: ensureEventId({ date: proposedDate, time: proposedTime }),
      date: proposedDate,
      time: proposedTime,
      title: eventTitle.value.trim(),
      type: "printing",
      priority: normalizePriority(eventPriority.value),
      notes: eventNotes.value.trim(),
    };

    events = [...events, nextEvent].sort((left, right) => left.date.localeCompare(right.date) || left.time.localeCompare(right.time));
  }
  try {
    const currentEvent = editingEventId ? events.find((item) => item.id === editingEventId) : events.find((e) => e.date === proposedDate && e.time === proposedTime && e.title === eventTitle.value.trim());
    if (currentEvent) {
      await persistEventRecord(currentEvent);
    }
  } catch (error) {
    eventFormMessage.textContent = `Errore salvataggio: ${error.message ?? error}`;
    return;
  }

  editingEventId = null;
  const savedEvent = events.find((e) => e.date === proposedDate && e.time === proposedTime && e.title === eventTitle.value.trim());
  if (savedEvent) {
    selectedDateKey = savedEvent.date;
    currentView = startOfMonth(parseDate(savedEvent.date));
  }
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
events = await loadEvents();
renderStats();
renderUpcoming();
renderCalendar();
renderSelectedDay();
