
// ==============================
// ΡΥΘΜΙΖΟΜΕΝΑ SLOTS ΔΙΑΘΕΣΙΜΟΤΗΤΑΣ
// Κλειδί ημέρας: 0=Κυρ, 1=Δευ, 2=Τρι, 3=Τετ, 4=Πεμ, 5=Παρ, 6=Σαβ
// Δώσε τα slots ως "HH:MM" σε 24ωρο.


// ===== Ρυθμίσεις Availability (όπως πριν) =====
const AVAILABILITY = {
  0: [], // Κυριακή: κλειστό
  1: ["18:30"], // Δευτέρα
  2: [], // Τρίτη
  3: ["21:00"], // Τετάρτη
  4: ["18:00","19:00","20:00"], // Πέμπτη
  5: ["19:00","20:00"],         // Παρασκευή
  6: ["17:00","18:00"]                  // Σάββατο
};

const CLOSED_DATES = [];
const MAX_DAYS_AHEAD = 60;

// ===== ΒΑΛΕ εδώ το Web App URL από το Apps Script =====
const FORM_LOCK_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyJFWZu4bVQgW_aUOAJpfoHzCMsd-zpYOAgpKwXwZt-ChZynXwHpJn-TLq3Zpcxqcu0/exec';

// ===== Helpers =====
function toISODate(d){ return d.toISOString().slice(0,10); }
function setMinMaxDate(input){
  const today = new Date(); today.setHours(0,0,0,0);
  input.min = toISODate(today);
  const max = new Date(today); max.setDate(max.getDate()+MAX_DAYS_AHEAD);
  input.max = toISODate(max);
}
function isClosedDate(iso){ return CLOSED_DATES.includes(iso); }
function getSlotsForDate(iso){
  const d = new Date(iso+'T00:00:00'); const w=d.getDay();
  const base = AVAILABILITY[w] || [];
  if (isClosedDate(iso)) return [];
  const todayISO = toISODate(new Date());
  if (iso===todayISO){
    const now=new Date(); const nowMin=now.getHours()*60+now.getMinutes();
    return base.filter(t=>{
      const [h,m]=t.split(':').map(Number);
      return (h*60+m) > nowMin;
    });
  }
  return base;
}
function populateTimeSelect(sel, iso){
  sel.innerHTML='';
  const ph=document.createElement('option');
  ph.value=''; ph.disabled=true; ph.selected=true; ph.textContent='Επιλέξτε ώρα';
  sel.appendChild(ph);
  const slots=getSlotsForDate(iso);
  if(!slots.length){
    const o=document.createElement('option');
    o.value=''; o.disabled=true; o.textContent='Δεν υπάρχουν διαθέσιμες ώρες';
    sel.appendChild(o); return;
  }
  slots.forEach(t=>{
    const o=document.createElement('option');
    o.value=t; o.textContent=t; sel.appendChild(o);
  });
}

// ===== Init + Intercept =====
(function(){
  const form = document.querySelector('#appointment form');
  const dateInput = document.getElementById('appt-date');
  const timeSelect = document.getElementById('appt-time');
  const btn = document.getElementById('appt-submit');
  const okBox = document.getElementById('appt-success');
  const errBox = document.getElementById('appt-error');

  if(!form) return;

  // Min/Max + dynamic slots
  setMinMaxDate(dateInput);
  if(dateInput.value) populateTimeSelect(timeSelect, dateInput.value);
  dateInput.addEventListener('change', function(){
    if(this.value) populateTimeSelect(timeSelect, this.value);
  });

  // Μετά το redirect (?appt=1) δείξε μήνυμα
  const params = new URLSearchParams(window.location.search);
  if (params.get('appt') === '1') {
    okBox.style.display='block';
    const clean = window.location.origin + window.location.pathname + '#appointment';
    window.history.replaceState({}, document.title, clean);
  }

  form.addEventListener('submit', async (e)=>{
    // 1) ΠΡΩΤΑ κλείδωμα slot στο Apps Script
    e.preventDefault();
    errBox.style.display='none';
    okBox.style.display='none';

    const fd = new FormData(form);
    const payload = {
      full_name: (fd.get('full_name')||'').trim(),
      email: (fd.get('email')||'').trim(),
      date: fd.get('date'),
      time: fd.get('time'),
      phone: (fd.get('phone')||'').trim(),
      notes: (fd.get('notes')||'').trim()
    };

    // Γρήγοροι έλεγχοι
    if(!payload.full_name || !payload.email || !payload.date || !payload.time){
      errBox.textContent='Συμπληρώστε όλα τα υποχρεωτικά πεδία.';
      errBox.style.display='block'; return;
    }

    // Έλεγχος παρελθοντικής ώρας για "σήμερα"
    const todayISO = toISODate(new Date());
    if (payload.date === todayISO){
      const now=new Date(); const nowMin=now.getHours()*60+now.getMinutes();
      const [hh,mm]=payload.time.split(':').map(Number);
      if (hh*60+mm <= nowMin){
        errBox.textContent='Η ώρα που επιλέξατε έχει ήδη περάσει.';
        errBox.style.display='block'; return;
      }
    }

    btn.disabled = true; const btnText = btn.textContent;
    btn.textContent = 'Έλεγχος διαθεσιμότητας...';

    try{
      const res = await fetch(FORM_LOCK_ENDPOINT, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.ok){
        // 2) Αν κλειδώθηκε, στείλε ΚΑΝΟΝΙΚΑ στο FormSubmit (email + redirect)
        // Χρησιμοποιούμε native submit για να παρακάμψουμε το preventDefault
        HTMLFormElement.prototype.submit.call(form);
      } else if (data.reason === 'taken'){
        errBox.textContent='Το συγκεκριμένο slot μόλις κλείστηκε από άλλον. Παρακαλώ επιλέξτε άλλη ώρα.';
        errBox.style.display='block';
      } else {
        errBox.textContent='Πρόβλημα στον έλεγχο διαθεσιμότητας. Προσπαθήστε ξανά.';
        errBox.style.display='block';
      }
    } catch(err){
      errBox.textContent='Δικτυακό σφάλμα. Ελέγξτε τη σύνδεση και δοκιμάστε ξανά.';
      errBox.style.display='block';
    } finally {
      btn.disabled=false; btn.textContent = btnText;
    }
  });
})();
