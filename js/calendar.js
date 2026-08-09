import { supabase } from './supabase.js';


/* =========================================================
   DOM
========================================================= */

const calendarEl =
  document.getElementById('calendar');

const detailPanel =
  document.getElementById(
    'calendarDetailPanel'
  );

const detailContent =
  document.getElementById(
    'calendarDetailContent'
  );


/* =========================================================
   TEAM COLORS
========================================================= */

const ownerColors = {
  Max: '#2563eb',
  Jordan: '#16a34a',
  Connor: '#ea580c'
};

const FIGHT_COLOR =
  '#a855f7';


/* =========================================================
   STATE
========================================================= */

let calendarRecords = [];

const today =
  new Date();

today.setHours(
  12,
  0,
  0,
  0
);


// First month available
const firstMonth =
  new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  );


// Last month available:
// current month + next 12 months
const lastMonth =
  new Date(
    today.getFullYear(),
    today.getMonth() + 12,
    1
  );


let visibleMonth =
  new Date(firstMonth);


/* =========================================================
   HELPERS
========================================================= */

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


function formatDate(value) {

  if (!value) {
    return 'No date';
  }


  return new Date(
    `${String(value).slice(0, 10)}T12:00:00`
  ).toLocaleDateString(
    'en-US',
    {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }
  );

}


function monthTitle(date) {

  return date.toLocaleDateString(
    'en-US',
    {
      month: 'long',
      year: 'numeric'
    }
  );

}


function sameDate(
  a,
  b
) {

  return (
    a.getFullYear() ===
      b.getFullYear() &&

    a.getMonth() ===
      b.getMonth() &&

    a.getDate() ===
      b.getDate()
  );

}


/* =========================================================
   CALENDAR UI SETUP
========================================================= */

function setupCalendarUI() {

  if (
    !calendarEl ||
    document.getElementById(
      'calendarMonthControls'
    )
  ) {
    return;
  }


  /*
    Hide the old static weekday
    header because the new calendar
    creates its own.
  */

  const oldWeekHead =
    calendarEl
      .parentElement
      ?.querySelector(
        '.week-head'
      );


  if (oldWeekHead) {
    oldWeekHead.style.display =
      'none';
  }


  const controls =
    document.createElement(
      'div'
    );


  controls.id =
    'calendarMonthControls';


  controls.innerHTML = `

    <div
      style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:12px;
        margin-bottom:14px;
      "
    >

      <button
        id="calendarPrevMonth"
        class="btn"
        type="button"
        aria-label="Previous month"
        style="
          min-width:44px;
          font-size:20px;
        "
      >
        ←
      </button>


      <div
        style="
          text-align:center;
          flex:1;
        "
      >

        <div
          id="calendarMonthTitle"
          style="
            font-size:20px;
            font-weight:800;
          "
        ></div>

        <div
          id="calendarMonthRange"
          class="muted"
          style="
            font-size:12px;
            margin-top:3px;
          "
        >
          Current month + next 12 months
        </div>

      </div>


      <button
        id="calendarNextMonth"
        class="btn"
        type="button"
        aria-label="Next month"
        style="
          min-width:44px;
          font-size:20px;
        "
      >
        →
      </button>

    </div>

  `;


  calendarEl.parentElement
    ?.insertBefore(
      controls,
      calendarEl
    );


  injectCalendarStyles();


  document
    .getElementById(
      'calendarPrevMonth'
    )
    ?.addEventListener(
      'click',
      () => {

        changeMonth(-1);

      }
    );


  document
    .getElementById(
      'calendarNextMonth'
    )
    ?.addEventListener(
      'click',
      () => {

        changeMonth(1);

      }
    );

}


/* =========================================================
   CALENDAR CSS
========================================================= */

