import { supabase } from './supabase.js';
import { refreshCalendar } from './calendar.js';


/* =========================================================
   DOM
========================================================= */

const paidJobs =
  document.getElementById('paidJobs');

const designJobs =
  document.getElementById('designJobs');

const leadJobs =
  document.getElementById('leadJobs');

const eventJobs =
  document.getElementById('eventJobs');


/* =========================================================
   STATE
========================================================= */

let jobsCache = [];
let profilesCache = [];
let contactsCache = [];

let draggedJobId = null;
let wasDragging = false;


/* =========================================================
   TEAM COLORS
========================================================= */

const ownerColors = {
  Max: '#2563eb',
  Jordan: '#16a34a',
  Connor: '#ea580c'
};


/* =========================================================
   HELPERS
========================================================= */

function esc(value) {
  return String(value ?? '').replace(
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


function formatDate(value) {
  if (!value) {
    return 'No due date';
  }

  return new Date(
    `${String(value).slice(0, 10)}T12:00:00`
  ).toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }
  );
}


function getOwnerName(ownerId) {
  const profile =
    profilesCache.find(
      item => item.id === ownerId
    );

  return (
    profile?.full_name ||
    profile?.email ||
    'Unassigned'
  );
}


function statusLabel(status) {
  const labels = {
    paid_in_work: 'Paid & In Work',
    need_design: 'Need Design',
    leads: 'Leads',
    events: 'Events',
    complete: 'Complete'
  };

  return labels[status] || status;
}


/* =========================================================
   SORT
========================================================= */

function sortJobs(jobs) {
  return [...jobs].sort(
    (a, b) => {

      const importanceA =
        Number(a.importance ?? 3);

      const importanceB =
        Number(b.importance ?? 3);


      // Importance 5 -> 1
      if (
        importanceA !==
        importanceB
      ) {
        return (
          importanceB -
          importanceA
        );
      }


      // Earliest due date
      if (
        a.due_date &&
        b.due_date
      ) {

        const comparison =
          String(a.due_date)
            .localeCompare(
              String(b.due_date)
            );

        if (comparison !== 0) {
          return comparison;
        }

      }


      if (
        a.due_date &&
        !b.due_date
      ) {
        return -1;
      }


      if (
        !a.due_date &&
        b.due_date
      ) {
        return 1;
      }


      return String(
        a.name ?? ''
      ).localeCompare(
        String(
          b.name ?? ''
        )
      );

    }
  );
}


/* =========================================================
   STYLES
========================================================= */

function injectJobsStyles() {
  if (
    document.getElementById(
      'hardstyleJobsPanelStyles'
    )
  ) {
    return;
  }


  const style =
    document.createElement('style');


  style.id =
    'hardstyleJobsPanelStyles';


  style.textContent = `

    .jobs-column {
      min-height: 180px;
      transition:
        background .15s ease,
        border-color .15s ease;
      border-radius: 10px;
      padding: 3px;
    }


    .jobs-column.drag-over {
      background:
        rgba(255,255,255,.06);

      outline:
        2px dashed
        rgba(255,255,255,.35);

      outline-offset:
        2px;
    }


    .job-board-card {
      cursor: pointer;

      user-select: none;

      transition:
        opacity .15s ease,
        transform .15s ease,
        border-color .15s ease;
    }


    .job-board-card:hover {
      border-color:
        rgba(255,255,255,.45);

      transform:
        translateY(-1px);
    }


    .job-board-card.dragging {
      opacity: .4;
    }


    .job-drag-handle {
      float: right;

      color: var(--muted);

      font-size: 16px;

      cursor: grab;

      padding-left: 8px;
    }


    .job-drag-handle:active {
      cursor: grabbing;
    }


    #editJobDialog {
      width:
        min(680px, 94vw);
    }


    .edit-job-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 16px;
    }


    .drop-column-label {
      margin-bottom: 7px;

      font-size: 10px;

      color: var(--muted);

      text-align: center;

      opacity: .7;
    }

  `;


  document.head.appendChild(
    style
  );
}


/* =========================================================
   EDIT DIALOG
========================================================= */

