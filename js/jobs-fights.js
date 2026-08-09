import { supabase } from './supabase.js';
import { refreshCalendar } from './calendar.js';


const addJobBtn =
  document.getElementById(
    'addJobBtn'
  );

const addFightBtn =
  document.getElementById(
    'addFightBtn'
  );

const jobDialog =
  document.getElementById(
    'jobDialog'
  );

const fightDialog =
  document.getElementById(
    'fightDialog'
  );


const jName =
  document.getElementById(
    'jName'
  );

const jContactSearch =
  document.getElementById(
    'jContactSearch'
  );

const jContact =
  document.getElementById(
    'jContact'
  );

const jOwner =
  document.getElementById(
    'jOwner'
  );

const jStatus =
  document.getElementById(
    'jStatus'
  );

const jImportance =
  document.getElementById(
    'jImportance'
  );

const jDue =
  document.getElementById(
    'jDue'
  );

const jNotes =
  document.getElementById(
    'jNotes'
  );

const jShowCalendar =
  document.getElementById(
    'jShowCalendar'
  );

const saveJob =
  document.getElementById(
    'saveJob'
  );

const jobFormStatus =
  document.getElementById(
    'jobFormStatus'
  );


const fFighter =
  document.getElementById(
    'fFighter'
  );

const fOpponent =
  document.getElementById(
    'fOpponent'
  );

const fPromotion =
  document.getElementById(
    'fPromotion'
  );

const fEvent =
  document.getElementById(
    'fEvent'
  );

const fDate =
  document.getElementById(
    'fDate'
  );

const fResult =
  document.getElementById(
    'fResult'
  );

const fNotes =
  document.getElementById(
    'fNotes'
  );

const fShowCalendar =
  document.getElementById(
    'fShowCalendar'
  );

const saveFight =
  document.getElementById(
    'saveFight'
  );

const fightFormStatus =
  document.getElementById(
    'fightFormStatus'
  );


let contacts = [];


function esc(value) {
  return String(
    value ?? ''
  ).replace(
    /[&<>"']/g,
    char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char])
  );
}


function setStatus(
  element,
  message,
  error = false
) {
  if (!element) return;

  element.textContent =
    message;

  element.style.color =
    error
      ? '#ff8b8b'
      : '';
}


async function requireSession() {
  const {
    data: { session }
  } = await supabase.auth
    .getSession();

  if (!session?.user) {
    throw new Error(
      'Please log in first.'
    );
  }

  return session;
}


