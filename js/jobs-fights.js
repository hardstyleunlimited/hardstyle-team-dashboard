import { supabase } from './supabase.js';

const addJobBtn = document.getElementById('addJobBtn');
const addFightBtn = document.getElementById('addFightBtn');
const jobDialog = document.getElementById('jobDialog');
const fightDialog = document.getElementById('fightDialog');

const jName = document.getElementById('jName');
const jContact = document.getElementById('jContactSearch');
const jOwner = document.getElementById('jOwner');
const jStatus = document.getElementById('jStatus');
const jImportance = document.getElementById('jImportance');
const jDue = document.getElementById('jDue');
const jNotes = document.getElementById('jNotes');
const jShowCalendar = document.getElementById('jShowCalendar');
const saveJob = document.getElementById('saveJob');
const jobFormStatus = document.getElementById('jobFormStatus');

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

function setStatus(element, message, isError = false) {
  if (!element) return;

  element.textContent = message;
  element.style.color = isError ? '#ff8b8b' : '';
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
    throw new Error('Please sign in first.');
  }

  return session;
}

async function loadJobOptions() {
  const [
    {
      data: contacts,
      error: contactsError
    },
    {
      data: profiles,
      error: profilesError
    }
  ] = await Promise.all([
    supabase
      .from('contacts')
      .select('id, name, contact_type')
      .order('name'),

    supabase
      .from('profiles')
      .select('id, full_name, email')
      .order('full_name')
  ]);

  if (contactsError) {
    console.error(
      'Contact options error:',
      contactsError
    );

    setStatus(
      jobFormStatus,
      contactsError.message,
      true
    );
 } else {

  cachedContacts =
    contacts ?? [];

  renderContactOptions();

}

  if (profilesError) {
    console.error(
      'Owner options error:',
      profilesError
    );

    setStatus(
      jobFormStatus,
      profilesError.message,
      true
    );
  } else {
    jOwner.innerHTML =
      '<option value="">Select owner</option>' +
      (profiles ?? [])
        .map((profile) => {
          return `
            <option value="${profile.id}">
              ${escapeHtml(
                profile.full_name ||
                profile.email ||
                'Team Member'
              )}
            </option>
          `;
        })
        .join('');
  }
}

async function loadFighterOptions() {
  const { data, error } = await supabase
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

  fFighter.innerHTML =
    '<option value="">Select fighter</option>' +
    (data ?? [])
      .map((fighter) => {
        const displayName =
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
            ${escapeHtml(displayName + nickname)}
          </option>
        `;
      })
      .join('');
}

async function openJobDialog() {
  try {
    await requireSession();

    setStatus(
      jobFormStatus,
      ''
    );

    await loadJobOptions();

    jobDialog.showModal();
  } catch (error) {
    alert(error.message);
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
    alert(error.message);
  }
}

async function createJob() {
  try {
    await requireSession();

    const name = jName.value.trim();

    if (!name) {
      setStatus(
        jobFormStatus,
        'Please enter a job name.',
        true
      );

      return;
    }

    if (!jContact.value) {
      setStatus(
        jobFormStatus,
        'Please select a customer or person.',
        true
      );

      return;
    }

    if (!jOwner.value) {
      setStatus(
        jobFormStatus,
        'Please select an owner.',
        true
      );

      return;
    }

    if (!jDue.value) {
      setStatus(
        jobFormStatus,
        'Please select a due date.',
        true
      );

      return;
    }

    saveJob.disabled = true;
    saveJob.textContent = 'Saving...';

    setStatus(
      jobFormStatus,
      'Saving job...'
    );

    const { data, error } = await supabase
      .from('jobs')
      .insert({
        name,

        contact_id:
          Number(jContact.value),

        owner_id:
          jOwner.value,

        status:
          jStatus.value,

        importance:
          Number(jImportance.value),

        due_date:
          jDue.value,

        notes:
          jNotes.value.trim() ||
          null,

        show_on_calendar:
          jShowCalendar.checked
      })
      .select(
        'id, name'
      )
      .single();

    if (error) {
      throw error;
    }

    setStatus(
      jobFormStatus,
      'Job saved.'
    );

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
    saveJob.textContent = 'Add Job';
  }
}

function resetJobForm() {

  jName.value = '';

  jContactSearch.value = '';

  jContact.value = '';

  jOwner.value = '';

  jStatus.value =
    'paid_in_work';

  jImportance.value =
    '3';

  jDue.value = '';

  jNotes.value = '';

  jShowCalendar.checked =
    true;

  setStatus(
    jobFormStatus,
    ''
  );
}

async function createFight() {
  try {
    await requireSession();

    if (!fFighter.value) {
      setStatus(
        fightFormStatus,
        'Please select a fighter.',
        true
      );

      return;
    }

    if (!fDate.value) {
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

    const { data, error } = await supabase
      .from('fights')
      .insert({
        fighter_id:
          Number(fFighter.value),

        opponent:
          fOpponent.value.trim() ||
          null,

        promotion:
          fPromotion.value.trim() ||
          null,

        event_name:
          fEvent.value.trim() ||
          null,

        fight_date:
          fDate.value,

        result:
          fResult.value.trim() ||
          null,

        notes:
          fNotes.value.trim() ||
          null,

        show_on_calendar:
          fShowCalendar.checked
      })
      .select(
        'id, fighter_id'
      )
      .single();

    if (error) {
      throw error;
    }

    setStatus(
      fightFormStatus,
      'Fight saved.'
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
    saveFight.disabled = false;
    saveFight.textContent =
      'Add Fight';
  }
}

function resetFightForm() {
  fFighter.value = '';

  fOpponent.value = '';
  fPromotion.value = '';
  fEvent.value = '';
  fDate.value = '';
  fResult.value = '';
  fNotes.value = '';

  fShowCalendar.checked =
    true;

  setStatus(
    fightFormStatus,
    ''
  );
}

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
let cachedContacts = [];

function renderContactOptions(
  searchText = ''
) {
  const search =
    searchText
      .trim()
      .toLowerCase();

  const filtered =
    cachedContacts.filter(
      contact => {

        const name =
          contact.name
            ?.toLowerCase() ||
          '';

        const type =
          contact
            .contact_type
            ?.toLowerCase() ||
          '';

        return (
          name.includes(search) ||
          type.includes(search)
        );

      }
    );

  jContact.innerHTML =
    `
      <option value="">
        Select contact
      </option>
    ` +
    filtered
      .map(contact => {

        return `
          <option value="${contact.id}">
            ${
              escapeHtml(
                contact.name
              )
            }
            ${
              contact.contact_type
                ? ` • ${
                    escapeHtml(
                      contact
                        .contact_type
                    )
                  }`
                : ''
            }
          </option>
        `;

      })
      .join('');
}

jContactSearch
  ?.addEventListener(
    'input',
    () => {

      renderContactOptions(
        jContactSearch.value
      );

    }
  );