const monthTitle = document.getElementById("month-title");
const calendarGrid = document.getElementById("calendar-grid");
const todayButton = document.getElementById("today-button");
const prevButton = document.getElementById("prev-button");
const nextButton = document.getElementById("next-button");
const selectedDateLabel = document.getElementById("selected-date-label");
const selectedDaySummary = document.getElementById("selected-day-summary");
const upcomingList = document.getElementById("upcoming-list");
const statQueue = document.getElementById("stat-queue");
const statPrinting = document.getElementById("stat-printing");
const statDone = document.getElementById("stat-done");

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

const events = [
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

function renderCalendar() {
  const monthStart = startOfMonth(currentView);
  const monthEnd = endOfMonth(currentView);
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
        </article>
      `,
    )
    .join("");
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

renderStats();
renderUpcoming();
renderCalendar();
renderSelectedDay();
