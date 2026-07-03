/* ─────────────────────────────────────────
   NestIQ — register.js
   Arrow functions used throughout as required
   localStorage for persistence
───────────────────────────────────────── */

'use strict';

/* ══════════════════════════════════════
   DOM REFERENCES
══════════════════════════════════════ */
const form           = document.getElementById('registerForm');
const submitBtn      = document.getElementById('submitBtn');
const btnText        = document.getElementById('btnText');
const btnSpinner     = document.getElementById('btnSpinner');
const cardSection    = document.getElementById('cardSection');
const residentCard   = document.getElementById('residentCard');
const toast          = document.getElementById('toast');

// ── Fields
const fields = {
  fullName:        document.getElementById('fullName'),
  phone:           document.getElementById('phone'),
  email:           document.getElementById('email'),
  password:        document.getElementById('password'),
  confirmPassword: document.getElementById('confirmPassword'),
  dob:             document.getElementById('dob'),
  moveIn:          document.getElementById('moveIn'),
  flat:            document.getElementById('flat'),
  tower:           document.getElementById('tower'),
  role:            document.getElementById('role'),
  gender:          document.getElementById('gender'),
  terms:           document.getElementById('terms'),
  profilePhoto:    document.getElementById('profilePhoto'),
};

// ── Drop zone
const dropZone    = document.getElementById('dropZone');
const dropInner   = document.getElementById('dropInner');
const previewWrap = document.getElementById('previewWrap');
const photoPreview = document.getElementById('photoPreview');
const browseBtn   = document.getElementById('browseBtn');
const removePhoto = document.getElementById('removePhoto');

// ── Password toggles
const togglePwd     = document.getElementById('togglePwd');
const toggleConfirm = document.getElementById('toggleConfirm');

// ── Card buttons
const goDashboard     = document.getElementById('goDashboard');
const registerAnother = document.getElementById('registerAnother');


/* ══════════════════════════════════════
   STATE
══════════════════════════════════════ */
let photoDataURL = null;   // base64 of uploaded photo
let toastTimer   = null;


/* ══════════════════════════════════════
   UTILITY — ARROW FUNCTIONS
══════════════════════════════════════ */

// Show inline error
const showErr = (id, msg) => {
  const el = document.getElementById(`err-${id}`);
  if (el) el.textContent = msg;
};

// Clear all inline errors
const clearAllErrors = () => {
  document.querySelectorAll('.err').forEach(el => el.textContent = '');
  document.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
};

// Mark field invalid
const markInvalid = (id) => {
  const el = fields[id];
  if (el) el.classList.add('invalid');
};

// Toast notification
const showToast = (msg, isError = false) => {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.className = 'toast show' + (isError ? ' error' : '');
  toastTimer = setTimeout(() => { toast.className = 'toast'; }, 3500);
};

