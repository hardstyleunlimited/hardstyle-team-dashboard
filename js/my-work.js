import { supabase } from './supabase.js';


/* =========================================================
   DOM
========================================================= */

const notLoggedIn =
  document.getElementById(
    'notLoggedIn'
  );

const myWorkApp =
  document.getElementById(
    'myWorkApp'
  );

const welcomeName =
  document.getElementById(
    'welcomeName'
  );

const welcomeEmail =
  document.getElementById(
    'welcomeEmail'
  );

const openJobsCount =
  document.getElementById(
    'openJobsCount'
  );

const designJobsCount =
  document.getElementById(
    'designJobsCount'
  );

const tasksCount =
  document.getElementById(
    'tasksCount'
  );

const overdueCount =
  document.getElementById(
    'overdueCount'
  );

const myJobs =
  document.getElementById(
    'myJobs'
  );

const myTasks =
  document.getElementById(
    'myTasks'
  );

const myDesignWork =
  document.getElementById(
    'myDesignWork'
  );

const myCompleted =
  document.getElementById(
    'myCompleted'
  );

const myUpcoming =
  document.getElementById(
    'myUpcoming'
  );

const refreshButton =
  document.getElementById(
    'refreshMyWork'
  );


/* =========================================================
   STATE
========================================================= */

let currentUser =
  null;

let currentProfile =
  null;

let jobsCache =
  [];

let tasksCache =
  [];


/* =========================================================
   HELPERS
========================================================= */

function esc(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[character])
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


function todayString() {
  const today =
    new Date();

  return [
    today.getFullYear(),

    String(
      today.getMonth() + 1
    ).padStart(
      2,
      '0'
    ),

    String(
      today.getDate()
    ).padStart(
      2,
      '0'
    )

  ].join('-');
}


function addDays(
  date,
  amount
) {
  const result =
    new Date(date);

  result.setDate(
    result.getDate() +
    amount
  );

  return result;
}


function isoDate(date) {
  return [
    date.getFullYear(),

    String(
      date.getMonth() + 1
    ).padStart(
      2,
      '0'
    ),

    String(
      date.getDate()
    ).padStart(
      2,
      '0'
    )

  ].join('-');
}


function isOverdue(
  dueDate,
  status
) {
  if (!dueDate) {
    return false;
  }

  if (
    status === 'complete' ||
    status === 'completed'
  ) {
    return false;
  }

  return (
    String(dueDate).slice(0, 10) <
    todayString()
  );
}


function statusLabel(status) {
  const labels = {
    paid_in_work:
      'Paid & In Work',

    need_design:
      'Need Design',

    leads:
      'Leads',

    events:
      'Events',

    complete:
      'Complete',

    completed:
      'Completed',

    open:
      'Open',

    pending:
      'Pending'
  };

  return (
    labels[status] ||
    status ||
    'Unknown'
  );
}


function sortJobs(jobs) {
  return [...jobs].sort(
    (a, b) => {

      const importanceDifference =
        Number(
          b.importance || 3
        ) -
        Number(
          a.importance || 3
        );


      if (
        importanceDifference !== 0
      ) {
        return importanceDifference;
      }


      if (
        a.due_date &&
        b.due_date
      ) {
        return String(
          a.due_date
        ).localeCompare(
          String(
            b.due_date
          )
        );
      }


      if (a.due_date) {
        return -1;
      }


      if (b.due_date) {
        return 1;
      }


      return String(
        a.name || ''
      ).localeCompare(
        String(
          b.name || ''
        )
      );
    }
  );
}


function sortTasks(tasks) {
  return [...tasks].sort(
    (a, b) => {

      if (
        a.due_date &&
        b.due_date
      ) {
        return String(
          a.due_date
        ).localeCompare(
          String(
            b.due_date
          )
        );
      }


      if (a.due_date) {
        return -1;
      }


      if (b.due_date) {
        return 1;
      }


      return String(
        a.title || ''
      ).localeCompare(
        String(
          b.title || ''
        )
      );
    }
  );
}


/* =========================================================
   AUTH + PROFILE
========================================================= */