function injectCalendarStyles() {

  if (
    document.getElementById(
      'hardstyleMonthCalendarStyles'
    )
  ) {
    return;
  }


  const style =
    document.createElement(
      'style'
    );


  style.id =
    'hardstyleMonthCalendarStyles';


  style.textContent = `

    #calendar {
      display: block;
      min-width: 0;
    }


    .month-calendar-weekdays {
      display: grid;
      grid-template-columns:
        repeat(7, minmax(0, 1fr));

      border-top:
        1px solid var(--border);

      border-left:
        1px solid var(--border);
    }


    .month-calendar-weekday {
      padding: 9px 4px;

      text-align: center;

      color: var(--muted);

      font-size: 12px;
      font-weight: 700;

      border-right:
        1px solid var(--border);

      border-bottom:
        1px solid var(--border);
    }


    .month-calendar-grid {
      display: grid;

      grid-template-columns:
        repeat(7, minmax(0, 1fr));

      border-left:
        1px solid var(--border);
    }


    .month-calendar-day {
      min-height: 125px;

      padding: 7px;

      overflow: hidden;

      border-right:
        1px solid var(--border);

      border-bottom:
        1px solid var(--border);

      background:
        var(--panel);
    }


    .month-calendar-day.other-month {
      opacity: 0.35;
    }


    .month-calendar-day.today {
      outline:
        2px solid var(--accent);

      outline-offset:
        -2px;
    }


    .month-calendar-date {
      margin-bottom: 7px;

      font-size: 12px;
      font-weight: 700;
    }


    .month-calendar-event {
      width: 100%;

      display: block;

      margin-bottom: 5px;

      padding: 5px 6px;

      text-align: left;

      color: var(--text);

      background:
        var(--card);

      border:
        1px solid var(--border);

      border-left-width:
        4px;

      border-radius:
        7px;

      font-size: 11px;
    }


    .month-calendar-event strong {
      display: block;

      overflow: hidden;

      text-overflow: ellipsis;

      white-space: nowrap;
    }


    .month-calendar-event-meta {
      margin-top: 2px;

      overflow: hidden;

      color: var(--muted);

      font-size: 9px;

      text-overflow: ellipsis;

      white-space: nowrap;
    }


    @media (max-width: 700px) {

      .month-calendar-day {
        min-height: 90px;
        padding: 4px;
      }


      .month-calendar-weekday {
        font-size: 10px;
        padding: 7px 2px;
      }


      .month-calendar-date {
        font-size: 10px;
      }


      .month-calendar-event {
        padding: 4px;
        font-size: 9px;
      }


      .month-calendar-event-meta {
        display: none;
      }

    }

  `;


  document.head
    .appendChild(style);

}


/* =========================================================
   CHANGE MONTH
========================================================= */

function changeMonth(amount) {

  const next =
    new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth() +
        amount,
      1
    );


  if (
    next <
    firstMonth
  ) {
    return;
  }


  if (
    next >
    lastMonth
  ) {
    return;
  }


  visibleMonth =
    next;


  renderCalendar();

}


/* =========================================================
   LOAD PROFILES
========================================================= */

async function loadProfiles() {

  const {
    data,
    error
  } =
    await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email
      `);


  if (error) {

    console.error(
      'Profile load error:',
      error
    );

    return new Map();

  }


  return new Map(
    (data ?? []).map(
      profile => [

        profile.id,

        profile.full_name ||
        profile.email ||
        'Team Member'

      ]
    )
  );

}


/* =========================================================
   LOAD DATABASE DATA
========================================================= */

async function loadCalendarData() {

  if (!calendarEl) {
    return;
  }


  setupCalendarUI();


  const {
    data: { session }
  } =
    await supabase.auth
      .getSession();


  if (!session?.user) {
    return;
  }


  const profiles =
    await loadProfiles();


  /*
    Only retrieve dates that fall
    inside the calendar's available
    13-month window.
  */

  const startDate =
    isoDate(
      new Date(
        firstMonth.getFullYear(),
        firstMonth.getMonth(),
        1
      )
    );


  const finalDay =
    new Date(
      lastMonth.getFullYear(),
      lastMonth.getMonth() + 1,
      0
    );


  const endDate =
    isoDate(finalDay);


  const [
    jobsResult,
    tasksResult,
    fightsResult
  ] =
    await Promise.all([


      /* JOBS */

      supabase
        .from('jobs')
        .select(`
          id,
          name,
          owner_id,
          status,
          importance,
          due_date,
          notes,
          show_on_calendar,

          contacts (
            id,
            name,
            phone,
            instagram
          )
        `)
        .eq(
          'show_on_calendar',
          true
        )
        .gte(
          'due_date',
          startDate
        )
        .lte(
          'due_date',
          endDate
        ),


      /* TASKS */

      supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          assigned_to,
          due_date,
          status,
          show_on_calendar,

          jobs (
            id,
            name,

            contacts (
              id,
              name
            )
          )
        `)
        .eq(
          'show_on_calendar',
          true
        )
        .gte(
          'due_date',
          startDate
        )
        .lte(
          'due_date',
          endDate
        ),


      /* FIGHTS */

      supabase
        .from('fights')
        .select(`
          id,
          fighter_id,
          opponent,
          promotion,
          event_name,
          fight_date,
          result,
          notes,
          show_on_calendar,

          fighters (
            id,
            nickname,

            contacts (
              id,
              name,
              phone,
              instagram
            )
          )
        `)
        .eq(
          'show_on_calendar',
          true
        )
        .gte(
          'fight_date',
          startDate
        )
        .lte(
          'fight_date',
          endDate
        )

    ]);


  if (
    jobsResult.error
  ) {

    console.error(
      'Calendar jobs error:',
      jobsResult.error
    );

  }


  if (
    tasksResult.error
  ) {

    console.error(
      'Calendar tasks error:',
      tasksResult.error
    );

  }


  if (
    fightsResult.error
  ) {

    console.error(
      'Calendar fights error:',
      fightsResult.error
    );

  }


  /* =====================================================
     JOB RECORDS
  ===================================================== */

  const jobs =
    (jobsResult.data ?? [])
      .map(
        job => {

          const owner =
            profiles.get(
              job.owner_id
            ) ||
            'Unassigned';


          return {

            type: 'job',

            id: job.id,

            title:
              job.name,

            date:
              job.due_date,

            owner,

            color:
              ownerColors[
                owner
              ] ||
              '#64748b',

            raw:
              job

          };

        }
      );


  /* =====================================================
     TASK RECORDS
  ===================================================== */

  const tasks =
    (tasksResult.data ?? [])
      .map(
        task => {

          const owner =
            profiles.get(
              task.assigned_to
            ) ||
            'Unassigned';


          return {

            type: 'task',

            id:
              task.id,

            title:
              task.title,

            date:
              task.due_date,

            owner,

            color:
              ownerColors[
                owner
              ] ||
              '#64748b',

            raw:
              task

          };

        }
      );


  /* =====================================================
     FIGHT RECORDS
  ===================================================== */

  const fights =
    (fightsResult.data ?? [])
      .map(
        fight => {

          const fighterName =

            fight
              .fighters
              ?.contacts
              ?.name ||

            fight
              .fighters
              ?.nickname ||

            'Fighter';


          return {

            type:
              'fight',

            id:
              fight.id,

            title:
              fighterName,

            date:
              fight.fight_date,

            owner:
              'Fight',

            color:
              FIGHT_COLOR,

            raw:
              fight

          };

        }
      );


  calendarRecords = [
    ...jobs,
    ...tasks,
    ...fights
  ];


  renderCalendar();

}


