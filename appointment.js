
/******************************************************
 * appointment.js
 * - Δυναμικά slots ώρας βάσει διαθεσιμότητας (static)
 * - Μήνυμα επιτυχίας μετά από FormSubmit redirect (?appt=1)
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

/** Default ημερομηνία κατά το load:
 *  - 'today'  → σημερινή ημέρα (θα κοπούν παρελθοντικές ώρες)
 *  - 'tomorrow' → αύριο (προτείνεται για να βλέπει ο χρήστης διαθέσιμες ώρες εύκολα)
 */
const DEFAULT_DATE = 'tomorrow';

/** (Προαιρετικό) Αν θέλεις anti-overlap lock σε Google Apps Script:
 *  - Βάλε USE_LOCK=true
 *  - Βάλε το LOCK_ENDPOINT στο Web App URL από το Apps Script deployment
 *  - Τότε το JS θα κάνει ΠΡΩΤΑ POST στο endpoint:
 *      • αν ελεύθερο slot → ok:true → θα συνεχίσει σε FormSubmit
 *      • αν πιασμένο → reason:'taken' → θα δείξει μήνυμα σφάλματος
 */
const USE_LOCK = false; // <-- άλλαξέ το σε true αν θέλεις κλείδωμα
const LOCK_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyJFWZu4bVQgW_aUOAJpfoHzCMsd-zpYOAgpKwXwZt-ChZynXwHpJn-TLq3Zpcxqcu0/exec';

/** Ενεργοποίησε logs για debug στην κονσόλα */
const DEBUG_LOGS = true;


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

