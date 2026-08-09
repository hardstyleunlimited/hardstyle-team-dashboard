import { supabase } from './supabase.js';


/* =========================
   FIX JOB BOARD STRUCTURE
========================= */

function fixJobsBoardStructure() {

  // Find EVERY leadJobs element,
  // even if the HTML accidentally
  // contains duplicate IDs.
  const leadColumns =
    document.querySelectorAll(
      '[id="leadJobs"]'
    );


  // If there are two LEADS columns,
  // turn the second one into EVENTS.
  if (leadColumns.length > 1) {

    const secondLead =
      leadColumns[1];

    secondLead.id =
      'eventJobs';


    const container =
      secondLead.closest(
        '.card, .col'
      );


    if (container) {

      const heading =
        container.querySelector(
          'h3, b'
        );


      if (heading) {
        heading.textContent =
          'EVENTS';
      }

    }

  }


  // If eventJobs already exists,
  // make absolutely sure its
  // heading says EVENTS.
  const eventElement =
    document.getElementById(
      'eventJobs'
    );


  if (eventElement) {

    const container =
      eventElement.closest(
        '.card, .col'
      );


    if (container) {

      const heading =
        container.querySelector(
          'h3, b'
        );


      if (heading) {
        heading.textContent =
          'EVENTS';
      }

    }

  }

}


/* Run immediately */
fixJobsBoardStructure();


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

const eventJobs =
  document.getElementById(
    'eventJobs'
  );


const ownerColors = {
  Max: '#2563eb',
  Jordan: '#16a34a',
  Connor: '#ea580c'
};


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


/* =========================
   SORT JOBS
========================= */

function sortJobs(jobs) {

  return [...jobs].sort(
    (a, b) => {

      const importanceA =
        Number(
          a.importance ?? 3
        );

      const importanceB =
        Number(
          b.importance ?? 3
        );


      // Importance 5 → 1
      if (
        importanceA !==
        importanceB
      ) {

        return (
          importanceB -
          importanceA
        );

      }


      // Earliest due date next
      if (
        a.due_date &&
        b.due_date
      ) {

        const dateCompare =
          String(
            a.due_date
          ).localeCompare(
            String(
              b.due_date
            )
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
      data-job-id="${job.id}"

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
    sortJobs(jobs);


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
   REFRESH JOB BOARD
========================= */

export async function refreshJobsPanel() {

  // Repair board again in case
  // anything changed in the DOM.
  fixJobsBoardStructure();


  const {
    data: { session },
    error: sessionError
  } =
    await supabase.auth
      .getSession();


  if (sessionError) {

    console.error(
      'Jobs session error:',
      sessionError
    );

    return;

  }


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
          show_on_calendar,
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

    return;

  }


  if (
    profilesResult.error
  ) {

    console.error(
      'Profiles error:',
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


  /* =========================
     SPLIT BY STATUS
  ========================= */

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


  /* =========================
     RENDER
  ========================= */

  renderColumn(
    document.getElementById(
      'paidJobs'
    ),
    paid,
    profiles
  );


  renderColumn(
    document.getElementById(
      'designJobs'
    ),
    design,
    profiles
  );


  renderColumn(
    document.getElementById(
      'leadJobs'
    ),
    leads,
    profiles
  );


  renderColumn(
    document.getElementById(
      'eventJobs'
    ),
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
   DATA CHANGE LISTENER
========================= */

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


/* =========================
   START
========================= */

async function startJobsPanel() {

  fixJobsBoardStructure();


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
          event === 'SIGNED_IN' &&
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