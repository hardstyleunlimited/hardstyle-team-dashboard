import { supabase } from './supabase.js';

const addJobBtn = document.getElementById('addJobBtn');
const addFightBtn = document.getElementById('addFightBtn');

const jobDialog = document.getElementById('jobDialog');
const fightDialog = document.getElementById('fightDialog');

// JOB FORM
const jName = document.getElementById('jName');
const jContactSearch = document.getElementById('jContactSearch');
const jContact = document.getElementById('jContact');
const jOwner = document.getElementById('jOwner');
const jStatus = document.getElementById('jStatus');
const jImportance = document.getElementById('jImportance');
const jDue = document.getElementById('jDue');
const jNotes = document.getElementById('jNotes');
const jShowCalendar = document.getElementById('jShowCalendar');
const saveJob = document.getElementById('saveJob');
const jobFormStatus = document.getElementById('jobFormStatus');

// FIGHT FORM
const fFighter = document.getElementById('fFighter');
const fOpponent = document.getElementById('fOpponent');
const fPromotion = document.getElementById('fPromotion');
const fEvent = document.getElementById('fEvent');
const fDate = document.getElementById('fDate');
const fResult = document.getElementById('fResult');
const fNotes = document.getElementById('fNotes');
const fShowCalendar = document.getElementById('fShowCalendar');
const saveFight = document.getElementById('saveFight');
const fightFormStatus = document.getElementById('fightFormStatus');

let cachedContacts = [];


/* =========================
   HELPERS
========================= */

function setStatus(element, message, isError = false) {
  if (!element) return;

  element.textContent = message;

  element.style.color = isError
    ? '#ff8b8b'
    : '';
}


function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char])
  );
}


