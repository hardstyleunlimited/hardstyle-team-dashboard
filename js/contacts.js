import { supabase } from './supabase.js';

const addContactBtn =
  document.getElementById(
    'addContactBtn'
  );

const contactDialog =
  document.getElementById(
    'contactDialog'
  );

const saveContact =
  document.getElementById(
    'saveContact'
  );

const cName =
  document.getElementById(
    'cName'
  );

const cPhone =
  document.getElementById(
    'cPhone'
  );

const cInstagram =
  document.getElementById(
    'cInstagram'
  );

const cType =
  document.getElementById(
    'cType'
  );

const cPerson =
  document.getElementById(
    'cPerson'
  );

const contactFormStatus =
  document.getElementById(
    'contactFormStatus'
  );

const contactSearch =
  document.getElementById(
    'contactSearch'
  );

const globalSearch =
  document.getElementById(
    'globalSearch'
  );

const businessContacts =
  document.getElementById(
    'businessContacts'
  );

const fighterContacts =
  document.getElementById(
    'fighterContacts'
  );

const contactDetailPanel =
  document.getElementById(
    'contactDetailPanel'
  );

const contactDetailContent =
  document.getElementById(
    'contactDetailContent'
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


function renderContacts(
  search = ''
) {
  const query =
    search
      .trim()
      .toLowerCase();


  const filtered =
    contacts.filter(
      contact => {

        if (!query) {
          return true;
        }

        return [
          contact.name,
          contact.phone,
          contact.instagram,
          contact.notes,
          contact.contact_type
        ].some(
          value =>
            String(
              value ?? ''
            )
              .toLowerCase()
              .includes(query)
        );

      }
    );


  const businesses =
    filtered.filter(
      contact =>
        contact.contact_type ===
        'business'
    );


  const fighters =
    filtered.filter(
      contact =>
        contact.contact_type ===
        'fighter'
    );


  businessContacts.innerHTML =
    businesses.length

      ? businesses
          .map(
            contact =>
              contactHTML(contact)
          )
          .join('')

      : `
          <div class="muted">
            No matching businesses.
          </div>
        `;


  fighterContacts.innerHTML =
    fighters.length

      ? fighters
          .map(
            contact =>
              contactHTML(contact)
          )
          .join('')

      : `
          <div class="muted">
            No matching fighters.
          </div>
        `;


  document
    .querySelectorAll(
      '.contact-open'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            openContact(
              Number(
                button.dataset.id
              )
            );

          }
        );

      }
    );
}


function contactHTML(
  contact
) {
  return `
    <div class="contact">

      <button
        type="button"
        class="contact-open"

        data-id="${
          contact.id
        }"

        style="
          color:var(--text);
          background:none;
          border:0;
          padding:0;
          font-weight:700;
          text-decoration:underline;
          text-underline-offset:3px;
        "
      >
        ${esc(contact.name)}
      </button>

      <div
        class="muted"
        style="font-size:12px;margin-top:4px"
      >

        ${
          contact.phone
            ? esc(contact.phone)
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
            ? esc(contact.instagram)
            : ''
        }

      </div>

    </div>
  `;
}


export async function refreshContacts() {
  const {
    data: { session }
  } = await supabase.auth
    .getSession();


  if (!session?.user) {
    return;
  }


  const {
    data,
    error
  } = await supabase
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
      'Contact load error:',
      error
    );

    return;
  }


  contacts =
    data ?? [];


  renderContacts(
    contactSearch?.value ||
    ''
  );
}


window.refreshHardstyleContacts =
  refreshContacts;


contactSearch
  ?.addEventListener(
    'input',
    () => {

      renderContacts(
        contactSearch.value
      );

    }
  );


// BIG SEARCH BAR
globalSearch
  ?.addEventListener(
    'input',
    () => {

      const query =
        globalSearch.value;


      if (contactSearch) {
        contactSearch.value =
          query;
      }


      renderContacts(
        query
      );


      if (
        query.trim().length >= 2
      ) {

        document
          .getElementById(
            'contacts'
          )
          ?.scrollIntoView({
            behavior:
              'smooth',

            block:
              'start'
          });

      }

    }
  );


addContactBtn
  ?.addEventListener(
    'click',
    () => {

      contactDialog.showModal();

    }
  );


