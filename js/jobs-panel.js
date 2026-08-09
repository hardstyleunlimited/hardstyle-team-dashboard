import { supabase } from './supabase.js';

const paidJobs =
  document.getElementById('paidJobs');

const designJobs =
  document.getElementById('designJobs');

const leadJobs =
  document.getElementById('leadJobs');

const eventJobs =
  document.getElementById('eventJobs');


const ownerColors = {
  Max: '#2563eb',
  Jordan: '#16a34a',
  Connor: '#ea580c'
};


/* =========================
   HELPERS
========================= */

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


/* =========================
   SORTING
========================= */

function sortJobs(jobs) {
  return [...jobs].sort(
    (a, b) => {

      const importanceA =
        Number(a.importance ?? 3);

      const importanceB =
        Number(b.importance ?? 3);


      // Higher importance first
      if (
        importanceA !==
        importanceB
      ) {
        return (
          importanceB -
          importanceA
        );
      }


      // Earlier due date next
      if (
        a.due_date &&
        b.due_date
      ) {

        const dateCompare =
          String(a.due_date)
            .localeCompare(
              String(b.due_date)
            );

        if (dateCompare !== 0) {
          return dateCompare;
        }

      }


      // Jobs with a date before
      // jobs without a date
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


      // Final fallback
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


  const sortedJobs =
    sortJobs(jobs);


  if (!sortedJobs.length) {

    element.innerHTML = `
      <div class="muted">
        Nothing here yet.
      </div>
    `;

    return;
  }


  element.innerHTML =
    sortedJobs
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
   LOAD JOBS
========================= */

export async function refreshJobsPanel() {

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


  if (jobsResult.error) {

    console.error(
      'Jobs panel error:',
      jobsResult.error
    );


    const message = `
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


    if (paidJobs) {
      paidJobs.innerHTML =
        message;
    }

    if (designJobs) {
      designJobs.innerHTML =
        message;
    }

    if (leadJobs) {
      leadJobs.innerHTML =
        message;
    }

    if (eventJobs) {
      eventJobs.innerHTML =
        message;
    }

    return;
  }


  if (profilesResult.error) {

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
   GLOBAL REFRESH FUNCTION
========================= */

window.refreshHardstyleJobs =
  refreshJobsPanel;


/* =========================
   AUTO REFRESH EVENT
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