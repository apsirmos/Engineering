
/******************************************************
 * appointment.js
 * - Δυναμικά slots ώρας βάσει διαθεσιμότητας (static)
 * - Επιλογή 1ης διαθέσιμης ημέρας με slots
 * - Κόψιμο παρελθοντικών ωρών για “σήμερα”
 * - Μηνύματα επιτυχίας/σφαλμάτων
 * - (Προαιρετικά) Anti-overlap lock με Google Apps Script
 ******************************************************/

/* =============================
   ΡΥΘΜΙΣΕΙΣ – CONFIG
   ============================= */

/** Διαθεσιμότητα ανά ημέρα εβδομάδας.
 *  Κλειδί: 0=Κυρ, 1=Δευ, 2=Τρι, 3=Τετ, 4=Πεμ, 5=Παρ, 6=Σαβ
 *  Τιμές: πίνακας με "HH:MM" (24ωρο)
 */
const AVAILABILITY = {
  0: [], // Κυριακή: κλειστό
  1: ["10:00","11:00","12:00","17:00","18:00"], // Δευτέρα
  2: ["10:00","11:00","12:00","17:00","18:00"], // Τρίτη
  3: ["10:00","11:00","12:00","17:00","18:00"], // Τετάρτη
  4: ["10:00","11:00","12:00","17:00","18:00"], // Πέμπτη
  5: ["10:00","11:00","12:00","16:00"],         // Παρασκευή
  6: ["11:00","12:00","13:00"]                  // Σάββατο
};

/** (Προαιρετικό) Συγκεκριμένες κλειστές ημερομηνίες σε "YYYY-MM-DD" */
const CLOSED_DATES = [
  // "2026-03-25",
];

/** Επιτρέπουμε κράτηση έως Χ ημέρες μπροστά */
const MAX_DAYS_AHEAD = 60;

/** Ενεργοποίησε logs για debug στην κονσόλα (DevTools) */
const DEBUG_LOGS = true;

/** (Προαιρετικό) Anti-overlap lock με Google Apps Script
 *  - Αν θέλεις να αποτρέπεις διπλοκρατήσεις:
 *    • Θέσε USE_LOCK = true
 *    • Βάλε το LOCK_ENDPOINT στο Web App URL (Apps Script → Deploy → Web app)
 *  - Αν δεν θες κλείδωμα, κράτα USE_LOCK = false (η φόρμα θα πάει κατευθείαν στο FormSubmit).
 */
const USE_LOCK = false; // <-- Βάλτο true αν θέλεις κλείδωμα
const LOCK_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyJFWZu4bVQgW_aUOAJpfoHzCMsd-zpYOAgpKwXwZt-ChZynXwHpJn-TLq3Zpcxqcu0/exec'; // π.χ. https://script.google.com/macros/s/AKfycbx.../exec


/* =============================
   HELPERS – Βοηθητικές
   ============================= */
function log(...args){ if (DEBUG_LOGS) console.log('[appointment]', ...args); }
function warn(...args){ if (DEBUG_LOGS) console.warn('[appointment]', ...args); }

function toISODate(d){ return d.toISOString().slice(0,10); }

function setMinMaxDate(input){
  const today = new Date();
  today.setHours(0,0,0,0);
  const min = toISODate(today);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + MAX_DAYS_AHEAD);
  const max = toISODate(maxDate);
  input.min = min;
  input.max = max;
}

function isClosedDate(iso){
  return CLOSED_DATES.includes(iso);
}

// Προσοχή: χρησιμοποιούμε "YYYY-MM-DDT00:00:00" για να αποφύγουμε μετατοπίσεις ζώνης ώρας.
function weekdayOfISO(isoDate){
  const d = new Date(isoDate + 'T00:00:00');
  return d.getDay(); // 0..6
}