async function loadUser() {
  const {
    data: { session },
    error
  } =
    await supabase.auth
      .getSession();


  if (
    error ||
    !session?.user
  ) {
    myWorkApp.style.display =
      'none';

    notLoggedIn.style.display =
      'block';

    return false;
  }


  currentUser =
    session.user;


  const {
    data: profile,
    error: profileError
  } =
    await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email
      `)
      .eq(
        'id',
        currentUser.id
      )
      .maybeSingle();


  if (profileError) {
    throw profileError;
  }


  if (!profile) {
    throw new Error(
      'No employee profile was found for this login.'
    );
  }


  currentProfile =
    profile;


  welcomeName.textContent =
    `${
      profile.full_name ||
      'MY'
    }'S WORK`;


  welcomeEmail.textContent =
    profile.email ||
    currentUser.email ||
    '';


  notLoggedIn.style.display =
    'none';

  myWorkApp.style.display =
    'block';


  return true;
}


/* =========================================================
   LOAD DATA
========================================================= */

async function loadMyWork() {
  if (!currentProfile) {
    return;
  }


  refreshButton.disabled =
    true;

  refreshButton.textContent =
    'Refreshing...';


  const [
    jobsResult,
    tasksResult
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
        `)
        .eq(
          'owner_id',
          currentProfile.id
        ),


      supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          assigned_to,
          due_date,
          status,
          created_at,
          updated_at,

          jobs (
            id,
            name,
            contact_id
          )
        `)
        .eq(
          'assigned_to',
          currentProfile.id
        )

    ]);


  if (jobsResult.error) {
    console.error(
      'My Work jobs error:',
      jobsResult.error
    );

    myJobs.innerHTML =
      errorBox(
        jobsResult.error.message
      );
  } else {
    jobsCache =
      jobsResult.data ??
      [];
  }


  if (tasksResult.error) {
    console.error(
      'My Work tasks error:',
      tasksResult.error
    );

    myTasks.innerHTML =
      errorBox(
        tasksResult.error.message
      );
  } else {
    tasksCache =
      tasksResult.data ??
      [];
  }


  renderEverything();


  refreshButton.disabled =
    false;

  refreshButton.textContent =
    'Refresh';
}


/* =========================================================
   COUNTERS
========================================================= */

function renderCounters() {
  const openJobs =
    jobsCache.filter(
      job =>
        job.status !==
        'complete'
    );


  const designJobs =
    openJobs.filter(
      job =>
        job.status ===
        'need_design'
    );


  const openTasks =
    tasksCache.filter(
      task =>
        task.status !==
          'complete' &&
        task.status !==
          'completed'
    );


  const overdueJobs =
    openJobs.filter(
      job =>
        isOverdue(
          job.due_date,
          job.status
        )
    );


  const overdueTasks =
    openTasks.filter(
      task =>
        isOverdue(
          task.due_date,
          task.status
        )
    );


  openJobsCount.textContent =
    String(
      openJobs.length
    );


  designJobsCount.textContent =
    String(
      designJobs.length
    );


  tasksCount.textContent =
    String(
      openTasks.length
    );


  overdueCount.textContent =
    String(
      overdueJobs.length +
      overdueTasks.length
    );
}


/* =========================================================
   JOB CARDS
========================================================= */