async function requireSession() {
  const {
    data: { session },
    error
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  if (!session?.user) {
    throw new Error(
      'Please sign in first.'
    );
  }

  return session;
}


/* =========================
   CONTACT SEARCH
========================= */

function renderContactOptions(searchText = '') {
  if (!jContact) return;

  const search = searchText
    .trim()
    .toLowerCase();

  const filteredContacts =
    cachedContacts.filter((contact) => {

      const name =
        contact.name
          ?.toLowerCase() || '';

      const type =
        contact.contact_type
          ?.toLowerCase() || '';

      return (
        name.includes(search) ||
        type.includes(search)
      );
    });

  jContact.innerHTML =
    `
      <option value="">
        Select contact
      </option>
    ` +
    filteredContacts
      .map((contact) => {

        const typeText =
          contact.contact_type
            ? ` • ${escapeHtml(contact.contact_type)}`
            : '';

        return `
          <option value="${contact.id}">
            ${escapeHtml(contact.name)}${typeText}
          </option>
        `;
      })
      .join('');
}


jContactSearch?.addEventListener(
  'input',
  () => {
    renderContactOptions(
      jContactSearch.value
    );
  }
);


/* =========================
   LOAD JOB OPTIONS
========================= */

async function loadJobOptions() {
  const [
    contactsResult,
    profilesResult
  ] = await Promise.all([

    supabase
      .from('contacts')
      .select(`
        id,
        name,
        contact_type
      `)
      .order(
        'name',
        { ascending: true }
      ),

    supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email
      `)
      .order(
        'full_name',
        { ascending: true }
      )

  ]);

  if (contactsResult.error) {
    console.error(
      'Contact options error:',
      contactsResult.error
    );

    setStatus(
      jobFormStatus,
      contactsResult.error.message,
      true
    );
  } else {
    cachedContacts =
      contactsResult.data ?? [];

    renderContactOptions();
  }


  if (profilesResult.error) {
    console.error(
      'Owner options error:',
      profilesResult.error
    );

    setStatus(
      jobFormStatus,
      profilesResult.error.message,
      true
    );

    return;
  }

  if (jOwner) {
    jOwner.innerHTML =
      `
        <option value="">
          Select owner
        </option>
      ` +
      (profilesResult.data ?? [])
        .map((profile) => {

          const displayName =
            profile.full_name ||
            profile.email ||
            'Team Member';

          return `
            <option value="${profile.id}">
              ${escapeHtml(displayName)}
            </option>
          `;
        })
        .join('');
  }
}


/* =========================
   LOAD FIGHTERS
========================= */

async function loadFighterOptions() {
  const { data, error } =
    await supabase
      .from('fighters')
      .select(`
        id,
        nickname,
        contacts (
          id,
          name
        )
      `)
      .order(
        'created_at',
        { ascending: true }
      );

  if (error) {
    console.error(
      'Fighter options error:',
      error
    );

    setStatus(
      fightFormStatus,
      error.message,
      true
    );

    return;
  }

  if (!fFighter) return;

  fFighter.innerHTML =
    `
      <option value="">
        Select fighter
      </option>
    ` +
    (data ?? [])
      .map((fighter) => {

        const fighterName =
          fighter.contacts?.name ||
          fighter.nickname ||
          `Fighter #${fighter.id}`;

        const nickname =
          fighter.nickname &&
          fighter.contacts?.name
            ? ` • ${fighter.nickname}`
            : '';

        return `
          <option value="${fighter.id}">
            ${escapeHtml(
              fighterName + nickname
            )}
          </option>
        `;
      })
      .join('');
}


/* =========================
   OPEN DIALOGS
========================= */

async function openJobDialog() {
  try {
    await requireSession();

    setStatus(
      jobFormStatus,
      ''
    );

    if (jContactSearch) {
      jContactSearch.value = '';
    }

    await loadJobOptions();

    jobDialog.showModal();

  } catch (error) {
    console.error(error);

    alert(
      error.message
    );
  }
}


async function openFightDialog() {
  try {
    await requireSession();

    setStatus(
      fightFormStatus,
      ''
    );

    await loadFighterOptions();

    fightDialog.showModal();

  } catch (error) {
    console.error(error);

    alert(
      error.message
    );
  }
}


/* =========================
   CREATE JOB
========================= */

async function createJob() {
  try {
    await requireSession();

    const name =
      jName?.value.trim();

    if (!name) {
      setStatus(
        jobFormStatus,
        'Please enter a job name.',
        true
      );

      return;
    }

    if (!jContact?.value) {
      setStatus(
        jobFormStatus,
        'Please select a contact.',
        true
      );

      return;
    }

    if (!jOwner?.value) {
      setStatus(
        jobFormStatus,
        'Please select an owner.',
        true
      );

      return;
    }

    if (!jDue?.value) {
      setStatus(
        jobFormStatus,
        'Please select a due date.',
        true
      );

      return;
    }

    saveJob.disabled = true;
    saveJob.textContent =
      'Saving...';

    setStatus(
      jobFormStatus,
      'Saving job...'
    );


    const {
      data,
      error
    } = await supabase
      .from('jobs')
      .insert({

        name: name,

        contact_id:
          Number(jContact.value),

        owner_id:
          jOwner.value,

        status:
          jStatus.value,

        importance:
          Number(
            jImportance.value
          ),

        due_date:
          jDue.value,

        notes:
          jNotes?.value.trim() ||
          null,

        show_on_calendar:
          jShowCalendar
            ? jShowCalendar.checked
            : true

      })
      .select(`
        id,
        name,
        due_date
      `)
      .single();


    if (error) {
      throw error;
    }


    console.log(
      'Job created:',
      data
    );


    setStatus(
      jobFormStatus,
      'Job saved!'
    );


    // Tell dashboard data changed
    window.dispatchEvent(
      new CustomEvent(
        'hardstyle:data-changed',
        {
          detail: {
            type: 'job',
            id: data.id
          }
        }
      )
    );


    // Force immediate calendar refresh
    if (
      typeof window
        .refreshHardstyleCalendar ===
      'function'
    ) {
      await window
        .refreshHardstyleCalendar();
    }


    setTimeout(() => {

      jobDialog.close();

      resetJobForm();

    }, 300);

  } catch (error) {

    console.error(
      'Create job error:',
      error
    );

    setStatus(
      jobFormStatus,
      error.message ||
      'Could not save job.',
      true
    );

  } finally {

    saveJob.disabled = false;

    saveJob.textContent =
      'Add Job';
  }
}


/* =========================
   RESET JOB
========================= */

function resetJobForm() {
  if (jName) {
    jName.value = '';
  }

  if (jContactSearch) {
    jContactSearch.value = '';
  }

  if (jContact) {
    jContact.value = '';
  }

  if (jOwner) {
    jOwner.value = '';
  }

  if (jStatus) {
    jStatus.value =
      'paid_in_work';
  }

  if (jImportance) {
    jImportance.value =
      '3';
  }

  if (jDue) {
    jDue.value = '';
  }

  if (jNotes) {
    jNotes.value = '';
  }

  if (jShowCalendar) {
    jShowCalendar.checked =
      true;
  }

  setStatus(
    jobFormStatus,
    ''
  );
}


/* =========================
   CREATE FIGHT
========================= */

async function createFight() {
  try {
    await requireSession();

    if (!fFighter?.value) {
      setStatus(
        fightFormStatus,
        'Please select a fighter.',
        true
      );

      return;
    }

    if (!fDate?.value) {
      setStatus(
        fightFormStatus,
        'Please select a fight date.',
        true
      );

      return;
    }


    saveFight.disabled = true;

    saveFight.textContent =
      'Saving...';


    setStatus(
      fightFormStatus,
      'Saving fight...'
    );


    const {
      data,
      error
    } = await supabase
      .from('fights')
      .insert({

        fighter_id:
          Number(
            fFighter.value
          ),

        opponent:
          fOpponent?.value.trim() ||
          null,

        promotion:
          fPromotion?.value.trim() ||
          null,

        event_name:
          fEvent?.value.trim() ||
          null,

        fight_date:
          fDate.value,

        result:
          fResult?.value.trim() ||
          null,

        notes:
          fNotes?.value.trim() ||
          null,

        show_on_calendar:
          fShowCalendar
            ? fShowCalendar.checked
            : true

      })
      .select(`
        id,
        fighter_id,
        fight_date
      `)
      .single();


    if (error) {
      throw error;
    }


    console.log(
      'Fight created:',
      data
    );


    setStatus(
      fightFormStatus,
      'Fight saved!'
    );


    window.dispatchEvent(
      new CustomEvent(
        'hardstyle:data-changed',
        {
          detail: {
            type: 'fight',
            id: data.id
          }
        }
      )
    );


    // Force calendar refresh
    if (
      typeof window
        .refreshHardstyleCalendar ===
      'function'
    ) {
      await window
        .refreshHardstyleCalendar();
    }


    setTimeout(() => {

      fightDialog.close();

      resetFightForm();

    }, 300);

  } catch (error) {

    console.error(
      'Create fight error:',
      error
    );

    setStatus(
      fightFormStatus,
      error.message ||
      'Could not save fight.',
      true
    );

  } finally {

    saveFight.disabled =
      false;

    saveFight.textContent =
      'Add Fight';
  }
}


/* =========================
   RESET FIGHT
========================= */

function resetFightForm() {
  if (fFighter) {
    fFighter.value = '';
  }

  if (fOpponent) {
    fOpponent.value = '';
  }

  if (fPromotion) {
    fPromotion.value = '';
  }

  if (fEvent) {
    fEvent.value = '';
  }

  if (fDate) {
    fDate.value = '';
  }

  if (fResult) {
    fResult.value = '';
  }

  if (fNotes) {
    fNotes.value = '';
  }

  if (fShowCalendar) {
    fShowCalendar.checked =
      true;
  }

  setStatus(
    fightFormStatus,
    ''
  );
}


/* =========================
   BUTTON EVENTS
========================= */

addJobBtn?.addEventListener(
  'click',
  openJobDialog
);


addFightBtn?.addEventListener(
  'click',
  openFightDialog
);


saveJob?.addEventListener(
  'click',
  createJob
);


saveFight?.addEventListener(
  'click',
  createFight
);