// Επιστρέφει slots για συγκεκριμένη ημερομηνία (κόβει παρελθοντικές αν είναι σήμερα)
function getSlotsForDate(isoDate){
  const weekday = weekdayOfISO(isoDate);
  const base = Array.isArray(AVAILABILITY[weekday]) ? AVAILABILITY[weekday] : [];
  log('getSlotsForDate:', { isoDate, weekday, base });

  if (isClosedDate(isoDate)) {
    log('getSlotsForDate: CLOSED date');
    return [];
  }

  // Αν η ημερομηνία είναι σήμερα, αφαίρεσε τις παρελθοντικές ώρες
  const todayISO = toISODate(new Date());
  if (isoDate === todayISO) {
    const now = new Date();
    const nowMinutes = now.getHours()*60 + now.getMinutes();
    const futureOnly = base.filter(t => {
      const [hh,mm] = t.split(':').map(Number);
      return (hh*60 + mm) > nowMinutes;
    });
    log('getSlotsForDate: today filter →', futureOnly);
    return futureOnly;
  }

  return base;
}

// Βρίσκει την 1η ημερομηνία (από σήμερα και μετά) που έχει διαθέσιμα slots
function findFirstAvailableISODate(){
  const today = new Date();
  today.setHours(0,0,0,0);

  for (let i = 0; i <= MAX_DAYS_AHEAD; i++){
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const iso = toISODate(d);
    const slots = getSlotsForDate(iso);
    log('findFirstAvailableISODate check:', iso, 'slots:', slots);
    if (slots.length > 0) return iso;
  }
  return null; // Καμία διαθέσιμη
}

function showError(text){
  const errBox = document.getElementById('appt-error');
  if (errBox){
    errBox.textContent = text || 'Παρουσιάστηκε σφάλμα.';
    errBox.style.display = 'block';
  }
}
function hideError(){
  const errBox = document.getElementById('appt-error');
  if (errBox) errBox.style.display = 'none';
}

function showSuccess(){
  const okBox = document.getElementById('appt-success');
  if (okBox) okBox.style.display = 'block';
}
function hideSuccess(){
  const okBox = document.getElementById('appt-success');
  if (okBox) okBox.style.display = 'none';
}

/**
 * Γεμίζει το dropdown ώρας με βάση το isoDate.
 * Αν δεν υπάρχουν slots → εμφανίζει μήνυμα.
 */
function populateTimeSelect(selectEl, isoDate){
  // Καθάρισε
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
    showError('Δεν βρέθηκαν διαθέσιμες ώρες για την επιλεγμένη ημερομηνία.');
    return;
  } else {
    hideError();
  }

  slots.forEach(t => {
    const o = document.createElement('option');
    o.value = t;
    o.textContent = t; // (αν θέλεις, μπορείς να το εμφανίσεις ως 12ωρο π.μ./μ.μ.)
    selectEl.appendChild(o);
  });

  log('populateTimeSelect: options →', slots);
}


/* =============================
   INIT – Αρχικοποίηση
   ============================= */
