import { supabase } from './supabase.js';

const addContactBtn =
  document.getElementById('addContactBtn');

const contactDialog =
  document.getElementById('contactDialog');

const saveContact =
  document.getElementById('saveContact');

const cName =
  document.getElementById('cName');

const cPhone =
  document.getElementById('cPhone');

const cInstagram =
  document.getElementById('cInstagram');

const cType =
  document.getElementById('cType');

const cPerson =
  document.getElementById('cPerson');

const contactFormStatus =
  document.getElementById('contactFormStatus');

const contactSearch =
  document.getElementById('contactSearch');

const businessContacts =
  document.getElementById('businessContacts');

const fighterContacts =
  document.getElementById('fighterContacts');

const contactDetailPanel =
  document.getElementById('contactDetailPanel');

const contactDetailContent =
  document.getElementById('contactDetailContent');

let contactsCache = [];


/* =========================
   HELPERS
========================= */

function esc(value) {
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


function formatDate(value) {
  if (!value) {
    return 'No date';
  }

  const datePart =
    String(value).slice(0, 10);

  return new Date(
    `${datePart}T12:00:00`
  ).toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }
  );
}


function setStatus(
  message,
  isError = false
) {
  if (!contactFormStatus) {
    return;
  }

  contactFormStatus.textContent =
    message;

  contactFormStatus.style.color =
    isError
      ? '#ff8b8b'
      : '';
}


