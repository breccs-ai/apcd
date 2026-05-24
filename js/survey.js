/* =========================================================
   APCD, African People Collaboration Donegal
   Africa Day 2026 Feedback Survey - client logic
   =========================================================

   - Hard close at 28 May 2026 23:59:59 Irish time
   - Validates all required questions inline, with an a11y summary
   - Toggles the conditional "Other" organisation field
   - Toggles the conditional newsletter email field
   - Submits the survey response to Web3Forms (no PII)
   - Optionally sends a separate newsletter sign-up notification
   ========================================================= */

/* ---------- 1. Constants ---------- */

// 28 May 2026 23:59:59 Europe/Dublin (IST = UTC+1 in May).
// Stored as an absolute UTC instant so timezone-shifted clients
// see the same close moment.
const SURVEY_CLOSE_AT_UTC = new Date('2026-05-28T22:59:59Z');

const SUBMITTED_FLAG_KEY = 'apcd_africa_day_2026_submitted';

const NEWSLETTER_SOURCE = 'africa_day_2026';
const WEB3FORMS_API_URL = 'https://api.web3forms.com/submit';

/* ---------- 2. Bootstrap ---------- */

document.addEventListener('DOMContentLoaded', function () {
  // Auto-close gate runs before anything else so we never wire up
  // a form that should not accept submissions any more.
  if (isSurveyClosed()) {
    showClosedState();
    return;
  }

  // If this browser already submitted (best-effort; honest users only),
  // jump straight to the thank-you state.
  if (hasAlreadySubmitted()) {
    showThankYouState();
    return;
  }

  initConditionalToggles();
  initLiveErrorClear();
  initFormSubmit();
});

/* ---------- 3. Auto-close ---------- */

function isSurveyClosed() {
  return Date.now() > SURVEY_CLOSE_AT_UTC.getTime();
}

function showClosedState() {
  hide('survey-active');
  show('survey-closed');
}

function showThankYouState() {
  hide('survey-active');
  show('survey-thank-you');
}

/* ---------- 4. Conditional fields ---------- */

function initConditionalToggles() {
  // Q2: "Other" organisation -> show text input
  document
    .querySelectorAll('input[data-toggle-conditional]')
    .forEach(function (input) {
      const targetId = input.getAttribute('data-toggle-conditional');
      const target = document.getElementById(targetId);
      if (!target) return;

      const update = function () {
        let isOn = false;
        if (input.type === 'checkbox') {
          isOn = input.checked;
        } else if (input.type === 'radio') {
          // For radio, the conditional is visible only while THIS option
          // is checked. Other radios in the same group hide it.
          isOn = input.checked;
          // listen to the group too so unchecking via another option hides it
          const others = document.querySelectorAll(
            'input[type="radio"][name="' + input.name + '"]'
          );
          others.forEach(function (o) {
            if (o === input) return;
            if (o.dataset.conditionalListenerBound === '1') return;
            o.dataset.conditionalListenerBound = '1';
            o.addEventListener('change', function () {
              if (!input.checked) target.classList.remove('is-visible');
            });
          });
        }
        target.classList.toggle('is-visible', isOn);
        if (!isOn) {
          // Clear any text in the hidden conditional so we don't submit stale data
          target.querySelectorAll('input, textarea').forEach(function (el) {
            if (el.type === 'text' || el.type === 'email') el.value = '';
            clearFieldError(el.name || el.id);
          });
        }
      };

      input.addEventListener('change', update);
      update();
    });
}

/* ---------- 5. Live error clearing ---------- */

function initLiveErrorClear() {
  const form = document.getElementById('survey-form');
  if (!form) return;

  form.addEventListener('change', function (e) {
    const name = e.target && e.target.name;
    if (!name) return;
    clearFieldError(name);
    const card = e.target.closest('.question-card');
    if (card) card.classList.remove('has-error');
  });

  form.addEventListener('input', function (e) {
    const name = e.target && e.target.name;
    if (!name) return;
    clearFieldError(name);
    const card = e.target.closest('.question-card');
    if (card) card.classList.remove('has-error');
  });
}

/* ---------- 6. Submit ---------- */

