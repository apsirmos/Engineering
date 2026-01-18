
// ==============================
// ΡΥΘΜΙΖΟΜΕΝΑ SLOTS ΔΙΑΘΕΣΙΜΟΤΗΤΑΣ
// Κλειδί ημέρας: 0=Κυρ, 1=Δευ, 2=Τρι, 3=Τετ, 4=Πεμ, 5=Παρ, 6=Σαβ
// Δώσε τα slots ως "HH:MM" σε 24ωρο.
const AVAILABILITY = {
  0: [], // Κυριακή: κλειστό
  1: ["18:30"], // Δευτέρα
  2: [], // Τρίτη
  3: ["21:00"], // Τετάρτη
  4: ["18:00","19:00","20:00"], // Πέμπτη
  5: ["19:00","20:00"],         // Παρασκευή
  6: ["17:00","18:00"]                  // Σάββατο
};

// (Προαιρετικό) Κλειστές ημερομηνίες (π.χ. αργίες) σε "YYYY-MM-DD"
const CLOSED_DATES = [
  // "2026-01-25",
];

// Πόσες ημέρες μπροστά επιτρέπουμε booking (π.χ. 60)
const MAX_DAYS_AHEAD = 60;

// ==============================
// ΒΟΗΘΗΤΙΚΕΣ ΣΥΝΑΡΤΗΣΕΙΣ
function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

function setMinMaxDate(input) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const min = toISODate(today);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + MAX_DAYS_AHEAD);
  const max = toISODate(maxDate);
  input.min = min;
  input.max = max;
}

function isClosedDate(iso) {
  return CLOSED_DATES.includes(iso);
}

function getSlotsForDate(isoDate) {
  // isoDate => "YYYY-MM-DD"
  const d = new Date(isoDate + 'T00:00:00');
  const weekday = d.getDay(); // 0..6
  const base = AVAILABILITY[weekday] || [];
  if (isClosedDate(isoDate)) return []; // override: κλειστό

  // Αφαίρεση παρελθοντικών ωρών αν η ημέρα είναι σήμερα
  const todayISO = toISODate(new Date());
  if (isoDate === todayISO) {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return base.filter(t => {
      const [hh, mm] = t.split(':').map(Number);
      const mins = hh * 60 + mm;
      return mins > nowMinutes; // μόνο μελλοντικές ώρες σήμερα
    });
  }
  return base;
}

function populateTimeSelect(selectEl, isoDate) {
  // Καθάρισε επιλογές
  selectEl.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.disabled = true;
  placeholder.selected = true;
  placeholder.textContent = 'Επιλέξτε ώρα';
  selectEl.appendChild(placeholder);

  const slots = getSlotsForDate(isoDate);
  if (!slots.length) {
    const o = document.createElement('option');
    o.value = '';
    o.disabled = true;
    o.textContent = 'Δεν υπάρχουν διαθέσιμες ώρες';
    selectEl.appendChild(o);
    return;
  }

  slots.forEach(t => {
    const o = document.createElement('option');
    o.value = t;
    o.textContent = t; // (μπορείς να προσθέσεις "π.μ./μ.μ." αν θες)
    selectEl.appendChild(o);
  });
}

// ==============================
// ΕΝΑΡΞΗ – INIT
(function () {
  const dateInput = document.getElementById('appt-date');
  const timeSelect = document.getElementById('appt-time');

  if (!dateInput || !timeSelect) return;

  // Min/Max ημερομηνία
  setMinMaxDate(dateInput);

  // Προ-γέμισμα slots για default επιλεγμένη ημερομηνία (αν υπάρχει)
  if (dateInput.value) {
    populateTimeSelect(timeSelect, dateInput.value);
  }

  // Όταν αλλάζει η ημερομηνία, ανανέωσε τα slots
  dateInput.addEventListener('change', function () {
    if (!this.value) return;
    populateTimeSelect(timeSelect, this.value);
  });

  // Μήνυμα επιτυχίας μετά το redirect (?appt=1)
  const params = new URLSearchParams(window.location.search);
  if (params.get('appt') === '1') {
    const box = document.getElementById('appt-success');
    if (box) box.style.display = 'block';
    // Καθάρισε το query από το URL (χωρίς reload)
    const cleanURL = window.location.origin + window.location.pathname + '#appointment';
    window.history.replaceState({}, document.title, cleanURL);
  }
})();