(function(){
  const section    = document.getElementById('appointment');
  const form       = section ? section.querySelector('form') : null;
  const dateInput  = document.getElementById('appt-date');
  const timeSelect = document.getElementById('appt-time');
  const btnSubmit  = document.getElementById('appt-submit');
  const okBox      = document.getElementById('appt-success');
  const errBox     = document.getElementById('appt-error');

  if (!section || !form || !dateInput || !timeSelect) {
    warn('Λείπουν στοιχεία DOM. Έλεγξε ότι υπάρχουν: #appointment, form, #appt-date, #appt-time');
    return;
  }

  // 1) Min/Max
  setMinMaxDate(dateInput);

  // 2) Διάλεξε αυτόματα την 1η διαθέσιμη μέρα (αν δεν υπάρχει ήδη τιμή)
  if (!dateInput.value) {
    const firstISO = findFirstAvailableISODate();
    log('First available date:', firstISO);
    if (firstISO) {
      dateInput.value = firstISO;
    } else {
      // Καμία διαθέσιμη στα επόμενα MAX_DAYS_AHEAD
      dateInput.value = toISODate(new Date()); // βάλε σήμερα για να μην είναι κενό
      populateTimeSelect(timeSelect, dateInput.value);
      showError('Δεν υπάρχουν διαθέσιμες ημέρες/ώρες στο διάστημα κρατήσεων.');
      return;
    }
  }

  // 3) Γέμισε τις ώρες για την επιλεγμένη ημερομηνία
  populateTimeSelect(timeSelect, dateInput.value);

  // 4) Όταν αλλάζει η ημερομηνία, ανανέωσε slots
  dateInput.addEventListener('change', function(){
    if (!this.value) return;
    populateTimeSelect(timeSelect, this.value);
  });

  // 5) Μήνυμα επιτυχίας μετά από redirect (?appt=1)
  const params = new URLSearchParams(window.location.search);
  if (params.get('appt') === '1') {
    showSuccess();
    // Καθάρισε το query από το URL (χωρίς reload)
    const cleanURL = window.location.origin + window.location.pathname + '#appointment';
    window.history.replaceState({}, document.title, cleanURL);
  }

  log('Init OK. dateInput.value=', dateInput.value, 'USE_LOCK=', USE_LOCK);

  /* ------------------------------------------
     ΥΠΟΒΟΛΗ ΦΟΡΜΑΣ & ANTI-OVERLAP (προαιρετικό)
     - Αν USE_LOCK = false → αφήνουμε το FormSubmit να δουλέψει κανονικά.
     - Αν USE_LOCK = true → κάνουμε ΠΡΩΤΑ POST στο LOCK_ENDPOINT. Αν ok → native submit προς FormSubmit.
     ------------------------------------------ */
  if (USE_LOCK) {
    if (!LOCK_ENDPOINT || !/^https?:\/\//i.test(LOCK_ENDPOINT)) {
      warn('USE_LOCK=true αλλά το LOCK_ENDPOINT είναι κενό/μη έγκυρο. Η φόρμα δεν θα υποβληθεί μέσω lock.');
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault(); // εμποδίζουμε το default για να γίνει πρώτα το lock
      hideError();
      hideSuccess();

      // Συλλογή πεδίων
      const fd = new FormData(form);
      const payload = {
        full_name: (fd.get('full_name') || '').trim(),
        email:     (fd.get('email') || '').trim(),
        date:       fd.get('date'),
        time:       fd.get('time'),
        phone:     (fd.get('phone') || '').trim(),
        notes:     (fd.get('notes') || '').trim()
      };

      // Γρήγοροι έλεγχοι client-side
      if (!payload.full_name || !payload.email || !payload.date || !payload.time) {
        showError('Συμπληρώστε όλα τα υποχρεωτικά πεδία.');
        return;
      }

      // Αν είναι σήμερα, μην επιτρέπεις παρελθοντική ώρα (διπλός έλεγχος)
      const todayISO = toISODate(new Date());
      if (payload.date === todayISO) {
        const now = new Date();
        const nowMin = now.getHours()*60 + now.getMinutes();
        const [hh, mm] = String(payload.time).split(':').map(Number);
        if (hh*60 + mm <= nowMin) {
          showError('Η ώρα που επιλέξατε έχει ήδη περάσει.');
          return;
        }
      }

      // Απενεργοποίηση κουμπιού
      let prevText = '';
      if (btnSubmit) {
        prevText = btnSubmit.textContent;
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Έλεγχος διαθεσιμότητας...';
      }

      try {
        if (!LOCK_ENDPOINT) throw new Error('LOCK_ENDPOINT missing');

        const res = await fetch(LOCK_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        log('Lock response:', data);

        if (data && data.ok) {
          // Κλειδώθηκε → συνέχισε σε FormSubmit (native submit)
          HTMLFormElement.prototype.submit.call(form);
        } else if (data && data.reason === 'taken') {
          showError('Το συγκεκριμένο slot μόλις κλείστηκε από άλλον. Παρακαλώ επιλέξτε άλλη ώρα.');
        } else {
          showError('Πρόβλημα στον έλεγχο διαθεσιμότητας. Προσπαθήστε ξανά.');
        }
      } catch (err) {
        warn('Lock request failed:', err);
        showError('Δικτυακό σφάλμα. Ελέγξτε τη σύνδεση και δοκιμάστε ξανά.');
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = prevText || 'Κλείσιμο Ραντεβού';
        }
      }
    });
  }
})();