/* =========================================================
   RENDER MONTH
========================================================= */

function renderCalendar() {

  if (!calendarEl) {
    return;
  }


  setupCalendarUI();


  const title =
    document.getElementById(
      'calendarMonthTitle'
    );


  if (title) {

    title.textContent =
      monthTitle(
        visibleMonth
      );

  }


  /* Arrow states */

  const previousButton =
    document.getElementById(
      'calendarPrevMonth'
    );


  const nextButton =
    document.getElementById(
      'calendarNextMonth'
    );


  if (previousButton) {

    previousButton.disabled =
      visibleMonth.getTime() ===
      firstMonth.getTime();


    previousButton.style.opacity =
      previousButton.disabled
        ? '0.35'
        : '1';

  }


  if (nextButton) {

    nextButton.disabled =
      visibleMonth.getTime() ===
      lastMonth.getTime();


    nextButton.style.opacity =
      nextButton.disabled
        ? '0.35'
        : '1';

  }


  /* Clear existing calendar */

  calendarEl.innerHTML =
    '';


  /* Weekday labels */

  const weekdays =
    document.createElement(
      'div'
    );


  weekdays.className =
    'month-calendar-weekdays';


  weekdays.innerHTML = `

    <div class="month-calendar-weekday">
      SUN
    </div>

    <div class="month-calendar-weekday">
      MON
    </div>

    <div class="month-calendar-weekday">
      TUE
    </div>

    <div class="month-calendar-weekday">
      WED
    </div>

    <div class="month-calendar-weekday">
      THU
    </div>

    <div class="month-calendar-weekday">
      FRI
    </div>

    <div class="month-calendar-weekday">
      SAT
    </div>

  `;


  calendarEl.appendChild(
    weekdays
  );


  const grid =
    document.createElement(
      'div'
    );


  grid.className =
    'month-calendar-grid';


  /*
    First visible cell is the Sunday
    before or on the first day of
    the selected month.
  */

  const monthStart =
    new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth(),
      1
    );


  const gridStart =
    new Date(
      monthStart
    );


  gridStart.setDate(
    gridStart.getDate() -
    gridStart.getDay()
  );


  /*
    Always render 6 weeks = 42 cells.
    This prevents the box from jumping
    taller/shorter between months.
  */

  for (
    let index = 0;
    index < 42;
    index++
  ) {

    const date =
      new Date(
        gridStart
      );


    date.setDate(
      gridStart.getDate() +
      index
    );


    const dateKey =
      isoDate(date);


    const isCurrentMonth =
      date.getMonth() ===
      visibleMonth.getMonth();


    const isToday =
      sameDate(
        date,
        today
      );


    const records =
      calendarRecords
        .filter(
          record =>
            record.date ===
            dateKey
        )
        .sort(
          (a, b) => {

            /*
              Fights first
            */

            if (
              a.type === 'fight' &&
              b.type !== 'fight'
            ) {

              return -1;

            }


            if (
              b.type === 'fight' &&
              a.type !== 'fight'
            ) {

              return 1;

            }


            /*
              Jobs by importance
            */

            if (
              a.type === 'job' &&
              b.type === 'job'
            ) {

              return (
                Number(
                  b.raw.importance ??
                  3
                ) -

                Number(
                  a.raw.importance ??
                  3
                )
              );

            }


            return 0;

          }
        );


    const day =
      document.createElement(
        'div'
      );


    day.className =
      'month-calendar-day';


    if (!isCurrentMonth) {

      day.classList.add(
        'other-month'
      );

    }


    if (isToday) {

      day.classList.add(
        'today'
      );

    }


    day.innerHTML = `

      <div
        class="month-calendar-date"
      >
        ${date.getDate()}
      </div>


      ${
        records
          .map(
            record => `

              <button
                type="button"

                class="
                  month-calendar-event
                "

                data-type="${
                  record.type
                }"

                data-id="${
                  record.id
                }"

                style="
                  border-left-color:
                  ${record.color};
                "
              >

                <strong>
                  ${esc(record.title)}
                </strong>


                <div
                  class="
                    month-calendar-event-meta
                  "
                >

                  ${
                    record.type
                      .toUpperCase()
                  }

                  •

                  ${
                    esc(
                      record.owner
                    )
                  }

                </div>

              </button>

            `
          )
          .join('')
      }

    `;


    grid.appendChild(
      day
    );

  }


  calendarEl.appendChild(
    grid
  );


  /* Click handlers */

  calendarEl
    .querySelectorAll(
      '.month-calendar-event'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            openCalendarRecord(

              button.dataset.type,

              Number(
                button.dataset.id
              )

            );

          }
        );

      }
    );

}