// Generate a resident ID
const genResidentId = () => {
  const prefix = 'GH';
  const num    = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${num}`;
};

// Format a date string (YYYY-MM-DD → DD MMM YYYY)
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Get initials from name
const getInitials = (name) =>
  name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

// Mask email for display
const maskEmail = (email) => {
  const [local, domain] = email.split('@');
  const masked = local.slice(0, 2) + '••••' + local.slice(-1);
  return `${masked}@${domain}`;
};


/* ══════════════════════════════════════
   VALIDATION
══════════════════════════════════════ */

const validators = {

  fullName: (val) => {
    if (!val.trim()) return 'Full name is required.';
    if (val.trim().length < 3) return 'Name must be at least 3 characters.';
    if (!/^[a-zA-Z\s.'-]+$/.test(val)) return 'Name contains invalid characters.';
    return null;
  },

  phone: (val) => {
    if (!val.trim()) return 'Phone number is required.';
    if (!/^\d{10}$/.test(val.trim())) return 'Enter a valid 10-digit number.';
    return null;
  },

  email: (val) => {
    if (!val.trim()) return 'Email address is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Enter a valid email address.';
    return null;
  },

  password: (val) => {
    if (!val) return 'Password is required.';
    if (val.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(val)) return 'Include at least one uppercase letter.';
    if (!/[0-9]/.test(val)) return 'Include at least one number.';
    return null;
  },

  confirmPassword: (val) => {
    if (!val) return 'Please confirm your password.';
    if (val !== fields.password.value) return 'Passwords do not match.';
    return null;
  },

  dob: (val) => {
    if (!val) return 'Date of birth is required.';
    const today = new Date();
    const dob   = new Date(val);
    const age   = (today - dob) / (1000 * 60 * 60 * 24 * 365.25);
    if (age < 18) return 'You must be at least 18 years old.';
    if (age > 100) return 'Please enter a valid date of birth.';
    return null;
  },

  moveIn: (val) => {
    if (!val) return 'Move-in date is required.';
    return null;
  },

  flat: (val) => {
    if (!val.trim()) return 'Flat number is required.';
    if (!/^[A-Za-z0-9\-]+$/.test(val.trim())) return 'E.g. A-204 or B301';
    return null;
  },

  tower: (val) => {
    if (!val) return 'Please select a tower.';
    return null;
  },

  role: (val) => {
    if (!val) return 'Please select your resident role.';
    return null;
  },

};

// Run all validators, return true if form is valid
const validateForm = () => {
  clearAllErrors();
  let valid = true;

  // Run each named validator
  Object.entries(validators).forEach(([key, fn]) => {
    const el    = fields[key];
    const error = fn(el.value);
    if (error) {
      showErr(key, error);
      markInvalid(key);
      valid = false;
    }
  });

  // Terms checkbox
  if (!fields.terms.checked) {
    showErr('terms', 'You must agree to the terms to continue.');
    valid = false;
  }

  return valid;
};

// Real-time validation on blur
Object.entries(validators).forEach(([key, fn]) => {
  const el = fields[key];
  if (!el) return;

  el.addEventListener('blur', () => {
    const error = fn(el.value);
    if (error) {
      showErr(key, error);
      markInvalid(key);
    } else {
      showErr(key, '');
      el.classList.remove('invalid');
    }
  });

  // Clear error on input
  el.addEventListener('input', () => {
    showErr(key, '');
    el.classList.remove('invalid');
  });
});


/* ══════════════════════════════════════
   PASSWORD TOGGLE
══════════════════════════════════════ */

const toggleVisibility = (inputEl, btnEl) => {
  const isHidden = inputEl.type === 'password';
  inputEl.type   = isHidden ? 'text' : 'password';
  btnEl.textContent = isHidden ? '🙈' : '👁';
};

togglePwd.addEventListener('click',     () => toggleVisibility(fields.password, togglePwd));
toggleConfirm.addEventListener('click', () => toggleVisibility(fields.confirmPassword, toggleConfirm));


/* ══════════════════════════════════════
   FILE UPLOAD — DRAG & DROP + BROWSE
══════════════════════════════════════ */

const handleFile = (file) => {
  if (!file || !file.type.startsWith('image/')) {
    showErr('photo', 'Please upload a valid image file (JPG or PNG).');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showErr('photo', 'File must be under 5 MB.');
    return;
  }
  showErr('photo', '');

  const reader = new FileReader();
  reader.onload = (e) => {
    photoDataURL = e.target.result;
    photoPreview.src = photoDataURL;
    dropInner.style.display   = 'none';
    previewWrap.style.display = 'flex';
    showToast('Photo uploaded ✓');
  };
  reader.readAsDataURL(file);
};

// Browse button opens file input
browseBtn.addEventListener('click', () => fields.profilePhoto.click());

// File input change
fields.profilePhoto.addEventListener('change', (e) => handleFile(e.target.files[0]));

// Drag over
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

// Drag leave
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));

// Drop
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  handleFile(e.dataTransfer.files[0]);
});

// Remove photo
removePhoto.addEventListener('click', () => {
  photoDataURL               = null;
  photoPreview.src           = '';
  fields.profilePhoto.value  = '';
  previewWrap.style.display  = 'none';
  dropInner.style.display    = 'flex';
});


/* ══════════════════════════════════════
   BUILD RESIDENT CARD — ARROW FUNCTION
══════════════════════════════════════ */

const buildResidentCard = (data) => {

  const avatarHTML = data.photo
    ? `<div class="rc-avatar"><img src="${data.photo}" alt="Profile" /></div>`
    : `<div class="rc-avatar">${getInitials(data.fullName)}</div>`;

  const fields_ = [
    { label: 'Email',        value: maskEmail(data.email) },
    { label: 'Phone',        value: data.phone            },
    { label: 'Flat Number',  value: data.flat             },
    { label: 'Tower',        value: data.tower            },
    { label: 'Role',         value: data.role             },
    { label: 'Gender',       value: data.gender || 'Not specified' },
    { label: 'Date of Birth',value: formatDate(data.dob)  },
    { label: 'Move-in Date', value: formatDate(data.moveIn) },
  ];

  const fieldsHTML = fields_
    .map(f => `
      <div class="rc-field">
        <label>${f.label}</label>
        <span>${f.value}</span>
      </div>
    `)
    .join('');

  return `
    <div class="rc-header">
      ${avatarHTML}
      <div>
        <div class="rc-name">${data.fullName}</div>
        <span class="rc-role">${data.role}</span>
      </div>
    </div>
    <div class="rc-body">
      ${fieldsHTML}
    </div>
    <div class="rc-footer">
      <span class="rc-id">ID: ${data.id}</span>
      <span class="rc-badge">Greenwood Heights</span>
    </div>
  `;
};


/* ══════════════════════════════════════
   LOCAL STORAGE HELPERS — ARROW FUNCTIONS
══════════════════════════════════════ */

const STORAGE_KEY = 'nestiq_residents';

// Save a resident record to localStorage
const saveToLocalStorage = (data) => {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    existing.push(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch (e) {
    console.warn('localStorage error:', e);
  }
};

// Get all saved residents
const getFromLocalStorage = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

// Check for duplicate email
const isDuplicateEmail = (email) =>
  getFromLocalStorage().some(r => r.email.toLowerCase() === email.toLowerCase());


/* ══════════════════════════════════════
   FORM SUBMIT — ARROW FUNCTION
══════════════════════════════════════ */

form.addEventListener('submit', (e) => {
  e.preventDefault();

  if (!validateForm()) {
    showToast('Please fix the errors above.', true);

    // Scroll to first error
    const firstError = document.querySelector('.err:not(:empty)');
    if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // Check duplicate email
  if (isDuplicateEmail(fields.email.value)) {
    showErr('email', 'This email is already registered.');
    markInvalid('email');
    showToast('Email already in use.', true);
    return;
  }

  // Simulate loading
  submitBtn.disabled      = true;
  btnText.style.display   = 'none';
  btnSpinner.style.display = 'inline-block';

  // Simulated async delay (mimics real API call)
  setTimeout(() => {

    const residentData = {
      id:       genResidentId(),
      fullName: fields.fullName.value.trim(),
      phone:    fields.phone.value.trim(),
      email:    fields.email.value.trim(),
      dob:      fields.dob.value,
      moveIn:   fields.moveIn.value,
      flat:     fields.flat.value.trim().toUpperCase(),
      tower:    fields.tower.value,
      role:     fields.role.value,
      gender:   fields.gender.value,
      photo:    photoDataURL,
      registeredAt: new Date().toISOString(),
    };

    // Save to localStorage
    saveToLocalStorage(residentData);

    // Build and show card
    residentCard.innerHTML   = buildResidentCard(residentData);
    cardSection.style.display = 'block';
    cardSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Reset button
    submitBtn.disabled       = false;
    btnText.style.display    = 'inline';
    btnSpinner.style.display = 'none';

    showToast(`Welcome, ${residentData.fullName.split(' ')[0]}! ✓`);

  }, 1200);
});


/* ══════════════════════════════════════
   CARD ACTION BUTTONS
══════════════════════════════════════ */

// Go to dashboard (links to index.html)
goDashboard.addEventListener('click', () => {
  window.location.href = 'index.html';
});

// Register another — reset everything
registerAnother.addEventListener('click', () => {
  form.reset();
  clearAllErrors();
  photoDataURL               = null;
  photoPreview.src           = '';
  previewWrap.style.display  = 'none';
  dropInner.style.display    = 'flex';
  cardSection.style.display  = 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast('Form cleared. Register another resident.');
});


/* ══════════════════════════════════════
   LOAD THEME FROM MAIN APP
══════════════════════════════════════ */

// If user already set theme in the main app, apply it
const savedTheme = localStorage.getItem('nestiq_theme');
if (savedTheme === 'dark') {
  document.body.dataset.theme = 'dark';
}


/* ══════════════════════════════════════
   SET MAX DATE FOR DOB (18 years ago)
   AND MIN DATE FOR MOVE-IN (today)
══════════════════════════════════════ */

(() => {
  const today        = new Date();
  const maxDOB       = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  const yyyy         = maxDOB.getFullYear();
  const mm           = String(maxDOB.getMonth() + 1).padStart(2, '0');
  const dd           = String(maxDOB.getDate()).padStart(2, '0');
  fields.dob.max     = `${yyyy}-${mm}-${dd}`;

  const todayStr     = today.toISOString().split('T')[0];
  fields.moveIn.min  = '2000-01-01';
  fields.moveIn.max  = todayStr;
})();


/* ══════════════════════════════════════
   PHONE — NUMBERS ONLY
══════════════════════════════════════ */
fields.phone.addEventListener('keypress', (e) => {
  if (!/\d/.test(e.key)) e.preventDefault();
});


/* ══════════════════════════════════════
   LOG STORED RESIDENTS (DEV HELPER)
══════════════════════════════════════ */
console.log(
  `%cNestIQ Registration`,
  'color:#2a7d6f; font-weight:bold; font-size:14px'
);
console.log('Registered residents in localStorage:', getFromLocalStorage());
