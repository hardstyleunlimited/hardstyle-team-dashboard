import { supabase } from './supabase.js';


const paidJobs =
  document.getElementById(
    'paidJobs'
  );

const designJobs =
  document.getElementById(
    'designJobs'
  );

const leadJobs =
  document.getElementById(
    'leadJobs'
  );


const ownerColors = {
  Max: '#2563eb',
  Jordan: '#16a34a',
  Connor: '#ea580c'
};


let eventJobs = null;


/* =========================
   HELPERS
========================= */

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


function formatDate(value) {

  if (!value) {
    return 'No due date';
  }


  return new Date(
    `${value}T12:00:00`
  ).toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric'
    }
  );

}


/* =========================
   CREATE EVENTS COLUMN
========================= */

function ensureEventsColumn() {

  if (
    document.getElementById(
      'eventJobs'
    )
  ) {

    eventJobs =
      document.getElementById(
        'eventJobs'
      );

    return;
  }


  const leadCard =
    leadJobs?.closest(
      '.card'
    );


  const jobsGrid =
    leadCard?.parentElement;


  if (!jobsGrid) {
    return;
  }


  jobsGrid.classList.add(
    'jobs-board-grid'
  );


  const eventCard =
    document.createElement(
      'div'
    );


  eventCard.className =
    'card';


  eventCard.innerHTML = `
    <h3>
      EVENTS
    </h3>

    <div
      id="eventJobs"
      class="jobs-column"
    ></div>
  `;


  jobsGrid.appendChild(
    eventCard
  );


  eventJobs =
    document.getElementById(
      'eventJobs'
    );


  // Inject responsive 4-column layout.
  if (
    !document.getElementById(
      'jobsBoardStyles'
    )
  ) {

    const style =
      document.createElement(
        'style'
      );


    style.id =
      'jobsBoardStyles';


    style.textContent = `

      .jobs-board-grid {
        grid-template-columns:
          repeat(
            4,
            minmax(0, 1fr)
          ) !important;
      }


      @media (
        max-width: 1000px
      ) {

        .jobs-board-grid {
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            ) !important;
        }

      }


      @media (
        max-width: 650px
      ) {

        .jobs-board-grid {
          grid-template-columns:
            1fr !important;
        }

      }

    `;


    document.head.appendChild(
      style
    );

  }

}


/* =========================
   ADD EVENTS TO JOB FORM
========================= */

function ensureEventStatusOption() {

  const statusSelect =
    document.getElementById(
      'jStatus'
    );


  if (!statusSelect) {
    return;
  }


  const alreadyExists =
    [
      ...statusSelect.options
    ].some(
      option =>
        option.value ===
        'events'
    );


  if (alreadyExists) {
    return;
  }


  const option =
    document.createElement(
      'option'
    );


  option.value =
    'events';


  option.textContent =
    'Events';


  const completeOption =
    [
      ...statusSelect.options
    ].find(
      item =>
        item.value ===
        'complete'
    );


  if (completeOption) {

    statusSelect.insertBefore(
      option,
      completeOption
    );

  } else {

    statusSelect.appendChild(
      option
    );

  }

}


/* =========================
   SORT JOBS
========================= */

function sortJobs(
  jobs
) {

  return jobs.sort(
    (a, b) => {

      // Importance first:
      // 5 → 1

      const importanceA =
        Number(
          a.importance ?? 3
        );


      const importanceB =
        Number(
          b.importance ?? 3
        );


      if (
        importanceA !==
        importanceB
      ) {

        return (
          importanceB -
          importanceA
        );

      }


      // Then nearest due date.

      if (
        a.due_date &&
        b.due_date
      ) {

        const dateCompare =
          a.due_date.localeCompare(
            b.due_date
          );


        if (
          dateCompare !== 0
        ) {

          return dateCompare;

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


      // Finally alphabetically.

      return String(
        a.name
      ).localeCompare(
        String(
          b.name
        )
      );

    }
  );

}


/* =========================
   JOB CARD
========================= */

function jobCard(
  job,
  ownerName
) {

  const ownerColor =
    ownerColors[
      ownerName
    ] ||
    '#64748b';


  return `
    <div
      class="job"
      style="
        border-left:
          5px solid
          ${ownerColor};
      "
    >

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
          margin-top:5px;
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


/* =========================
   RENDER COLUMN
========================= */

function renderColumn(
  element,
  jobs,
  profiles
) {

  if (!element) {
    return;
  }


  const sorted =
    sortJobs(
      [...jobs]
    );


  if (
    !sorted.length
  ) {

    element.innerHTML = `
      <div class="muted">
        Nothing here yet.
      </div>
    `;

    return;
  }


  element.innerHTML =
    sorted
      .map(
        job => {

          const ownerName =
            profiles.get(
              job.owner_id
            ) ||
            'Unassigned';


          return jobCard(
            job,
            ownerName
          );

        }
      )
      .join('');

}


/* =========================
   LOAD JOBS FROM SUPABASE
========================= */

export async function refreshJobsPanel() {

  ensureEventsColumn();

  ensureEventStatusOption();


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
    profilesResult
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
          created_at,

          contacts (
            id,
            name
          )
        `),


      supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email
        `)

    ]);


  if (
    jobsResult.error
  ) {

    console.error(
      'Jobs panel error:',
      jobsResult.error
    );


    if (paidJobs) {

      paidJobs.innerHTML = `
        <div class="muted">
          Could not load jobs:
          ${
            esc(
              jobsResult
                .error
                .message
            )
          }
        </div>
      `;

    }


    return;

  }


  if (
    profilesResult.error
  ) {

    console.error(
      'Profile load error:',
      profilesResult.error
    );

  }


  const profiles =
    new Map(
      (
        profilesResult.data ??
        []
      ).map(
        profile => [

          profile.id,

          profile.full_name ||
          profile.email ||
          'Team Member'

        ]
      )
    );


  const jobs =
    jobsResult.data ??
    [];


  const paid =
    jobs.filter(
      job =>
        job.status ===
        'paid_in_work'
    );


  const design =
    jobs.filter(
      job =>
        job.status ===
        'need_design'
    );


  const leads =
    jobs.filter(
      job =>
        job.status ===
        'leads'
    );


  const events =
    jobs.filter(
      job =>
        job.status ===
        'events'
    );


  renderColumn(
    paidJobs,
    paid,
    profiles
  );


  renderColumn(
    designJobs,
    design,
    profiles
  );


  renderColumn(
    leadJobs,
    leads,
    profiles
  );


  renderColumn(
    eventJobs,
    events,
    profiles
  );

}


/* =========================
   GLOBAL REFRESH
========================= */

window.refreshHardstyleJobs =
  refreshJobsPanel;


/* =========================
   START
========================= */

async function startJobsPanel() {

  ensureEventsColumn();

  ensureEventStatusOption();


  const {
    data: { session }
  } =
    await supabase.auth
      .getSession();


  if (
    session?.user
  ) {

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