/* =========================================================
   OPEN CALENDAR ITEM
========================================================= */

async function openCalendarRecord(
  type,
  id
) {

  if (
    !detailPanel ||
    !detailContent
  ) {
    return;
  }


  const record =
    calendarRecords.find(
      item =>
        item.type === type &&
        item.id === id
    );


  if (!record) {
    return;
  }


  const data =
    record.raw;


  detailPanel.style.display =
    'block';


  /* =====================================================
     JOB
  ===================================================== */

  if (type === 'job') {

    const {
      data: tasks
    } =
      await supabase
        .from('tasks')
        .select(`
          id,
          title,
          status,
          due_date
        `)
        .eq(
          'job_id',
          data.id
        );


    const {
      data: designs
    } =
      await supabase
        .from('designs')
        .select(`
          id,
          title,
          design_type
        `)
        .eq(
          'job_id',
          data.id
        );


    detailContent.innerHTML = `

      <div class="profile-head">

        <div>

          <h3>
            ${esc(data.name)}
          </h3>

          <span class="badge">
            JOB
          </span>

          <span class="badge">
            Importance
            ${data.importance}/5
          </span>

          <span class="badge">
            ${esc(data.status)}
          </span>

        </div>


        <button
          id="closeCalendarDetail"
          class="btn"
          type="button"
        >
          Close
        </button>

      </div>


      <p>
        <strong>
          Customer:
        </strong>

        ${
          esc(
            data.contacts?.name ||
            'Unassigned'
          )
        }
      </p>


      <p>
        <strong>
          Assigned:
        </strong>

        ${esc(record.owner)}
      </p>


      <p>
        <strong>
          Due:
        </strong>

        ${
          esc(
            formatDate(
              data.due_date
            )
          )
        }
      </p>


      <p>
        <strong>
          Notes:
        </strong>

        ${
          esc(
            data.notes ||
            'None'
          )
        }
      </p>


      <h4>
        Tasks
      </h4>


      ${
        tasks?.length

          ? tasks
              .map(
                task => `

                  <div class="card">

                    <strong>
                      ${esc(task.title)}
                    </strong>

                    <div class="muted">

                      ${esc(task.status)}

                      •

                      ${
                        esc(
                          formatDate(
                            task.due_date
                          )
                        )
                      }

                    </div>

                  </div>

                `
              )
              .join('')

          : `
              <div class="muted">
                No tasks linked.
              </div>
            `
      }


      <h4
        style="
          margin-top:16px
        "
      >
        Designs
      </h4>


      ${
        designs?.length

          ? designs
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
                No designs linked.
              </div>
            `
      }


      <button
        id="removeCalendarItem"
        class="btn"
        type="button"
        style="
          margin-top:18px
        "
      >
        Remove from Calendar
      </button>

    `;

  }


  /* =====================================================
     TASK
  ===================================================== */

  if (type === 'task') {

    detailContent.innerHTML = `

      <div class="profile-head">

        <div>

          <h3>
            ${esc(data.title)}
          </h3>

          <span class="badge">
            TASK
          </span>

        </div>


        <button
          id="closeCalendarDetail"
          class="btn"
          type="button"
        >
          Close
        </button>

      </div>


      <p>
        <strong>
          Assigned:
        </strong>

        ${esc(record.owner)}
      </p>


      <p>
        <strong>
          Due:
        </strong>

        ${
          esc(
            formatDate(
              data.due_date
            )
          )
        }
      </p>


      <p>
        <strong>
          Job:
        </strong>

        ${
          esc(
            data.jobs?.name ||
            'None'
          )
        }
      </p>


      <p>
        <strong>
          Description:
        </strong>

        ${
          esc(
            data.description ||
            'None'
          )
        }
      </p>


      <button
        id="removeCalendarItem"
        class="btn"
        type="button"
      >
        Remove from Calendar
      </button>

    `;

  }


  /* =====================================================
     FIGHT
  ===================================================== */

  if (type === 'fight') {

    detailContent.innerHTML = `

      <div class="profile-head">

        <div>

          <h3>
            ${esc(record.title)}
          </h3>

          <span class="badge">
            FIGHT
          </span>

        </div>


        <button
          id="closeCalendarDetail"
          class="btn"
          type="button"
        >
          Close
        </button>

      </div>


      <p>
        <strong>
          Date:
        </strong>

        ${
          esc(
            formatDate(
              data.fight_date
            )
          )
        }
      </p>


      <p>
        <strong>
          Opponent:
        </strong>

        ${
          esc(
            data.opponent ||
            'TBD'
          )
        }
      </p>


      <p>
        <strong>
          Promotion:
        </strong>

        ${
          esc(
            data.promotion ||
            'None'
          )
        }
      </p>


      <p>
        <strong>
          Event:
        </strong>

        ${
          esc(
            data.event_name ||
            'None'
          )
        }
      </p>


      <p>
        <strong>
          Notes:
        </strong>

        ${
          esc(
            data.notes ||
            'None'
          )
        }
      </p>


      <button
        id="removeCalendarItem"
        class="btn"
        type="button"
      >
        Remove from Calendar
      </button>

    `;

  }


  /* Close */

  document
    .getElementById(
      'closeCalendarDetail'
    )
    ?.addEventListener(
      'click',
      () => {

        detailPanel.style.display =
          'none';

      }
    );


  /* Remove */

  document
    .getElementById(
      'removeCalendarItem'
    )
    ?.addEventListener(
      'click',
      async () => {

        await removeFromCalendar(
          type,
          id
        );

      }
    );


  detailPanel.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest'
  });

}


/* =========================================================
   REMOVE FROM CALENDAR
========================================================= */

async function removeFromCalendar(
  type,
  id
) {

  const tableMap = {
    job: 'jobs',
    task: 'tasks',
    fight: 'fights'
  };


  const table =
    tableMap[type];


  if (!table) {
    return;
  }


  const confirmed =
    confirm(
      'Remove from calendar? The underlying record will remain saved.'
    );


  if (!confirmed) {
    return;
  }


  const {
    error
  } =
    await supabase
      .from(table)
      .update({
        show_on_calendar:
          false
      })
      .eq(
        'id',
        id
      );


  if (error) {

    console.error(
      'Calendar remove error:',
      error
    );


    alert(
      error.message
    );


    return;

  }


  detailPanel.style.display =
    'none';


  await refreshCalendar();

}


/* =========================================================
   PUBLIC REFRESH FUNCTION
========================================================= */

export async function refreshCalendar() {

  await loadCalendarData();

}


window.refreshHardstyleCalendar =
  refreshCalendar;


/* =========================================================
   START
========================================================= */

async function startCalendar() {

  setupCalendarUI();


  const {
    data: { session }
  } =
    await supabase.auth
      .getSession();


  if (session?.user) {

    await refreshCalendar();

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
              refreshCalendar(),
            0
          );

        }

      }
    );

}


startCalendar();