function renderContactChoices(
  search = ''
) {
  const query =
    search
      .toLowerCase()
      .trim();


  const filtered =
    contacts.filter(
      contact =>

        !query ||

        contact.name
          .toLowerCase()
          .includes(query) ||

        String(
          contact.contact_type
        )
          .toLowerCase()
          .includes(query)
    );


  jContact.innerHTML = `
    <option value="">
      Select contact
    </option>

    ${
      filtered
        .map(
          contact => `
            <option value="${contact.id}">
              ${esc(contact.name)}
              •
              ${esc(contact.contact_type)}
            </option>
          `
        )
        .join('')
    }
  `;
}


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
      .order('name'),


    supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email
      `)
      .order('full_name')

  ]);


  if (contactsResult.error) {
    throw contactsResult.error;
  }


  if (profilesResult.error) {
    throw profilesResult.error;
  }


  contacts =
    contactsResult.data ??
    [];


  renderContactChoices();


  jOwner.innerHTML = `
    <option value="">
      Select owner
    </option>

    ${
      (profilesResult.data ?? [])
        .map(
          profile => `
            <option value="${profile.id}">
              ${
                esc(
                  profile.full_name ||
                  profile.email
                )
              }
            </option>
          `
        )
        .join('')
    }
  `;
}


jContactSearch
  ?.addEventListener(
    'input',
    () => {

      renderContactChoices(
        jContactSearch.value
      );

    }
  );


async function loadFighters() {
  const {
    data,
    error
  } = await supabase
    .from('fighters')
    .select(`
      id,
      nickname,

      contacts (
        name
      )
    `)
    .order('created_at');


  if (error) {
    throw error;
  }


  fFighter.innerHTML = `
    <option value="">
      Select fighter
    </option>

    ${
      (data ?? [])
        .map(
          fighter => {

            const name =
              fighter.contacts?.name ||
              fighter.nickname ||
              `Fighter ${fighter.id}`;

            return `
              <option value="${fighter.id}">
                ${esc(name)}
              </option>
            `;

          }
        )
        .join('')
    }
  `;
}


addJobBtn
  ?.addEventListener(
    'click',
    async () => {

      try {

        await requireSession();

        jContactSearch.value =
          '';

        await loadJobOptions();

        jobDialog.showModal();

      } catch (error) {

        alert(
          error.message
        );

      }

    }
  );


addFightBtn
  ?.addEventListener(
    'click',
    async () => {

      try {

        await requireSession();

        await loadFighters();

        fightDialog.showModal();

      } catch (error) {

        alert(
          error.message
        );

      }

    }
  );


saveJob
  ?.addEventListener(
    'click',
    async () => {

      try {

        await requireSession();


        if (!jName.value.trim()) {
          throw new Error(
            'Enter a job name.'
          );
        }


        if (!jContact.value) {
          throw new Error(
            'Select a contact.'
          );
        }


        if (!jOwner.value) {
          throw new Error(
            'Select an owner.'
          );
        }


        if (!jDue.value) {
          throw new Error(
            'Select a due date.'
          );
        }


        saveJob.disabled =
          true;

        saveJob.textContent =
          'Saving...';


        setStatus(
          jobFormStatus,
          'Saving...'
        );


        const {
          data,
          error
        } = await supabase
          .from('jobs')
          .insert({

            name:
              jName.value.trim(),

            contact_id:
              Number(
                jContact.value
              ),

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
              jNotes.value.trim() ||
              null,

            show_on_calendar:
              jShowCalendar.checked

          })
          .select(`
            id,
            name
          `)
          .single();


        if (error) {
          throw error;
        }


        // DIRECT REFRESH.
        await refreshCalendar();


        setStatus(
          jobFormStatus,
          'Job saved!'
        );


        setTimeout(
          () => {

            jobDialog.close();

            jName.value = '';
            jContactSearch.value = '';
            jContact.value = '';
            jOwner.value = '';
            jDue.value = '';
            jNotes.value = '';
            jImportance.value = '3';
            jShowCalendar.checked = true;

          },
          250
        );


      } catch (error) {

        console.error(
          'Save job error:',
          error
        );

        setStatus(
          jobFormStatus,
          error.message,
          true
        );


      } finally {

        saveJob.disabled =
          false;

        saveJob.textContent =
          'Add Job';

      }

    }
  );


saveFight
  ?.addEventListener(
    'click',
    async () => {

      try {

        await requireSession();


        if (!fFighter.value) {
          throw new Error(
            'Select a fighter.'
          );
        }


        if (!fDate.value) {
          throw new Error(
            'Select a fight date.'
          );
        }


        saveFight.disabled =
          true;

        saveFight.textContent =
          'Saving...';


        const {
          error
        } = await supabase
          .from('fights')
          .insert({

            fighter_id:
              Number(
                fFighter.value
              ),

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

          });


        if (error) {
          throw error;
        }


        await refreshCalendar();


        setStatus(
          fightFormStatus,
          'Fight saved!'
        );


        setTimeout(
          () => {

            fightDialog.close();

            fFighter.value = '';
            fOpponent.value = '';
            fPromotion.value = '';
            fEvent.value = '';
            fDate.value = '';
            fResult.value = '';
            fNotes.value = '';
            fShowCalendar.checked = true;

          },
          250
        );


      } catch (error) {

        console.error(
          'Save fight error:',
          error
        );

        setStatus(
          fightFormStatus,
          error.message,
          true
        );


      } finally {

        saveFight.disabled =
          false;

        saveFight.textContent =
          'Add Fight';

      }

    }
  );