async function requireSession() {
  const {
    data: { session },
    error
  } =
    await supabase.auth
      .getSession();

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


function normalizeInstagram(
  value
) {
  const text =
    value.trim();

  if (!text) {
    return null;
  }

  return text.startsWith('@')
    ? text
    : `@${text}`;
}


/* =========================
   CONTACT CARDS
========================= */

function contactCard(
  contact
) {
  return `
    <div class="contact">

      <button
        type="button"
        class="dbContactName"
        data-contact-id="${contact.id}"

        style="
          background:none;
          border:0;
          color:var(--text);
          padding:0;
          font-weight:700;
          text-align:left;
          text-decoration:underline;
          text-underline-offset:3px;
          cursor:pointer;
        "
      >
        ${esc(contact.name)}
      </button>


      <div
        style="
          margin-top:5px;
          font-size:13px;
        "
      >

        ${
          contact.phone
            ? `<span>${esc(contact.phone)}</span>`
            : ''
        }

        ${
          contact.phone &&
          contact.instagram
            ? ' • '
            : ''
        }

        ${
          contact.instagram
            ? `<span>${esc(contact.instagram)}</span>`
            : ''
        }

      </div>


      ${
        contact.notes
          ? `
            <div
              class="muted"
              style="
                font-size:12px;
                margin-top:5px;
              "
            >
              ${esc(contact.notes)}
            </div>
          `
          : ''
      }

    </div>
  `;
}


/* =========================
   RENDER CONTACTS
========================= */

function renderContacts(
  searchText = ''
) {
  const query =
    searchText
      .trim()
      .toLowerCase();


  const filtered =
    contactsCache.filter(
      (contact) => {

        if (!query) {
          return true;
        }

        return [
          contact.name,
          contact.phone,
          contact.instagram,
          contact.notes,
          contact.contact_type
        ].some((value) => {

          return String(
            value ?? ''
          )
            .toLowerCase()
            .includes(query);

        });

      }
    );


  const businesses =
    filtered.filter(
      (contact) =>
        contact.contact_type ===
        'business'
    );


  const fighters =
    filtered.filter(
      (contact) =>
        contact.contact_type ===
        'fighter'
    );


  if (businessContacts) {
    businessContacts.innerHTML =
      businesses.length
        ? businesses
            .map(contactCard)
            .join('')
        : `
            <div class="muted">
              No businesses found.
            </div>
          `;
  }


  if (fighterContacts) {
    fighterContacts.innerHTML =
      fighters.length
        ? fighters
            .map(contactCard)
            .join('')
        : `
            <div class="muted">
              No fighters found.
            </div>
          `;
  }


  document
    .querySelectorAll(
      '.dbContactName'
    )
    .forEach(
      (button) => {

        button.addEventListener(
          'click',
          () => {

            openContactDetail(
              Number(
                button.dataset
                  .contactId
              )
            );

          }
        );

      }
    );
}


/* =========================
   LOAD CONTACTS
========================= */

async function loadContacts() {
  const {
    data: { session }
  } =
    await supabase.auth
      .getSession();

  if (!session?.user) {
    return;
  }


  const {
    data,
    error
  } =
    await supabase
      .from('contacts')
      .select(`
        id,
        contact_type,
        name,
        phone,
        instagram,
        notes,
        created_at,
        updated_at
      `)
      .order(
        'name',
        {
          ascending: true
        }
      );


  if (error) {
    console.error(
      'Contacts load error:',
      error
    );

    if (businessContacts) {
      businessContacts.innerHTML = `
        <div class="muted">
          Could not load contacts:
          ${esc(error.message)}
        </div>
      `;
    }

    if (fighterContacts) {
      fighterContacts.innerHTML = `
        <div class="muted">
          Could not load contacts.
        </div>
      `;
    }

    return;
  }


  contactsCache =
    data ?? [];


  renderContacts(
    contactSearch?.value ||
    ''
  );


  window.dispatchEvent(
    new CustomEvent(
      'hardstyle:contacts-loaded',
      {
        detail: {
          contacts:
            contactsCache
        }
      }
    )
  );
}


/* =========================
   CREATE CONTACT
========================= */

async function createContact() {
  try {

    await requireSession();


    const name =
      cName.value.trim();


    if (!name) {
      setStatus(
        'Please enter a contact name.',
        true
      );

      return;
    }


    saveContact.disabled =
      true;

    saveContact.textContent =
      'Saving...';


    setStatus(
      'Saving contact...'
    );


    const {
      data,
      error
    } =
      await supabase
        .from('contacts')
        .insert({

          contact_type:
            cType.value,

          name:
            name,

          phone:
            cPhone.value.trim() ||
            null,

          instagram:
            normalizeInstagram(
              cInstagram.value
            ),

          notes:
            cPerson.value.trim() ||
            null

        })
        .select(`
          id,
          contact_type,
          name,
          phone,
          instagram,
          notes,
          created_at,
          updated_at
        `)
        .single();


    if (error) {
      throw error;
    }


    setStatus(
      'Contact saved.'
    );


    await loadContacts();


    window.dispatchEvent(
      new CustomEvent(
        'hardstyle:data-changed',
        {
          detail: {
            type:
              'contact',

            id:
              data.id
          }
        }
      )
    );


    setTimeout(
      () => {

        contactDialog.close();

        resetContactForm();

      },
      250
    );

  } catch (error) {

    console.error(
      'Create contact error:',
      error
    );


    setStatus(
      error.message ||
      'Could not save contact.',
      true
    );

  } finally {

    saveContact.disabled =
      false;

    saveContact.textContent =
      'Add Contact';
  }
}


/* =========================
   RESET CONTACT FORM
========================= */

function resetContactForm() {

  if (cName) {
    cName.value = '';
  }

  if (cPhone) {
    cPhone.value = '';
  }

  if (cInstagram) {
    cInstagram.value = '';
  }

  if (cType) {
    cType.value =
      'business';
  }

  if (cPerson) {
    cPerson.value = '';
  }

  setStatus('');
}


/* =========================
   RELATED DATA UI
========================= */

function relatedItem(
  title,
  subtitle
) {
  return `
    <div
      style="
        background:var(--panel);
        border:
          1px solid
          var(--border);
        border-radius:10px;
        padding:10px;
      "
    >

      <strong>
        ${esc(title)}
      </strong>

      ${
        subtitle
          ? `
            <div
              class="muted"
              style="
                font-size:12px;
                margin-top:3px;
              "
            >
              ${subtitle}
            </div>
          `
          : ''
      }

    </div>
  `;
}


function relatedSection(
  title,
  htmlItems
) {
  return `
    <div
      style="
        margin-top:18px;
      "
    >

      <h4
        style="
          margin:0 0 8px;
        "
      >
        ${esc(title)}
      </h4>


      <div
        style="
          display:grid;
          gap:8px;
        "
      >

        ${
          htmlItems.length
            ? htmlItems.join('')
            : `
                <div class="muted">
                  None linked yet.
                </div>
              `
        }

      </div>

    </div>
  `;
}


/* =========================
   CONTACT DETAIL
========================= */

async function openContactDetail(
  contactId
) {

  const contact =
    contactsCache.find(
      (item) =>
        item.id ===
        contactId
    );


  if (!contact) {
    return;
  }


  contactDetailPanel.style.display =
    'block';


  contactDetailContent.innerHTML = `
    <div class="muted">
      Loading contact history...
    </div>
  `;


  const [
    jobsResult,
    designsResult,
    uploadsResult,
    fighterResult
  ] =
    await Promise.all([

      supabase
        .from('jobs')
        .select(`
          id,
          name,
          status,
          importance,
          due_date,
          created_at
        `)
        .eq(
          'contact_id',
          contactId
        )
        .order(
          'created_at',
          {
            ascending:
              false
          }
        ),


      supabase
        .from('designs')
        .select(`
          id,
          title,
          design_type,
          notes,
          created_at
        `)
        .eq(
          'contact_id',
          contactId
        )
        .order(
          'created_at',
          {
            ascending:
              false
          }
        ),


      supabase
        .from('uploads')
        .select(`
          id,
          category,
          file_name,
          file_url,
          file_type,
          created_at
        `)
        .eq(
          'contact_id',
          contactId
        )
        .order(
          'created_at',
          {
            ascending:
              false
          }
        ),


      supabase
        .from('fighters')
        .select(`
          id,
          nickname,
          notes,
          created_at
        `)
        .eq(
          'contact_id',
          contactId
        )
        .maybeSingle()

    ]);


  let fights = [];


  if (
    fighterResult.data?.id
  ) {

    const fightsResult =
      await supabase
        .from('fights')
        .select(`
          id,
          opponent,
          promotion,
          event_name,
          fight_date,
          result,
          notes,
          created_at
        `)
        .eq(
          'fighter_id',
          fighterResult.data.id
        )
        .order(
          'fight_date',
          {
            ascending:
              false
          }
        );


    if (
      fightsResult.error
    ) {

      console.error(
        'Contact fights error:',
        fightsResult.error
      );

    } else {

      fights =
        fightsResult.data ??
        [];

    }

  }


  const jobs =
    jobsResult.data ?? [];

  const designs =
    designsResult.data ?? [];

  const uploads =
    uploadsResult.data ?? [];


  contactDetailContent.innerHTML = `
    <div
      class="profile-head"
    >

      <div>

        <h3
          style="
            margin:0;
          "
        >
          ${esc(contact.name)}
        </h3>


        <div
          class="profile-meta"
        >

          <span
            class="badge"
          >
            ${
              contact.contact_type ===
              'fighter'
                ? 'Fighter'
                : 'Business'
            }
          </span>


          ${
            contact.phone
              ? `
                <span class="badge">
                  ${esc(contact.phone)}
                </span>
              `
              : ''
          }


          ${
            contact.instagram
              ? `
                <span class="badge">
                  ${esc(contact.instagram)}
                </span>
              `
              : ''
          }

        </div>


        ${
          contact.notes
            ? `
              <div
                class="muted"
                style="
                  margin-top:8px;
                "
              >
                ${esc(contact.notes)}
              </div>
            `
            : ''
        }

      </div>


      <button
        id="closeDbContactDetail"
        class="btn"
        type="button"
      >
        Close
      </button>

    </div>


    <div
      style="
        margin-top:14px;
      "
      class="muted"
    >
      Added
      ${
        esc(
          formatDate(
            contact.created_at
          )
        )
      }
    </div>


    ${
      relatedSection(
        'JOBS / ORDERS',

        jobs.map(
          (job) => {

            return relatedItem(
              job.name,

              `
                ${esc(job.status)}

                • Importance
                ${
                  job.importance ??
                  3
                }/5

                ${
                  job.due_date
                    ? `
                      • Due
                      ${
                        esc(
                          formatDate(
                            job.due_date
                          )
                        )
                      }
                    `
                    : ''
                }
              `
            );

          }
        )
      )
    }


    ${
      relatedSection(
        'FIGHTS',

        fights.map(
          (fight) => {

            return relatedItem(

              fight.opponent
                ? `vs ${fight.opponent}`
                : 'Opponent TBD',

              `
                ${
                  fight.promotion
                    ? `
                      ${esc(fight.promotion)}
                      •
                    `
                    : ''
                }

                ${
                  esc(
                    formatDate(
                      fight.fight_date
                    )
                  )
                }

                ${
                  fight.result
                    ? `
                      •
                      ${esc(fight.result)}
                    `
                    : ''
                }
              `
            );

          }
        )
      )
    }


    ${
      relatedSection(
        'DESIGNS',

        designs.map(
          (design) => {

            return relatedItem(
              design.title,

              `
                ${
                  esc(
                    design.design_type ||
                    'Design'
                  )
                }

                •

                ${
                  esc(
                    formatDate(
                      design.created_at
                    )
                  )
                }
              `
            );

          }
        )
      )
    }


    ${
      relatedSection(
        'FILES',

        uploads.map(
          (upload) => {

            return relatedItem(
              upload.file_name,

              `
                ${
                  esc(
                    upload.category
                  )
                }

                •

                ${
                  esc(
                    formatDate(
                      upload.created_at
                    )
                  )
                }
              `
            );

          }
        )
      )
    }

  `;


  document
    .getElementById(
      'closeDbContactDetail'
    )
    ?.addEventListener(
      'click',
      () => {

        contactDetailPanel
          .style
          .display =
          'none';

      }
    );


  contactDetailPanel
    .scrollIntoView({
      behavior:
        'smooth',

      block:
        'nearest'
    });
}


/* =========================
   OPEN CONTACT DIALOG
========================= */

async function openContactDialog() {

  try {

    await requireSession();

    resetContactForm();

    contactDialog.showModal();

  } catch (error) {

    alert(
      error.message
    );

  }

}


/* =========================
   EVENTS
========================= */

addContactBtn
  ?.addEventListener(
    'click',
    openContactDialog
  );


saveContact
  ?.addEventListener(
    'click',
    createContact
  );


contactSearch
  ?.addEventListener(
    'input',
    () => {

      renderContacts(
        contactSearch.value
      );

    }
  );


/* =========================
   PUBLIC REFRESH FUNCTION
========================= */

window.refreshHardstyleContacts =
  async function () {

    await loadContacts();

  };


/* =========================
   DATA CHANGE LISTENER
========================= */

window.addEventListener(
  'hardstyle:data-changed',
  async (event) => {

    if (
      event.detail?.type ===
      'contact'
    ) {

      await loadContacts();

    }

  }
);


/* =========================
   START CONTACTS
========================= */

async function startContacts() {

  const {
    data: { session }
  } =
    await supabase.auth
      .getSession();


  if (session?.user) {

    await loadContacts();

    return;
  }


  supabase.auth
    .onAuthStateChange(
      async (
        _event,
        newSession
      ) => {

        if (
          newSession?.user
        ) {

          await loadContacts();

        }


        if (
          !newSession
        ) {

          contactsCache =
            [];


          renderContacts();


          if (
            contactDetailPanel
          ) {

            contactDetailPanel
              .style
              .display =
              'none';

          }

        }

      }
    );

}


startContacts();