function createEditDialog() {
  if (
    document.getElementById(
      'editJobDialog'
    )
  ) {
    return;
  }


  const dialog =
    document.createElement(
      'dialog'
    );


  dialog.id =
    'editJobDialog';


  dialog.innerHTML = `

    <div class="dialog-inner">

      <div class="dialog-head">

        <div>
          <h3>
            Edit Job
          </h3>

          <div
            id="editJobIdDisplay"
            class="muted"
            style="
              font-size:11px;
              margin-top:4px;
            "
          ></div>
        </div>


        <button
          id="closeEditJob"
          class="btn"
          type="button"
        >
          Close
        </button>

      </div>


      <div class="form-grid">


        <!-- JOB NAME -->

        <div class="field full">

          <label>
            Job name
          </label>

          <input
            id="editJobName"
            type="text"
          >

        </div>


        <!-- CONTACT SEARCH -->

        <div class="field">

          <label>
            Customer / person
          </label>

          <input
            id="editJobContactSearch"
            type="search"
            placeholder="Search contacts..."
            autocomplete="off"
            style="
              margin-bottom:6px
            "
          >

          <select
            id="editJobContact"
          ></select>

        </div>


        <!-- OWNER -->

        <div class="field">

          <label>
            Owner
          </label>

          <select
            id="editJobOwner"
          ></select>

        </div>


        <!-- STATUS -->

        <div class="field">

          <label>
            Status
          </label>

          <select
            id="editJobStatus"
          >

            <option
              value="paid_in_work"
            >
              Paid & In Work
            </option>

            <option
              value="need_design"
            >
              Need Design
            </option>

            <option
              value="leads"
            >
              Leads
            </option>

            <option
              value="events"
            >
              Events
            </option>

            <option
              value="complete"
            >
              Complete
            </option>

          </select>

        </div>


        <!-- IMPORTANCE -->

        <div class="field">

          <label>
            Importance
          </label>

          <select
            id="editJobImportance"
          >

            <option value="5">
              5
            </option>

            <option value="4">
              4
            </option>

            <option value="3">
              3
            </option>

            <option value="2">
              2
            </option>

            <option value="1">
              1
            </option>

          </select>

        </div>


        <!-- DUE DATE -->

        <div class="field">

          <label>
            Due date
          </label>

          <input
            id="editJobDue"
            type="date"
          >

        </div>


        <!-- CALENDAR -->

        <div class="field">

          <label>
            Calendar
          </label>

          <label
            style="
              display:flex;
              flex-direction:row;
              align-items:center;
              gap:8px;
              min-height:40px;
            "
          >

            <input
              id="editJobCalendar"
              type="checkbox"
              style="
                width:auto;
              "
            >

            Show on monthly calendar

          </label>

        </div>


        <!-- NOTES -->

        <div class="field full">

          <label>
            Notes
          </label>

          <textarea
            id="editJobNotes"
            rows="5"
          ></textarea>

        </div>


        <!-- STATUS MESSAGE -->

        <div
          id="editJobMessage"
          class="muted full"
          style="
            min-height:18px;
          "
        ></div>

      </div>


      <div class="edit-job-footer">

        <button
          id="cancelEditJob"
          class="btn"
          type="button"
        >
          Cancel
        </button>


        <button
          id="saveEditJob"
          class="btn primary"
          type="button"
        >
          Save Changes
        </button>

      </div>

    </div>

  `;


  document.body.appendChild(
    dialog
  );


  document
    .getElementById(
      'closeEditJob'
    )
    ?.addEventListener(
      'click',
      () => dialog.close()
    );


  document
    .getElementById(
      'cancelEditJob'
    )
    ?.addEventListener(
      'click',
      () => dialog.close()
    );


  document
    .getElementById(
      'saveEditJob'
    )
    ?.addEventListener(
      'click',
      saveEditedJob
    );


  document
    .getElementById(
      'editJobContactSearch'
    )
    ?.addEventListener(
      'input',
      () => {

        const search =
          document
            .getElementById(
              'editJobContactSearch'
            )
            .value;

        renderEditContacts(
          search
        );

      }
    );
}


/* =========================================================
   EDIT CONTACT OPTIONS
========================================================= */