function jobCard(job) {
  const overdue =
    isOverdue(
      job.due_date,
      job.status
    );


  return `

    <div
      class="
        item
        clickable
      "
      data-job-id="${job.id}"
    >

      <div class="item-top">

        <div class="item-title">
          ${esc(job.name)}
        </div>


        <div class="importance">
          ${
            job.importance || 3
          }/5
        </div>

      </div>


      <div class="item-meta">

        <span class="badge">
          ${esc(
            statusLabel(
              job.status
            )
          )}
        </span>


        ${
          overdue
            ? `
                <span
                  class="
                    badge
                    overdue
                  "
                >
                  OVERDUE
                </span>
              `
            : ''
        }


        ${
          job.status ===
            'need_design'
            ? `
                <span
                  class="
                    badge
                    design
                  "
                >
                  DESIGN
                </span>
              `
            : ''
        }

      </div>


      <div class="details">

        ${
          esc(
            job.contacts?.name ||
            'No contact'
          )
        }

        <br>

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
              <div class="details">
                ${esc(job.notes)}
              </div>
            `
          : ''
      }


      <div class="item-actions">

        <a
          class="small-btn"
          href="./index.html?job=${job.id}"
        >
          Open Job
        </a>


        <a
          class="small-btn"
          href="./designs.html?job=${job.id}"
        >
          Design Work
        </a>

      </div>

    </div>

  `;
}


/* =========================================================
   TASK CARD
========================================================= */

function taskCard(task) {
  const overdue =
    isOverdue(
      task.due_date,
      task.status
    );


  return `

    <div class="item">

      <div class="item-top">

        <div class="item-title">
          ${esc(task.title)}
        </div>

      </div>


      <div class="item-meta">

        <span class="badge">
          ${esc(
            statusLabel(
              task.status
            )
          )}
        </span>


        ${
          overdue
            ? `
                <span
                  class="
                    badge
                    overdue
                  "
                >
                  OVERDUE
                </span>
              `
            : ''
        }

      </div>


      <div class="details">

        Due:
        ${
          esc(
            formatDate(
              task.due_date
            )
          )
        }

        ${
          task.jobs?.name
            ? `
                <br>
                Job:
                ${
                  esc(
                    task.jobs.name
                  )
                }
              `
            : ''
        }

      </div>


      ${
        task.description
          ? `
              <div class="details">
                ${
                  esc(
                    task.description
                  )
                }
              </div>
            `
          : ''
      }


      ${
        task.jobs?.id
          ? `
              <div class="item-actions">

                <a
                  class="small-btn"
                  href="./index.html?job=${task.jobs.id}"
                >
                  Open Job
                </a>

              </div>
            `
          : ''
      }

    </div>

  `;
}


/* =========================================================
   JOBS
========================================================= */

function renderJobs() {
  const openJobs =
    sortJobs(
      jobsCache.filter(
        job =>
          job.status !==
          'complete'
      )
    );


  if (!openJobs.length) {
    myJobs.innerHTML = `
      <div class="empty">
        No open jobs assigned to you.
      </div>
    `;

    return;
  }


  myJobs.innerHTML =
    openJobs
      .map(jobCard)
      .join('');
}


/* =========================================================
   TASKS
========================================================= */

function renderTasks() {
  const tasks =
    sortTasks(
      tasksCache.filter(
        task =>
          task.status !==
            'complete' &&
          task.status !==
            'completed'
      )
    );


  if (!tasks.length) {
    myTasks.innerHTML = `
      <div class="empty">
        No open tasks assigned to you.
      </div>
    `;

    return;
  }


  myTasks.innerHTML =
    tasks
      .map(taskCard)
      .join('');
}


/* =========================================================
   DESIGN WORK
========================================================= */

function renderDesignWork() {
  const designJobs =
    sortJobs(
      jobsCache.filter(
        job =>
          job.status ===
          'need_design'
      )
    );


  if (!designJobs.length) {
    myDesignWork.innerHTML = `
      <div class="empty">
        No design work waiting on you.
      </div>
    `;

    return;
  }


  myDesignWork.innerHTML =
    designJobs
      .map(
        job => `

          <div class="item">

            <div class="item-title">
              ${esc(job.name)}
            </div>


            <div class="item-meta">

              <span
                class="
                  badge
                  design
                "
              >
                NEED DESIGN
              </span>

              ${
                isOverdue(
                  job.due_date,
                  job.status
                )
                  ? `
                      <span
                        class="
                          badge
                          overdue
                        "
                      >
                        OVERDUE
                      </span>
                    `
                  : ''
              }

            </div>


            <div class="details">

              ${
                esc(
                  job.contacts?.name ||
                  'No contact'
                )
              }

              <br>

              Due:
              ${
                esc(
                  formatDate(
                    job.due_date
                  )
                )
              }

            </div>


            <div class="item-actions">

              <a
                href="./designs.html?job=${job.id}"
                class="small-btn"
              >
                Open Design Work →
              </a>

            </div>

          </div>

        `
      )
      .join('');
}


/* =========================================================
   COMPLETED
========================================================= */

function renderCompleted() {
  const completedJobs =
    jobsCache
      .filter(
        job =>
          job.status ===
          'complete'
      )
      .sort(
        (a, b) =>
          String(
            b.updated_at || ''
          ).localeCompare(
            String(
              a.updated_at || ''
            )
          )
      )
      .slice(
        0,
        5
      );


  const completedTasks =
    tasksCache
      .filter(
        task =>
          task.status ===
            'complete' ||
          task.status ===
            'completed'
      )
      .sort(
        (a, b) =>
          String(
            b.updated_at || ''
          ).localeCompare(
            String(
              a.updated_at || ''
            )
          )
      )
      .slice(
        0,
        5
      );


  const items = [
    ...completedJobs.map(
      job => ({
        type: 'JOB',
        title: job.name,
        date: job.updated_at
      })
    ),

    ...completedTasks.map(
      task => ({
        type: 'TASK',
        title: task.title,
        date: task.updated_at
      })
    )
  ]
    .sort(
      (a, b) =>
        String(
          b.date || ''
        ).localeCompare(
          String(
            a.date || ''
          )
        )
    )
    .slice(
      0,
      8
    );


  if (!items.length) {
    myCompleted.innerHTML = `
      <div class="empty">
        No recently completed work.
      </div>
    `;

    return;
  }


  myCompleted.innerHTML =
    items
      .map(
        item => `

          <div class="item">

            <div class="item-title">
              ${esc(item.title)}
            </div>


            <div class="item-meta">

              <span class="badge">
                ${item.type}
              </span>

            </div>

          </div>

        `
      )
      .join('');
}


/* =========================================================
   UPCOMING
========================================================= */

function renderUpcoming() {
  const today =
    new Date();

  const startDate =
    isoDate(today);

  const endDate =
    isoDate(
      addDays(
        today,
        30
      )
    );


  const upcomingJobs =
    jobsCache
      .filter(
        job =>
          job.due_date &&
          String(
            job.due_date
          ).slice(
            0,
            10
          ) >= startDate &&
          String(
            job.due_date
          ).slice(
            0,
            10
          ) <= endDate &&
          job.status !==
            'complete'
      )
      .map(
        job => ({
          type: 'JOB',
          title: job.name,
          date: String(
            job.due_date
          ).slice(
            0,
            10
          ),
          jobId: job.id
        })
      );


  const upcomingTasks =
    tasksCache
      .filter(
        task =>
          task.due_date &&
          String(
            task.due_date
          ).slice(
            0,
            10
          ) >= startDate &&
          String(
            task.due_date
          ).slice(
            0,
            10
          ) <= endDate &&
          task.status !==
            'complete' &&
          task.status !==
            'completed'
      )
      .map(
        task => ({
          type: 'TASK',
          title: task.title,
          date: String(
            task.due_date
          ).slice(
            0,
            10
          ),
          jobId:
            task.jobs?.id ||
            null
        })
      );


  const items = [
    ...upcomingJobs,
    ...upcomingTasks
  ].sort(
    (a, b) =>
      a.date.localeCompare(
        b.date
      )
  );


  if (!items.length) {
    myUpcoming.innerHTML = `
      <div class="empty">
        Nothing due in the next 30 days.
      </div>
    `;

    return;
  }


  let html =
    '';

  let previousDate =
    null;


  for (
    const item
    of items
  ) {

    if (
      item.date !==
      previousDate
    ) {

      html += `

        <div class="timeline-date">

          ${
            esc(
              formatDate(
                item.date
              )
            )
          }

        </div>

      `;


      previousDate =
        item.date;

    }


    html += `

      <div class="item">

        <div class="item-top">

          <div class="item-title">
            ${esc(item.title)}
          </div>


          <span class="badge">
            ${item.type}
          </span>

        </div>


        ${
          item.jobId
            ? `
                <div class="item-actions">

                  <a
                    href="./index.html?job=${item.jobId}"
                    class="small-btn"
                  >
                    Open
                  </a>

                </div>
              `
            : ''
        }

      </div>

    `;

  }


  myUpcoming.innerHTML =
    html;
}


/* =========================================================
   RENDER EVERYTHING
========================================================= */

function renderEverything() {
  renderCounters();

  renderJobs();

  renderTasks();

  renderDesignWork();

  renderCompleted();

  renderUpcoming();
}


/* =========================================================
   ERROR BOX
========================================================= */

function errorBox(message) {
  return `

    <div class="empty">

      Could not load this section.

      <br><br>

      ${esc(message)}

    </div>

  `;
}


/* =========================================================
   REFRESH BUTTON
========================================================= */

refreshButton.addEventListener(
  'click',
  async () => {
    await loadMyWork();
  }
);


/* =========================================================
   START
========================================================= */

async function start() {
  try {

    const authorized =
      await loadUser();


    if (!authorized) {
      return;
    }


    await loadMyWork();


  } catch (error) {

    console.error(
      'My Work startup error:',
      error
    );


    myWorkApp.style.display =
      'block';


    myJobs.innerHTML =
      errorBox(
        error.message
      );

  }
}


start();