function getSlotsForDate(isoDate){
  // isoDate => "YYYY-MM-DD"
  const d = new Date(isoDate + 'T00:00:00');
  const weekday = d.getDay(); // 0..6
  const base = Array.isArray(AVAILABILITY[weekday]) ? AVAILABILITY[weekday] : [];
  log('getSlotsForDate:', { isoDate, weekday, base });

  if (isClosedDate(isoDate)) {
    log('getSlotsForDate: CLOSED date');
    return [];
  }

  // Αν η ημερομηνία είναι σήμερα, κόψε παρελθοντικές ώρες
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

function populateTimeSelect(selectEl, isoDate){
  // Καθάρισε επιλογές
  selectEl.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.disabled = true;
  placeholder.selected = true;
  placeholder.textContent = 'Επιλέξτε ώρα';
  selectEl.appendChild(placeholder);

  const slots = getSlotsForDate(isoDate);
  const errBox = document.getElementById('appt-error');

  if (!slots.length) {
    const o = document.createElement('option');
    o.value = '';
    o.disabled = true;
    o.textContent = 'Δεν υπάρχουν διαθέσιμες ώρες';
    selectEl.appendChild(o);
    if (errBox) {
      errBox.textContent = 'Δεν βρέθηκαν διαθέσιμες ώρες για την επιλεγμένη ημερομηνία.';
      errBox.style.display = 'block';
    }
    return;
  } else {
    if (errBox) errBox.style.display = 'none';
  }

  slots.forEach(t => {
    const o = document.createElement('option');
    o.value = t;
    o.textContent = t; // (αν θες, μπορείς να μετατρέψεις σε 12ωρο με π.μ./μ.μ.)
    selectEl.appendChild(o);
  });

  log('populateTimeSelect: final options →', slots);
}

function setDefaultDate(input){
  if (input.value) return; // αν έχει ήδη τιμή (π.χ. από browser autofill), μην αλλάξεις
  const base = new Date();
  if (DEFAULT_DATE === 'tomorrow') {
    base.setDate(base.getDate() + 1);
  } else {
    // 'today' ή οτιδήποτε άλλο→ κρατάμε σήμερα
  }
  input.value = toISODate(base);
}


/* =============================
   INIT – Αρχικοποίηση
   ============================= */
(function(){
  // DOM refs
  const section    = document.getElementById('appointment');
  const form       = section ? section.querySelector('form') : null;
  const dateInput  = document.getElementById('appt-date');
  const timeSelect = document.getElementById('appt-time');
  const btnSubmit  = document.getElementById('appt-submit');
  const okBox      = document.getElementById('appt-success');
  const errBox     = document.getElementById('appt-error');

  if (!section || !form || !dateInput || !timeSelect) {
    warn('Δεν βρέθηκαν τα απαραίτητα στοιχεία (section/form/date/time). Έλεγξε τα IDs & τη δομή HTML.');
    return;
  }

  // Min/Max & Default date
  setMinMaxDate(dateInput);
  setDefaultDate(dateInput);

  // Γέμισμα dropdown με βάση την (τρέχουσα) τιμή
  populateTimeSelect(timeSelect, dateInput.value);

  // Όταν αλλάζει η ημερομηνία, ανανέωσε slots
  dateInput.addEventListener('change', function(){
    if (!this.value) return;
    populateTimeSelect(timeSelect, this.value);
  });

  // Μήνυμα επιτυχίας μετά από redirect (?appt=1)
  const params = new URLSearchParams(window.location.search);
  if (params.get('appt') === '1') {
    if (okBox) okBox.style.display = 'block';
    const cleanURL = window.location.origin + window.location.pathname + '#appointment';
    window.history.replaceState({}, document.title, cleanURL);
  }

  log('Init OK. Default date:', dateInput.value, 'Lock enabled:', USE_LOCK);

  /* ------------------------------------------
     ΥΠΟΒΟΛΗ ΦΟΡΜΑΣ
     - Αν USE_LOCK=false → αφήνουμε το FormSubmit να δουλέψει κανονικά (χωρίς intercept).
     - Αν USE_LOCK=true → κάνουμε ΠΡΩΤΑ POST στο LOCK_ENDPOINT. Αν ok → native submit προς FormSubmit.
     ------------------------------------------ */
  if (USE_LOCK) {
    if (!LOCK_ENDPOINT || !/^https?:\/\//i.test(LOCK_ENDPOINT)) {
      warn('USE_LOCK=true αλλά το LOCK_ENDPOINT είναι κενό/μη έγκυρο. Η φόρμα δεν θα υποβληθεί.');
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault(); // εμποδίζουμε το default για να γίνει πρώτα το lock
      if (errBox) errBox.style.display = 'none';
      if (okBox) okBox.style.display = 'none';

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
        if (errBox) {
          errBox.textContent = 'Συμπληρώστε όλα τα υποχρεωτικά πεδία.';
          errBox.style.display = 'block';
        }
        return;
      }

      // Αν είναι σήμερα, μην επιτρέπεις παρελθοντική ώρα (διπλός έλεγχος)
      const todayISO = toISODate(new Date());
      if (payload.date === todayISO) {
        const now = new Date();
        const nowMin = now.getHours()*60 + now.getMinutes();
        const [hh, mm] = String(payload.time).split(':').map(Number);
        if (hh*60 + mm <= nowMin) {
          if (errBox) {
            errBox.textContent = 'Η ώρα που επιλέξατε έχει ήδη περάσει.';
            errBox.style.display = 'block';
          }
          return;
        }
      }

      // Απενεργοποίηση κουμπιού
      let prev = '';
      if (btnSubmit) {
        prev = btnSubmit.textContent;
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
          if (errBox) {
            errBox.textContent = 'Το συγκεκριμένο slot μόλις κλείστηκε από άλλον. Παρακαλώ επιλέξτε άλλη ώρα.';
            errBox.style.display = 'block';
          }
        } else {
          if (errBox) {
            errBox.textContent = 'Πρόβλημα στον έλεγχο διαθεσιμότητας. Προσπαθήστε ξανά.';
            errBox.style.display = 'block';
          }
        }
      } catch (err) {
        warn('Lock request failed:', err);
        if (errBox) {
          errBox.textContent = 'Δικτυακό σφάλμα. Ελέγξτε τη σύνδεση και δοκιμάστε ξανά.';
          errBox.style.display = 'block';
        }
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = prev || 'Κλείσιμο Ραντεβού';
        }
      }
    });
  }
})();