function renderEditContacts(
  search = '',
  selectedId = null
) {

  const select =
    document.getElementById(
      'editJobContact'
    );


  if (!select) {
    return;
  }


  const query =
    search
      .trim()
      .toLowerCase();


  const contacts =
    contactsCache.filter(
      contact => {

        if (!query) {
          return true;
        }


        return [

          contact.name,

          contact.contact_type,

          contact.phone,

          contact.instagram

        ].some(
          value =>
            String(value ?? '')
              .toLowerCase()
              .includes(query)
        );

      }
    );


  select.innerHTML = `

    <option value="">
      Select contact
    </option>

    ${
      contacts
        .map(
          contact => `

            <option
              value="${contact.id}"

              ${
                Number(selectedId) ===
                Number(contact.id)
                  ? 'selected'
                  : ''
              }
            >

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


/* =========================================================
   EDIT OWNER OPTIONS
========================================================= */

function renderEditOwners(
  selectedId
) {

  const select =
    document.getElementById(
      'editJobOwner'
    );


  if (!select) {
    return;
  }


  select.innerHTML = `

    <option value="">
      Select owner
    </option>

    ${
      profilesCache
        .map(
          profile => `

            <option
              value="${profile.id}"

              ${
                profile.id ===
                selectedId
                  ? 'selected'
                  : ''
              }
            >

              ${
                esc(
                  profile.full_name ||
                  profile.email ||
                  'Team Member'
                )
              }

            </option>

          `
        )
        .join('')
    }

  `;

}


/* =========================================================
   OPEN EDIT JOB
========================================================= */

function openEditJob(jobId) {
  createEditDialog();


  const job =
    jobsCache.find(
      item =>
        Number(item.id) ===
        Number(jobId)
    );


  if (!job) {
    return;
  }


  const dialog =
    document.getElementById(
      'editJobDialog'
    );


  dialog.dataset.jobId =
    job.id;


  document
    .getElementById(
      'editJobIdDisplay'
    )
    .textContent =
      `Job #${job.id}`;


  document
    .getElementById(
      'editJobName'
    )
    .value =
      job.name ?? '';


  document
    .getElementById(
      'editJobContactSearch'
    )
    .value =
      '';


  renderEditContacts(
    '',
    job.contact_id
  );


  renderEditOwners(
    job.owner_id
  );


  document
    .getElementById(
      'editJobStatus'
    )
    .value =
      job.status;


  document
    .getElementById(
      'editJobImportance'
    )
    .value =
      String(
        job.importance ?? 3
      );


  document
    .getElementById(
      'editJobDue'
    )
    .value =
      job.due_date ?? '';


  document
    .getElementById(
      'editJobNotes'
    )
    .value =
      job.notes ?? '';


  document
    .getElementById(
      'editJobCalendar'
    )
    .checked =
      job.show_on_calendar !==
      false;


  document
    .getElementById(
      'editJobMessage'
    )
    .textContent =
      '';


  dialog.showModal();
}


/* =========================================================
   SAVE EDITED JOB
========================================================= */

async function saveEditedJob() {
  const dialog =
    document.getElementById(
      'editJobDialog'
    );


  const jobId =
    Number(
      dialog.dataset.jobId
    );


  const name =
    document
      .getElementById(
        'editJobName'
      )
      .value
      .trim();


  const contactId =
    document
      .getElementById(
        'editJobContact'
      )
      .value;


  const ownerId =
    document
      .getElementById(
        'editJobOwner'
      )
      .value;


  const status =
    document
      .getElementById(
        'editJobStatus'
      )
      .value;


  const importance =
    Number(
      document
        .getElementById(
          'editJobImportance'
        )
        .value
    );


  const dueDate =
    document
      .getElementById(
        'editJobDue'
      )
      .value;


  const notes =
    document
      .getElementById(
        'editJobNotes'
      )
      .value
      .trim();


  const showOnCalendar =
    document
      .getElementById(
        'editJobCalendar'
      )
      .checked;


  const message =
    document.getElementById(
      'editJobMessage'
    );


  const saveButton =
    document.getElementById(
      'saveEditJob'
    );


  if (!name) {
    message.textContent =
      'Enter a job name.';

    return;
  }


  if (!contactId) {
    message.textContent =
      'Select a customer or person.';

    return;
  }


  if (!ownerId) {
    message.textContent =
      'Select an owner.';

    return;
  }


  if (!dueDate) {
    message.textContent =
      'Select a due date.';

    return;
  }


  saveButton.disabled =
    true;

  saveButton.textContent =
    'Saving...';

  message.textContent =
    'Saving changes...';


  const {
    error
  } =
    await supabase
      .from('jobs')
      .update({

        name,

        contact_id:
          Number(contactId),

        owner_id:
          ownerId,

        status,

        importance,

        due_date:
          dueDate,

        notes:
          notes || null,

        show_on_calendar:
          showOnCalendar,

        updated_at:
          new Date().toISOString()

      })
      .eq(
        'id',
        jobId
      );


  if (error) {

    console.error(
      'Edit job error:',
      error
    );


    message.textContent =
      error.message;


    saveButton.disabled =
      false;

    saveButton.textContent =
      'Save Changes';

    return;
  }


  message.textContent =
    'Saved!';


  await Promise.all([
    refreshJobsPanel(),
    refreshCalendar()
  ]);


  setTimeout(
    () => {

      dialog.close();

      saveButton.disabled =
        false;

      saveButton.textContent =
        'Save Changes';

    },
    250
  );
}


/* =========================================================
   JOB CARD
========================================================= */

function jobCard(job) {
  const ownerName =
    getOwnerName(
      job.owner_id
    );


  const ownerColor =
    ownerColors[
      ownerName
    ] ||
    '#64748b';


  return `

    <div
      class="
        job
        job-board-card
      "

      draggable="true"

      data-job-id="${job.id}"

      style="
        border-left:
          5px solid
          ${ownerColor};
      "
    >

      <span
        class="job-drag-handle"
        title="Drag job"
      >
        ⋮⋮
      </span>


      <strong>
        ${esc(job.name)}
      </strong>


      <div
        class="importance"
        style="
          margin-top:5px;
        "
      >

        Importance
        ${job.importance ?? 3}/5

      </div>


      <div
        class="muted"
        style="
          font-size:12px;
          margin-top:6px;
        "
      >

        ${
          esc(
            job.contacts?.name ||
            'No contact'
          )
        }

      </div>


      <div
        class="muted"
        style="
          font-size:12px;
          margin-top:3px;
        "
      >

        Assigned:
        ${esc(ownerName)}

      </div>


      <div
        class="muted"
        style="
          font-size:12px;
          margin-top:3px;
        "
      >

        Due:
        ${
          esc(
            formatDate(
              job.due_date
            )
          )
        }

      </div>


      ${
        job.notes

          ? `

              <div
                class="muted"
                style="
                  font-size:11px;
                  margin-top:7px;
                "
              >

                ${esc(job.notes)}

              </div>

            `

          : ''
      }

    </div>

  `;
}


/* =========================================================
   RENDER COLUMN
========================================================= */

function renderColumn(
  element,
  jobs,
  status
) {

  if (!element) {
    return;
  }


  element.dataset.status =
    status;


  const sorted =
    sortJobs(jobs);


  element.innerHTML = `

    <div
      class="drop-column-label"
    >
      Drag jobs here
    </div>

    ${
      sorted.length

        ? sorted
            .map(jobCard)
            .join('')

        : `

            <div class="muted">
              Nothing here yet.
            </div>

          `
    }

  `;

}


/* =========================================================
   ATTACH CARD EVENTS
========================================================= */

function attachCardEvents() {
  document
    .querySelectorAll(
      '.job-board-card'
    )
    .forEach(
      card => {


        /* CLICK TO EDIT */

        card.addEventListener(
          'click',
          () => {

            if (wasDragging) {
              return;
            }


            openEditJob(
              Number(
                card.dataset.jobId
              )
            );

          }
        );


        /* DRAG START */

        card.addEventListener(
          'dragstart',
          event => {

            wasDragging =
              true;


            draggedJobId =
              Number(
                card.dataset.jobId
              );


            card.classList.add(
              'dragging'
            );


            event.dataTransfer.effectAllowed =
              'move';


            event.dataTransfer.setData(
              'text/plain',
              String(
                draggedJobId
              )
            );

          }
        );


        /* DRAG END */

        card.addEventListener(
          'dragend',
          () => {

            card.classList.remove(
              'dragging'
            );


            document
              .querySelectorAll(
                '.jobs-column'
              )
              .forEach(
                column => {

                  column.classList.remove(
                    'drag-over'
                  );

                }
              );


            draggedJobId =
              null;


            setTimeout(
              () => {

                wasDragging =
                  false;

              },
              100
            );

          }
        );

      }
    );
}


/* =========================================================
   DRAG + DROP COLUMNS
========================================================= */

function attachDropZones() {
  const columns = [
    paidJobs,
    designJobs,
    leadJobs,
    eventJobs
  ];


  columns.forEach(
    column => {

      if (!column) {
        return;
      }


      column.addEventListener(
        'dragover',
        event => {

          event.preventDefault();

          event.dataTransfer.dropEffect =
            'move';


          column.classList.add(
            'drag-over'
          );

        }
      );


      column.addEventListener(
        'dragleave',
        event => {

          if (
            !column.contains(
              event.relatedTarget
            )
          ) {

            column.classList.remove(
              'drag-over'
            );

          }

        }
      );


      column.addEventListener(
        'drop',
        async event => {

          event.preventDefault();


          column.classList.remove(
            'drag-over'
          );


          const id =
            draggedJobId ||
            Number(
              event.dataTransfer
                .getData(
                  'text/plain'
                )
            );


          const newStatus =
            column.dataset.status;


          if (
            !id ||
            !newStatus
          ) {
            return;
          }


          await moveJobToStatus(
            id,
            newStatus
          );

        }
      );

    }
  );
}


/* =========================================================
   MOVE JOB
========================================================= */

async function moveJobToStatus(
  jobId,
  newStatus
) {

  const job =
    jobsCache.find(
      item =>
        Number(item.id) ===
        Number(jobId)
    );


  if (!job) {
    return;
  }


  if (
    job.status ===
    newStatus
  ) {
    return;
  }


  /*
    Optimistic UI:
    immediately move the card visually.
  */

  job.status =
    newStatus;


  renderJobs();


  const {
    error
  } =
    await supabase
      .from('jobs')
      .update({

        status:
          newStatus,

        updated_at:
          new Date().toISOString()

      })
      .eq(
        'id',
        jobId
      );


  if (error) {

    console.error(
      'Drag job error:',
      error
    );


    alert(
      `Could not move job: ${error.message}`
    );


    await refreshJobsPanel();

    return;
  }


  await refreshCalendar();
}


/* =========================================================
   RENDER BOARD
========================================================= */

function renderJobs() {
  const paid =
    jobsCache.filter(
      job =>
        job.status ===
        'paid_in_work'
    );


  const design =
    jobsCache.filter(
      job =>
        job.status ===
        'need_design'
    );


  const leads =
    jobsCache.filter(
      job =>
        job.status ===
        'leads'
    );


  const events =
    jobsCache.filter(
      job =>
        job.status ===
        'events'
    );


  renderColumn(
    paidJobs,
    paid,
    'paid_in_work'
  );


  renderColumn(
    designJobs,
    design,
    'need_design'
  );


  renderColumn(
    leadJobs,
    leads,
    'leads'
  );


  renderColumn(
    eventJobs,
    events,
    'events'
  );


  attachCardEvents();
}


/* =========================================================
   LOAD FROM SUPABASE
========================================================= */

export async function refreshJobsPanel() {
  const {
    data: { session }
  } =
    await supabase.auth
      .getSession();


  if (!session?.user) {
    return;
  }


  const [
    jobsResult,
    profilesResult,
    contactsResult
  ] =
    await Promise.all([


      supabase
        .from('jobs')
        .select(`
          id,
          name,
          contact_id,
          owner_id,
          status,
          importance,
          due_date,
          notes,
          show_on_calendar,
          created_at,
          updated_at,

          contacts (
            id,
            name,
            phone,
            instagram,
            contact_type
          )
        `),


      supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email
        `)
        .order(
          'full_name',
          {
            ascending: true
          }
        ),


      supabase
        .from('contacts')
        .select(`
          id,
          name,
          phone,
          instagram,
          contact_type
        `)
        .order(
          'name',
          {
            ascending: true
          }
        )

    ]);


  if (jobsResult.error) {

    console.error(
      'Jobs panel error:',
      jobsResult.error
    );

    return;
  }


  if (profilesResult.error) {

    console.error(
      'Profiles error:',
      profilesResult.error
    );

  }


  if (contactsResult.error) {

    console.error(
      'Contacts error:',
      contactsResult.error
    );

  }


  jobsCache =
    jobsResult.data ??
    [];


  profilesCache =
    profilesResult.data ??
    [];


  contactsCache =
    contactsResult.data ??
    [];


  renderJobs();
}


/* =========================================================
   GLOBAL REFRESH
========================================================= */

window.refreshHardstyleJobs =
  refreshJobsPanel;


/* =========================================================
   DATA CHANGE LISTENER
========================================================= */

window.addEventListener(
  'hardstyle:data-changed',
  async event => {

    if (
      event.detail?.type ===
      'job'
    ) {

      await refreshJobsPanel();

    }

  }
);


/* =========================================================
   START
========================================================= */

async function startJobsPanel() {
  injectJobsStyles();

  createEditDialog();

  attachDropZones();


  const {
    data: { session }
  } =
    await supabase.auth
      .getSession();


  if (session?.user) {

    await refreshJobsPanel();

  }


  supabase.auth
    .onAuthStateChange(
      (
        event,
        session
      ) => {

        if (
          event ===
            'SIGNED_IN' &&
          session?.user
        ) {

          setTimeout(
            () =>
              refreshJobsPanel(),
            0
          );

        }

      }
    );
}


startJobsPanel();