function initFormSubmit() {
  const form = document.getElementById('survey-form');
  const submitBtn = document.getElementById('survey-submit');
  if (!form || !submitBtn) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Always re-check the close gate at submit time.
    if (isSurveyClosed()) {
      showClosedState();
      return;
    }

    // Validate. If anything fails, surface the summary and bail.
    const validation = validateForm(form);
    if (!validation.ok) {
      showErrorSummary();
      const firstField = validation.firstInvalidField;
      if (firstField) {
        const card = firstField.closest('.question-card') || firstField;
        try {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (_) {
          card.scrollIntoView();
        }
        // Move focus into the question for screen reader users
        const focusable = card.querySelector('input, textarea, button');
        if (focusable) focusable.focus({ preventScroll: true });
      }
      return;
    }

    hideErrorSummary();

    // Build payload.
    const payload = buildSurveyPayload(form);
    const newsletter = readNewsletterOptIn(form);

    setSubmitting(submitBtn, true);

    try {
      await submitToWeb3Forms(buildWeb3FormsSurveyPayload(form, payload));

      // Keep newsletter sign-ups separate from anonymous survey feedback.
      if (newsletter.optIn && newsletter.email) {
        submitToWeb3Forms(buildWeb3FormsNewsletterPayload(newsletter.email))
          .catch(function (err) {
            console.warn('Newsletter notify failed:', err);
          });
      }

      markSubmittedLocally();
      showThankYouState();
      // Clean scroll to the new state.
      try {
        document
          .getElementById('survey-thank-you')
          .scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (_) {}
    } catch (err) {
      console.error('Survey submit failed:', err);
      setSubmitting(submitBtn, false);
      showSubmitError(
        'We could not save your feedback. Please check your connection and try again.'
      );
    }
  });
}

function setSubmitting(btn, isSubmitting) {
  const label = btn.querySelector('.submit-label');
  if (isSubmitting) {
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    if (label) {
      btn.dataset.originalLabel = label.textContent;
      label.innerHTML =
        '<span class="spinner" aria-hidden="true"></span>&nbsp; Saving…';
    }
  } else {
    btn.disabled = false;
    btn.removeAttribute('aria-busy');
    if (label && btn.dataset.originalLabel) {
      label.textContent = btn.dataset.originalLabel;
    }
  }
}

/* ---------- 7. Validation ---------- */

function validateForm(form) {
  let firstInvalidField = null;
  let ok = true;

  // Reset prior error state
  form
    .querySelectorAll('.question-card.has-error')
    .forEach(function (c) { c.classList.remove('has-error'); });
  form
    .querySelectorAll('.field-error.is-visible')
    .forEach(function (e) { e.classList.remove('is-visible'); });

  // Required radio groups
  const requiredRadioNames = [
    'respondent_type',
    'organisation',
    'age_range',
    'overall_rating',
    'felt_welcome',
    'felt_connected',
    'would_attend_again',
    'would_recommend'
  ];

  requiredRadioNames.forEach(function (name) {
    const group = form.querySelectorAll('input[name="' + name + '"]');
    const checked = Array.prototype.some.call(group, function (i) { return i.checked; });
    if (!checked) {
      ok = false;
      flagFieldError(name);
      if (!firstInvalidField && group[0]) firstInvalidField = group[0];
    }
  });

  // Required checkbox groups (at least 1)
  const requiredCheckboxGroups = ['how_heard', 'enjoyed_most'];
  requiredCheckboxGroups.forEach(function (name) {
    const group = form.querySelectorAll(
      'input[type="checkbox"][name="' + name + '"]'
    );
    const anyChecked = Array.prototype.some.call(group, function (i) { return i.checked; });
    if (!anyChecked) {
      ok = false;
      flagFieldError(name);
      if (!firstInvalidField && group[0]) firstInvalidField = group[0];
    }
  });

  // Q2: if "Other" is selected, the text must not be blank
  const orgChoice = form.querySelector('input[name="organisation"]:checked');
  if (orgChoice && orgChoice.value === 'other') {
    const otherInput = form.querySelector('#organisation_other');
    const v = otherInput ? otherInput.value.trim() : '';
    if (!v) {
      ok = false;
      flagFieldError('organisation_other');
      if (!firstInvalidField && otherInput) firstInvalidField = otherInput;
    }
  }

  // Newsletter: if opted in WITH an email present, validate it.
  // (An empty email + opt-in is allowed — opt-in without email simply
  // means we record no signup.)
  const optIn = form.querySelector('#newsletter_optin');
  const emailInput = form.querySelector('#newsletter_email');
  if (optIn && optIn.checked && emailInput && emailInput.value.trim()) {
    if (!isValidEmail(emailInput.value.trim())) {
      ok = false;
      flagFieldError('newsletter_email');
      if (!firstInvalidField) firstInvalidField = emailInput;
    }
  }

  return { ok: ok, firstInvalidField: firstInvalidField };
}