saveContact
  ?.addEventListener(
    'click',
    async () => {

      try {

        const name =
          cName.value.trim();


        if (!name) {
          throw new Error(
            'Enter a contact name.'
          );
        }


        saveContact.disabled =
          true;

        saveContact.textContent =
          'Saving...';


        const {
          data,
          error
        } = await supabase
          .from('contacts')
          .insert({

            contact_type:
              cType.value,

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
          .select()
          .single();


        if (error) {
          throw error;
        }


        // If this contact is a fighter,
        // automatically create fighter profile.
        if (
          cType.value ===
          'fighter'
        ) {

          const {
            error:
              fighterError
          } = await supabase
            .from('fighters')
            .insert({

              contact_id:
                data.id,

              nickname:
                cPerson.value.trim() ||
                null

            });


          if (
            fighterError &&
            !String(
              fighterError.message
            ).includes(
              'duplicate'
            )
          ) {

            console.error(
              'Fighter profile error:',
              fighterError
            );

          }

        }


        await refreshContacts();


        if (
          contactFormStatus
        ) {
          contactFormStatus.textContent =
            'Contact saved!';
        }


        setTimeout(
          () => {

            contactDialog.close();

            cName.value = '';
            cPhone.value = '';
            cInstagram.value = '';
            cPerson.value = '';
            cType.value =
              'business';

          },
          250
        );


      } catch (error) {

        console.error(
          'Contact save error:',
          error
        );


        if (
          contactFormStatus
        ) {
          contactFormStatus.textContent =
            error.message;

          contactFormStatus.style.color =
            '#ff8b8b';
        }


      } finally {

        saveContact.disabled =
          false;

        saveContact.textContent =
          'Add Contact';

      }

    }
  );


async function openContact(
  contactId
) {
  const contact =
    contacts.find(
      item =>
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
      Loading...
    </div>
  `;


  const [
    jobsResult,
    designsResult,
    fighterResult
  ] = await Promise.all([

    supabase
      .from('jobs')
      .select(`
        id,
        name,
        status,
        importance,
        due_date
      `)
      .eq(
        'contact_id',
        contactId
      ),


    supabase
      .from('designs')
      .select(`
        id,
        title,
        design_type,
        created_at
      `)
      .eq(
        'contact_id',
        contactId
      ),


    supabase
      .from('fighters')
      .select(`
        id,
        nickname
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

    const result =
      await supabase
        .from('fights')
        .select(`
          id,
          opponent,
          promotion,
          fight_date,
          result
        `)
        .eq(
          'fighter_id',
          fighterResult.data.id
        )
        .order(
          'fight_date',
          {
            ascending: false
          }
        );


    fights =
      result.data ?? [];

  }


  contactDetailContent.innerHTML = `
    <div class="profile-head">

      <div>

        <h3>
          ${esc(contact.name)}
        </h3>

        <span class="badge">
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


      <button
        id="closeContactDetails"
        class="btn"
      >
        Close
      </button>

    </div>


    ${
      contact.notes
        ? `
          <p>
            ${esc(contact.notes)}
          </p>
        `
        : ''
    }


    <h4>
      Jobs / Orders
    </h4>

    ${
      jobsResult.data?.length

        ? jobsResult.data
            .map(
              job => `
                <div class="card">

                  <strong>
                    ${esc(job.name)}
                  </strong>

                  <div class="muted">
                    ${esc(job.status)}
                    •
                    Importance
                    ${job.importance}/5
                  </div>

                </div>
              `
            )
            .join('')

        : `
            <div class="muted">
              No jobs yet.
            </div>
          `
    }


    ${
      contact.contact_type ===
      'fighter'

        ? `
            <h4 style="margin-top:16px">
              Fights
            </h4>

            ${
              fights.length

                ? fights
                    .map(
                      fight => `
                        <div class="card">

                          <strong>
                            vs
                            ${
                              esc(
                                fight.opponent ||
                                'TBD'
                              )
                            }
                          </strong>

                          <div class="muted">
                            ${
                              esc(
                                fight.promotion ||
                                ''
                              )
                            }
                            •
                            ${
                              esc(
                                fight.fight_date
                              )
                            }
                          </div>

                        </div>
                      `
                    )
                    .join('')

                : `
                    <div class="muted">
                      No fights yet.
                    </div>
                  `
            }
          `

        : ''
    }


    <h4 style="margin-top:16px">
      Designs
    </h4>

    ${
      designsResult.data?.length

        ? designsResult.data
            .map(
              design => `
                <div class="card">

                  <strong>
                    ${esc(design.title)}
                  </strong>

                  <div class="muted">
                    ${
                      esc(
                        design.design_type ||
                        'Design'
                      )
                    }
                  </div>

                </div>
              `
            )
            .join('')

        : `
            <div class="muted">
              No designs yet.
            </div>
          `
    }
  `;


  document
    .getElementById(
      'closeContactDetails'
    )
    ?.addEventListener(
      'click',
      () => {

        contactDetailPanel.style.display =
          'none';

      }
    );
}


async function startContacts() {
  const {
    data: { session }
  } = await supabase.auth
    .getSession();


  if (session?.user) {
    await refreshContacts();
  }


  supabase.auth
    .onAuthStateChange(
      (
        event,
        session
      ) => {

        if (
          event === 'SIGNED_IN' &&
          session?.user
        ) {

          setTimeout(
            () =>
              refreshContacts(),
            0
          );

        }

      }
    );
}


startContacts();