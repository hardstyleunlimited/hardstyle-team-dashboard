import { supabase } from './supabase.js';

const calendarEl =
  document.getElementById(
    'calendar'
  );

const detailPanel =
  document.getElementById(
    'calendarDetailPanel'
  );

const detailContent =
  document.getElementById(
    'calendarDetailContent'
  );


const ownerColors = {
  Max: '#2563eb',
  Jordan: '#16a34a',
  Connor: '#ea580c'
};


let calendarRecords = [];


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
    ).padStart(2, '0'),

    String(
      date.getDate()
    ).padStart(2, '0')

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


function getCalendarStart() {
  const today =
    new Date();

  today.setHours(
    12,
    0,
    0,
    0
  );

  const start =
    new Date(today);

  // Start Sunday.
  start.setDate(
    today.getDate() -
    today.getDay()
  );

  return start;
}


async function loadProfiles() {
  const {
    data,
    error
  } = await supabase
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


async function loadCalendarData() {
  if (!calendarEl) {
    return;
  }


  const {
    data: { session }
  } = await supabase.auth
    .getSession();


  if (!session?.user) {
    return;
  }


  const profiles =
    await loadProfiles();


  const [
    jobsResult,
    tasksResult,
    fightsResult
  ] = await Promise.all([

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
      .not(
        'due_date',
        'is',
        null
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
      .not(
        'due_date',
        'is',
        null
      ),


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
      .not(
        'fight_date',
        'is',
        null
      )

  ]);


  if (jobsResult.error) {
    console.error(
      'Calendar jobs error:',
      jobsResult.error
    );
  }


  if (tasksResult.error) {
    console.error(
      'Calendar tasks error:',
      tasksResult.error
    );
  }


  if (fightsResult.error) {
    console.error(
      'Calendar fights error:',
      fightsResult.error
    );
  }


  const jobs =
    (jobsResult.data ?? [])
      .map(job => {

        const owner =
          profiles.get(
            job.owner_id
          ) ||
          'Unassigned';

        return {
          type: 'job',
          id: job.id,
          title: job.name,
          date: job.due_date,
          owner,
          color:
            ownerColors[owner] ||
            '#64748b',
          raw: job
        };

      });


  const tasks =
    (tasksResult.data ?? [])
      .map(task => {

        const owner =
          profiles.get(
            task.assigned_to
          ) ||
          'Unassigned';

        return {
          type: 'task',
          id: task.id,
          title: task.title,
          date: task.due_date,
          owner,
          color:
            ownerColors[owner] ||
            '#64748b',
          raw: task
        };

      });


  const fights =
    (fightsResult.data ?? [])
      .map(fight => {

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
          type: 'fight',
          id: fight.id,
          title: fighterName,
          date: fight.fight_date,
          owner: 'Fight',
          color: '#a855f7',
          raw: fight
        };

      });


  calendarRecords = [
    ...jobs,
    ...tasks,
    ...fights
  ];


  renderCalendar();
}


function renderCalendar() {
  if (!calendarEl) {
    return;
  }


  calendarEl.innerHTML =
    '';


  const start =
    getCalendarStart();


  for (
    let index = 0;
    index < 28;
    index++
  ) {

    const date =
      new Date(start);

    date.setDate(
      start.getDate() +
      index
    );


    const key =
      isoDate(date);


    const records =
      calendarRecords
        .filter(
          record =>
            record.date ===
            key
        )
        .sort(
          (a, b) => {

            if (
              a.type === 'job' &&
              b.type === 'job'
            ) {
              return (
                b.raw.importance -
                a.raw.importance
              );
            }

            return 0;
          }
        );


    const cell =
      document.createElement(
        'div'
      );


    cell.className =
      'day';


    cell.innerHTML = `
      <div class="date">
        ${
          date.getMonth() + 1
        }/${date.getDate()}
      </div>

      ${
        records
          .map(
            record => `
              <button
                type="button"
                class="calendar-record"

                data-type="${
                  record.type
                }"

                data-id="${
                  record.id
                }"

                style="
                  width:100%;
                  display:block;
                  text-align:left;
                  margin:5px 0;
                  padding:7px;
                  color:inherit;
                  background:var(--card);
                  border:1px solid var(--border);
                  border-left:5px solid ${record.color};
                  border-radius:8px;
                "
              >

                <strong>
                  ${esc(record.title)}
                </strong>

                <div
                  class="muted"
                  style="font-size:10px"
                >
                  ${record.type.toUpperCase()}
                  •
                  ${esc(record.owner)}
                </div>

              </button>
            `
          )
          .join('')
      }
    `;


    calendarEl
      .appendChild(cell);
  }


  calendarEl
    .querySelectorAll(
      '.calendar-record'
    )
    .forEach(button => {

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

    });
}


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


  if (type === 'job') {

    const {
      data: tasks
    } = await supabase
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
    } = await supabase
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
        >
          Close
        </button>

      </div>


      <p>
        <strong>Customer:</strong>
        ${
          esc(
            data.contacts?.name ||
            'Unassigned'
          )
        }
      </p>

      <p>
        <strong>Assigned:</strong>
        ${esc(record.owner)}
      </p>

      <p>
        <strong>Due:</strong>
        ${esc(formatDate(data.due_date))}
      </p>

      <p>
        <strong>Notes:</strong>
        ${esc(data.notes || 'None')}
      </p>


      <h4>Tasks</h4>

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
                      ${esc(formatDate(task.due_date))}
                    </div>
                  </div>
                `
              )
              .join('')
          : '<div class="muted">No tasks linked.</div>'
      }


      <h4 style="margin-top:16px">
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
          : '<div class="muted">No designs linked.</div>'
      }


      <button
        id="removeCalendarItem"
        class="btn"
        style="margin-top:18px"
      >
        Remove from Calendar
      </button>
    `;

  }


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
        >
          Close
        </button>

      </div>

      <p>
        <strong>Assigned:</strong>
        ${esc(record.owner)}
      </p>

      <p>
        <strong>Due:</strong>
        ${esc(formatDate(data.due_date))}
      </p>

      <p>
        <strong>Job:</strong>
        ${
          esc(
            data.jobs?.name ||
            'None'
          )
        }
      </p>

      <p>
        <strong>Description:</strong>
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
      >
        Remove from Calendar
      </button>
    `;

  }


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
        >
          Close
        </button>

      </div>

      <p>
        <strong>Date:</strong>
        ${esc(formatDate(data.fight_date))}
      </p>

      <p>
        <strong>Opponent:</strong>
        ${esc(data.opponent || 'TBD')}
      </p>

      <p>
        <strong>Promotion:</strong>
        ${esc(data.promotion || 'None')}
      </p>

      <p>
        <strong>Event:</strong>
        ${esc(data.event_name || 'None')}
      </p>

      <p>
        <strong>Notes:</strong>
        ${esc(data.notes || 'None')}
      </p>

      <button
        id="removeCalendarItem"
        class="btn"
      >
        Remove from Calendar
      </button>
    `;

  }


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
      'Remove from Upcoming? The underlying record will stay saved.'
    );


  if (!confirmed) {
    return;
  }


  const {
    error
  } = await supabase
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


// THIS IS THE IMPORTANT PART.
// Other modules can import it directly.
export async function refreshCalendar() {
  await loadCalendarData();
}


// Keep window support too.
window.refreshHardstyleCalendar =
  refreshCalendar;


async function startCalendar() {
  const {
    data: { session }
  } = await supabase.auth
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