function isValidEmail(value) {
  // Conservative pattern: 'something@something.something'.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function flagFieldError(name) {
  const errEl = document.querySelector(
    '[data-error-for="' + cssEscape(name) + '"]'
  );
  if (errEl) {
    errEl.classList.add('is-visible');
    const card = errEl.closest('.question-card');
    if (card) card.classList.add('has-error');
  } else {
    // For inputs without a dedicated error element, mark the card
    const input = document.querySelector('[name="' + cssEscape(name) + '"]');
    const card = input && input.closest('.question-card');
    if (card) card.classList.add('has-error');
  }
}

function clearFieldError(name) {
  if (!name) return;
  const errEl = document.querySelector(
    '[data-error-for="' + cssEscape(name) + '"]'
  );
  if (errEl) errEl.classList.remove('is-visible');
}

function cssEscape(s) {
  if (window.CSS && typeof window.CSS.escape === 'function') {
    return window.CSS.escape(s);
  }
  // simple fallback
  return String(s).replace(/["\\]/g, '\\$&');
}

function showErrorSummary() {
  const el = document.getElementById('form-error-summary');
  if (!el) return;
  el.classList.add('is-visible');
  el.focus();
  try {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (_) {
    el.scrollIntoView();
  }
}

function hideErrorSummary() {
  const el = document.getElementById('form-error-summary');
  if (el) el.classList.remove('is-visible');
}

function showSubmitError(message) {
  const el = document.getElementById('form-error-summary');
  if (!el) return;
  el.innerHTML = '<strong>Sorry — something went wrong.</strong> ' + message;
  el.classList.add('is-visible');
  try {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (_) {}
  el.focus();
}

/* ---------- 8. Payload assembly ---------- */

function buildSurveyPayload(form) {
  const data = new FormData(form);

  const orgChoice = data.get('organisation') || '';
  const orgOther =
    orgChoice === 'other'
      ? (data.get('organisation_other') || '').toString().trim().slice(0, 120)
      : null;

  const openFb = (data.get('open_feedback') || '').toString().trim();

  return {
    respondent_type:    data.get('respondent_type'),
    organisation:       orgChoice,
    organisation_other: orgOther,
    age_range:          data.get('age_range'),
    how_heard:          collectChecked(form, 'how_heard'),
    overall_rating:     data.get('overall_rating'),
    enjoyed_most:       collectChecked(form, 'enjoyed_most'),
    improvements:       collectChecked(form, 'improvements'),
    felt_welcome:       data.get('felt_welcome'),
    felt_connected:     data.get('felt_connected'),
    would_attend_again: data.get('would_attend_again'),
    would_recommend:    data.get('would_recommend'),
    open_feedback:      openFb ? openFb.slice(0, 2000) : null
  };
}

function collectChecked(form, name) {
  const els = form.querySelectorAll(
    'input[type="checkbox"][name="' + cssEscape(name) + '"]:checked'
  );
  const out = [];
  els.forEach(function (el) { out.push(el.value); });
  return out;
}

function readNewsletterOptIn(form) {
  const optIn = form.querySelector('#newsletter_optin');
  const emailInput = form.querySelector('#newsletter_email');
  const email = emailInput ? emailInput.value.trim() : '';

  return {
    optIn: !!(optIn && optIn.checked),
    email: optIn && optIn.checked && email && isValidEmail(email) ? email : ''
  };
}

/* ---------- 9. Web3Forms submission ---------- */

function buildWeb3FormsSurveyPayload(form, payload) {
  return {
    subject: 'Africa Day 2026 Survey - New Response',
    from_name: 'APCD Website',
    form_name: 'Africa Day 2026 Feedback Survey',
    source: NEWSLETTER_SOURCE,
    submitted_at: new Date().toISOString(),
    respondent_type: selectedOptionText(form, 'respondent_type'),
    organisation: organisationText(form, payload),
    age_range: selectedOptionText(form, 'age_range'),
    how_heard: checkedOptionTexts(form, 'how_heard').join(', '),
    overall_rating: selectedOptionText(form, 'overall_rating'),
    enjoyed_most: checkedOptionTexts(form, 'enjoyed_most').join(', '),
    improvements: checkedOptionTexts(form, 'improvements').join(', ') || '(none)',
    felt_welcome: selectedOptionText(form, 'felt_welcome'),
    felt_connected: selectedOptionText(form, 'felt_connected'),
    would_attend_again: selectedOptionText(form, 'would_attend_again'),
    would_recommend: selectedOptionText(form, 'would_recommend'),
    open_feedback: payload.open_feedback || '(none)',
    message: buildSurveyMessage(form, payload)
  };
}

function buildWeb3FormsNewsletterPayload(email) {
  return {
    subject: 'New APCD Newsletter Signup',
    from_name: 'APCD Website',
    form_name: 'APCD Newsletter Signup',
    source: NEWSLETTER_SOURCE,
    email: email,
    message:
      'A new APCD newsletter signup was received.\n\n' +
      'Email: ' + email + '\n' +
      'Source: ' + NEWSLETTER_SOURCE + '\n' +
      'Submitted: ' + new Date().toISOString()
  };
}

function buildSurveyMessage(form, payload) {
  const lines = [
    'Africa Day 2026 - New Survey Response',
    '====================================',
    '',
    'Submitted: ' + new Date().toLocaleString('en-IE', {
      timeZone: 'Europe/Dublin',
      dateStyle: 'medium',
      timeStyle: 'short'
    }),
    '',
    'Respondent type: ' + selectedOptionText(form, 'respondent_type'),
    'Organisation: ' + organisationText(form, payload),
    'Age range: ' + selectedOptionText(form, 'age_range'),
    'How they heard: ' + checkedOptionTexts(form, 'how_heard').join(', '),
    'Overall rating: ' + selectedOptionText(form, 'overall_rating'),
    'Enjoyed most: ' + checkedOptionTexts(form, 'enjoyed_most').join(', '),
    'Improvements: ' + (checkedOptionTexts(form, 'improvements').join(', ') || '(none)'),
    'Felt welcome: ' + selectedOptionText(form, 'felt_welcome'),
    'Felt connected: ' + selectedOptionText(form, 'felt_connected'),
    'Would attend again: ' + selectedOptionText(form, 'would_attend_again'),
    'Would recommend: ' + selectedOptionText(form, 'would_recommend'),
    '',
    'Open feedback:',
    payload.open_feedback || '(none)'
  ];

  return lines.join('\n');
}

async function submitToWeb3Forms(fields) {
  const cfg = getWeb3FormsConfig();
  const data = new FormData();
  data.append('access_key', cfg.accessKey);
  data.append('botcheck', '');

  Object.keys(fields).forEach(function (key) {
    const value = fields[key];
    if (value === null || value === undefined || value === '') return;
    data.append(key, Array.isArray(value) ? value.join(', ') : String(value));
  });

  const response = await fetch(WEB3FORMS_API_URL, {
    method: 'POST',
    body: data
  });
  const result = await response.json().catch(function () { return null; });

  if (!response.ok || (result && result.success === false)) {
    throw new Error((result && result.message) || 'Web3Forms submission failed');
  }
}

function getWeb3FormsConfig() {
  const cfg = window.APCD_WEB3FORMS_CONFIG || {};
  if (!cfg.accessKey || cfg.accessKey.indexOf('YOUR-WEB3FORMS-ACCESS-KEY') !== -1) {
    throw new Error(
      'Web3Forms config is missing. Edit js/web3forms-config.js and set ' +
      'window.APCD_WEB3FORMS_CONFIG.accessKey.'
    );
  }
  return cfg;
}

function organisationText(form, payload) {
  if (payload.organisation === 'other') {
    return 'Other - ' + (payload.organisation_other || '(not specified)');
  }
  return selectedOptionText(form, 'organisation');
}

function selectedOptionText(form, name) {
  const input = form.querySelector('[name="' + cssEscape(name) + '"]:checked');
  return input ? optionText(input) : '';
}

function checkedOptionTexts(form, name) {
  const inputs = form.querySelectorAll('[name="' + cssEscape(name) + '"]:checked');
  const out = [];
  inputs.forEach(function (input) { out.push(optionText(input)); });
  return out;
}

function optionText(input) {
  const label = input.closest('label');
  if (!label) return input.value;

  const labelEl = label.querySelector('.option__label') || label;
  const clone = labelEl.cloneNode(true);
  clone.querySelectorAll('.option__hint').forEach(function (hint) {
    hint.remove();
  });

  return normalizeText(clone.textContent) || input.value;
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

/* ---------- 10. Local "already submitted" guard ---------- */

function hasAlreadySubmitted() {
  try {
    return window.localStorage.getItem(SUBMITTED_FLAG_KEY) === '1';
  } catch (_) {
    return false;
  }
}

function markSubmittedLocally() {
  try {
    window.localStorage.setItem(SUBMITTED_FLAG_KEY, '1');
  } catch (_) { /* private mode etc. — ignore */ }
}

/* ---------- 11. Tiny DOM helpers ---------- */

function show(id) {
  const el = document.getElementById(id);
  if (el) el.hidden = false;
}

function hide(id) {
  const el = document.getElementById(id);
  if (el) el.hidden = true;
}
