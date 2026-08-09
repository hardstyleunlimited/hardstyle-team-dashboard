import { supabase } from './supabase.js';

const calendarEl = document.getElementById('calendar');
const detailPanel = document.getElementById('calendarDetailPanel');
const detailContent = document.getElementById('calendarDetailContent');

const ownerColors = {
  Max: '#2563eb',
  Jordan: '#16a34a',
  Connor: '#ea580c'
};

let calendarRecords = [];

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function formatDate(dateString) {
  if (!dateString) return 'No date';

  return new Date(`${dateString}T12:00:00`)
    .toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
}

function isoDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

function getCalendarStart() {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const start = new Date(today);

  // Start on Sunday
  start.setDate(today.getDate() - today.getDay());

  return start;
}

async function loadProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email');

  if (error) {
    console.error('Profiles load error:', error);
    return new Map();
  }

  return new Map(
    (data ?? []).map((profile) => [
      profile.id,
      profile.full_name ||
      profile.email ||
      'Team Member'
    ])
  );
}

async function loadCalendarData() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return;
  }

  const profiles = await loadProfiles();

  const [
    jobsResult,
    tasksResult,
    fightsResult
  ] = await Promise.all([

    // JOBS
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
          name,
          phone,
          instagram,
          contact_type
        )
      `)
      .eq('show_on_calendar', true)
      .not('due_date', 'is', null),

    // TASKS
    supabase
      .from('tasks')
      .select(`
        id,
        job_id,
        title,
        description,
        assigned_to,
        due_date,
        status,
        completed_at,
        show_on_calendar,
        created_at,
        jobs (
          id,
          name,
          contact_id,
          contacts (
            id,
            name,
            phone,
            instagram,
            contact_type
          )
        )
      `)
      .eq('show_on_calendar', true)
      .not('due_date', 'is', null),

    // FIGHTS
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
        created_at,
        fighters (
          id,
          nickname,
          contact_id,
          contacts (
            id,
            name,
            phone,
            instagram,
            contact_type
          )
        )
      `)
      .eq('show_on_calendar', true)
      .not('fight_date', 'is', null)
  ]);

  if (jobsResult.error) {
    console.error(
      'Jobs calendar error:',
      jobsResult.error
    );
  }

  if (tasksResult.error) {
    console.error(
      'Tasks calendar error:',
      tasksResult.error
    );
  }

  if (fightsResult.error) {
    console.error(
      'Fights calendar error:',
      fightsResult.error
    );
  }

  const jobs = (jobsResult.data ?? []).map(
    (job) => {
      const ownerName =
        profiles.get(job.owner_id) ||
        'Unassigned';

      return {
        recordType: 'job',
        id: job.id,
        title: job.name,
        date: job.due_date,
        ownerName,
        color:
          ownerColors[ownerName] ||
          '#64748b',
        raw: job
      };
    }
  );

  const tasks = (tasksResult.data ?? []).map(
    (task) => {
      const ownerName =
        profiles.get(task.assigned_to) ||
        'Unassigned';

      return {
        recordType: 'task',
        id: task.id,
        title: task.title,
        date: task.due_date,
        ownerName,
        color:
          ownerColors[ownerName] ||
          '#64748b',
        raw: task
      };
    }
  );

  const fights = (fightsResult.data ?? []).map(
    (fight) => {
      const fighterName =
        fight.fighters?.contacts?.name ||
        fight.fighters?.nickname ||
        'Fighter';

      return {
        recordType: 'fight',
        id: fight.id,
        title: fighterName,
        date: fight.fight_date,
        ownerName: 'Fight',

        // Purple so fights stand apart
        color: '#a855f7',

        raw: fight
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

function sortDayRecords(records) {
  const typeOrder = {
    fight: 0,
    job: 1,
    task: 2
  };

  return [...records].sort((a, b) => {

    // Jobs with higher importance first
    if (
      a.recordType === 'job' &&
      b.recordType === 'job'
    ) {
      const difference =
        (b.raw.importance ?? 0) -
        (a.raw.importance ?? 0);

      if (difference !== 0) {
        return difference;
      }
    }

    return (
      typeOrder[a.recordType] -
      typeOrder[b.recordType]
    );
  });
}

function calendarItem(record) {
  const typeLabel =
    record.recordType.toUpperCase();

  let secondary = record.ownerName;

  if (record.recordType === 'job') {
    secondary +=
      ` • P${record.raw.importance ?? 3}`;
  }

  if (record.recordType === 'fight') {
    secondary =
      record.raw.promotion ||
      record.raw.event_name ||
      'FIGHT';
  }

  return `
    <button
      type="button"
      class="calendar-db-item"
      data-calendar-type="${record.recordType}"
      data-calendar-id="${record.id}"

      style="
        display:block;
        width:100%;
        margin:5px 0;
        padding:7px;
        text-align:left;
        color:inherit;
        background:var(--card);
        border:1px solid var(--border);
        border-left:5px solid ${record.color};
        border-radius:8px;
        cursor:pointer;
      "
    >
      <div
        style="
          font-weight:700;
          font-size:12px;
        "
      >
        ${esc(record.title)}
      </div>

      <div
        style="
          font-size:10px;
          color:var(--muted);
          margin-top:2px;
        "
      >
        ${esc(typeLabel)}
        •
        ${esc(secondary)}
      </div>
    </button>
  `;
}

function renderCalendar() {
  if (!calendarEl) {
    console.error(
      'Calendar element #calendar was not found.'
    );

    return;
  }

  const start = getCalendarStart();

  calendarEl.innerHTML = '';

  // 4 weeks x 7 days
  for (
    let dayIndex = 0;
    dayIndex < 28;
    dayIndex++
  ) {
    const date = new Date(start);

    date.setDate(
      start.getDate() + dayIndex
    );

    const dateKey = isoDate(date);

    const records =
      sortDayRecords(
        calendarRecords.filter(
          (record) =>
            record.date === dateKey
        )
      );

    const day =
      document.createElement('div');

    day.className = 'day';

    day.innerHTML = `
      <div class="date">
        ${date.getMonth() + 1}/${date.getDate()}
      </div>

      ${
        records
          .map(calendarItem)
          .join('')
      }
    `;

    calendarEl.appendChild(day);
  }

  calendarEl
    .querySelectorAll(
      '.calendar-db-item'
    )
    .forEach((button) => {

      button.addEventListener(
        'click',
        () => {
          openCalendarRecord(
            button.dataset.calendarType,
            Number(
              button.dataset.calendarId
            )
          );
        }
      );

    });
}

function renderRelatedList(
  title,
  items,
  renderItem
) {
  if (!items || items.length === 0) {
    return `
      <div style="margin-top:20px">
        <h4
          style="
            margin:0 0 8px
          "
        >
          ${esc(title)}
        </h4>

        <div class="muted">
          None linked yet.
        </div>
      </div>
    `;
  }

  return `
    <div style="margin-top:20px">

      <h4
        style="
          margin:0 0 8px
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
          items.map(
            (item) => `
              <div
                style="
                  background:var(--panel);
                  border:1px solid var(--border);
                  border-radius:10px;
                  padding:10px;
                "
              >
                ${renderItem(item)}
              </div>
            `
          ).join('')
        }

      </div>
    </div>
  `;
}

async function loadJobDetail(record) {
  const job = record.raw;

  const { data: tasks } = await supabase
    .from('tasks')
    .select(`
      id,
      title,
      description,
      assigned_to,
      due_date,
      status,
      completed_at
    `)
    .eq('job_id', job.id)
    .order(
      'due_date',
      { ascending: true }
    );

  const { data: designs } = await supabase
    .from('designs')
    .select(`
      id,
      title,
      design_type,
      notes,
      created_at
    `)
    .eq('job_id', job.id)
    .order(
      'created_at',
      { ascending: false }
    );

  const { data: uploads } = await supabase
    .from('uploads')
    .select(`
      id,
      category,
      file_name,
      file_url,
      file_type,
      created_at
    `)
    .eq('job_id', job.id)
    .order(
      'created_at',
      { ascending: false }
    );

  return `
    <div class="profile-head">

      <div>

        <h3 style="margin:0">
          ${esc(job.name)}
        </h3>

        <div class="profile-meta">

          <span class="badge">
            JOB
          </span>

          <span class="badge">
            Importance
            ${job.importance ?? 3}/5
          </span>

          <span class="badge">
            ${esc(job.status)}
          </span>

        </div>

      </div>

      <button
        id="closeCalendarDetail"
        class="btn"
        type="button"
      >
        Close
      </button>

    </div>

    <div
      style="
        display:grid;
        grid-template-columns:
          repeat(
            auto-fit,
            minmax(180px,1fr)
          );
        gap:12px;
        margin-top:18px;
      "
    >

      <div>
        <div class="muted">
          Customer
        </div>

        <strong>
          ${
            esc(
              job.contacts?.name ||
              'No customer linked'
            )
          }
        </strong>
      </div>

      <div>
        <div class="muted">
          Assigned
        </div>

        <strong>
          ${esc(record.ownerName)}
        </strong>
      </div>

      <div>
        <div class="muted">
          Due
        </div>

        <strong>
          ${esc(
            formatDate(job.due_date)
          )}
        </strong>
      </div>

      <div>
        <div class="muted">
          Phone
        </div>

        <strong>
          ${esc(
            job.contacts?.phone ||
            '—'
          )}
        </strong>
      </div>

      <div>
        <div class="muted">
          Instagram
        </div>

        <strong>
          ${esc(
            job.contacts?.instagram ||
            '—'
          )}
        </strong>
      </div>

    </div>

    <div style="margin-top:18px">

      <div class="muted">
        Notes
      </div>

      <div>
        ${esc(job.notes || 'No notes')}
      </div>

    </div>

    ${
      renderRelatedList(
        'TASKS',
        tasks,
        (task) => `
          <strong>
            ${esc(task.title)}
          </strong>

          <div class="muted">
            ${esc(task.status)}
            •
            ${esc(
              formatDate(task.due_date)
            )}
          </div>
        `
      )
    }

    ${
      renderRelatedList(
        'DESIGNS',
        designs,
        (design) => `
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
        `
      )
    }

    ${
      renderRelatedList(
        'FILES',
        uploads,
        (upload) => `
          <strong>
            ${esc(upload.file_name)}
          </strong>

          <div class="muted">
            ${esc(upload.category)}
          </div>
        `
      )
    }

    <div
      style="
        display:flex;
        gap:8px;
        flex-wrap:wrap;
        margin-top:20px;
      "
    >

      <button
        id="removeCalendarItem"
        class="btn"
        type="button"
        data-record-type="job"
        data-record-id="${job.id}"
      >
        Remove from Calendar
      </button>

    </div>
  `;
}

async function loadTaskDetail(record) {
  const task = record.raw;

  return `
    <div class="profile-head">

      <div>

        <h3 style="margin:0">
          ${esc(task.title)}
        </h3>

        <div class="profile-meta">

          <span class="badge">
            TASK
          </span>

          <span class="badge">
            ${esc(task.status)}
          </span>

        </div>

      </div>

      <button
        id="closeCalendarDetail"
        class="btn"
        type="button"
      >
        Close
      </button>

    </div>

    <div
      style="
        display:grid;
        grid-template-columns:
          repeat(
            auto-fit,
            minmax(180px,1fr)
          );
        gap:12px;
        margin-top:18px;
      "
    >

      <div>

        <div class="muted">
          Assigned
        </div>

        <strong>
          ${esc(record.ownerName)}
        </strong>

      </div>

      <div>

        <div class="muted">
          Due
        </div>

        <strong>
          ${esc(
            formatDate(task.due_date)
          )}
        </strong>

      </div>

      <div>

        <div class="muted">
          Job
        </div>

        <strong>
          ${
            esc(
              task.jobs?.name ||
              'No job linked'
            )
          }
        </strong>

      </div>

      <div>

        <div class="muted">
          Customer
        </div>

        <strong>
          ${
            esc(
              task.jobs?.contacts?.name ||
              '—'
            )
          }
        </strong>

      </div>

    </div>

    <div style="margin-top:18px">

      <div class="muted">
        Description
      </div>

      <div>
        ${
          esc(
            task.description ||
            'No description'
          )
        }
      </div>

    </div>

    <div
      style="
        display:flex;
        gap:8px;
        flex-wrap:wrap;
        margin-top:20px;
      "
    >

      <button
        id="removeCalendarItem"
        class="btn"
        type="button"
        data-record-type="task"
        data-record-id="${task.id}"
      >
        Remove from Calendar
      </button>

    </div>
  `;
}

async function loadFightDetail(record) {
  const fight = record.raw;

  const fighter =
    fight.fighters;

  const contact =
    fighter?.contacts;

  const { data: designs } =
    contact?.id
      ? await supabase
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
            contact.id
          )
          .order(
            'created_at',
            { ascending: false }
          )
      : { data: [] };

  const { data: jobs } =
    contact?.id
      ? await supabase
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
            contact.id
          )
          .order(
            'created_at',
            { ascending: false }
          )
      : { data: [] };

  const {
    data: previousFights
  } = await supabase
    .from('fights')
    .select(`
      id,
      opponent,
      promotion,
      event_name,
      fight_date,
      result
    `)
    .eq(
      'fighter_id',
      fight.fighter_id
    )
    .neq(
      'id',
      fight.id
    )
    .order(
      'fight_date',
      { ascending: false }
    );

  return `
    <div class="profile-head">

      <div>

        <h3 style="margin:0">
          ${
            esc(
              contact?.name ||
              fighter?.nickname ||
              'Fighter'
            )
          }
        </h3>

        <div class="profile-meta">

          <span class="badge">
            FIGHT
          </span>

          ${
            fighter?.nickname
              ? `
                <span class="badge">
                  ${esc(fighter.nickname)}
                </span>
              `
              : ''
          }

        </div>

      </div>

      <button
        id="closeCalendarDetail"
        class="btn"
        type="button"
      >
        Close
      </button>

    </div>

    <div
      style="
        display:grid;
        grid-template-columns:
          repeat(
            auto-fit,
            minmax(180px,1fr)
          );
        gap:12px;
        margin-top:18px;
      "
    >

      <div>

        <div class="muted">
          Fight Date
        </div>

        <strong>
          ${esc(
            formatDate(
              fight.fight_date
            )
          )}
        </strong>

      </div>

      <div>

        <div class="muted">
          Opponent
        </div>

        <strong>
          ${esc(
            fight.opponent ||
            'TBD'
          )}
        </strong>

      </div>

      <div>

        <div class="muted">
          Promotion
        </div>

        <strong>
          ${esc(
            fight.promotion ||
            '—'
          )}
        </strong>

      </div>

      <div>

        <div class="muted">
          Event
        </div>

        <strong>
          ${esc(
            fight.event_name ||
            '—'
          )}
        </strong>

      </div>

      <div>

        <div class="muted">
          Phone
        </div>

        <strong>
          ${esc(
            contact?.phone ||
            '—'
          )}
        </strong>

      </div>

      <div>

        <div class="muted">
          Instagram
        </div>

        <strong>
          ${esc(
            contact?.instagram ||
            '—'
          )}
        </strong>

      </div>

    </div>

    <div style="margin-top:18px">

      <div class="muted">
        Notes
      </div>

      <div>
        ${esc(
          fight.notes ||
          'No notes'
        )}
      </div>

    </div>

    ${
      renderRelatedList(
        'RELATED JOBS',
        jobs,
        (job) => `
          <strong>
            ${esc(job.name)}
          </strong>

          <div class="muted">
            ${esc(job.status)}
            • Importance
            ${job.importance ?? 3}/5

            ${
              job.due_date
                ? ` • ${esc(
                    formatDate(
                      job.due_date
                    )
                  )}`
                : ''
            }
          </div>
        `
      )
    }

    ${
      renderRelatedList(
        'DESIGNS',
        designs,
        (design) => `
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
        `
      )
    }

    ${
      renderRelatedList(
        'PREVIOUS FIGHTS',
        previousFights,
        (previousFight) => `
          <strong>
            ${
              esc(
                previousFight.opponent ||
                'Opponent TBD'
              )
            }
          </strong>

          <div class="muted">

            ${
              esc(
                previousFight.promotion ||
                ''
              )
            }

            ${
              previousFight.fight_date
                ? ` • ${esc(
                    formatDate(
                      previousFight.fight_date
                    )
                  )}`
                : ''
            }

            ${
              previousFight.result
                ? ` • ${esc(
                    previousFight.result
                  )}`
                : ''
            }

          </div>
        `
      )
    }

    <div
      style="
        display:flex;
        gap:8px;
        flex-wrap:wrap;
        margin-top:20px;
      "
    >

      <button
        id="removeCalendarItem"
        class="btn"
        type="button"
        data-record-type="fight"
        data-record-id="${fight.id}"
      >
        Remove from Calendar
      </button>

    </div>
  `;
}

async function openCalendarRecord(
  recordType,
  id
) {
  const record =
    calendarRecords.find(
      (item) =>
        item.recordType ===
          recordType &&
        item.id === id
    );

  if (
    !record ||
    !detailPanel ||
    !detailContent
  ) {
    return;
  }

  detailPanel.style.display =
    'block';

  detailContent.innerHTML = `
    <div class="muted">
      Loading details...
    </div>
  `;

  let html = '';

  if (recordType === 'job') {
    html =
      await loadJobDetail(
        record
      );
  }

  if (recordType === 'task') {
    html =
      await loadTaskDetail(
        record
      );
  }

  if (recordType === 'fight') {
    html =
      await loadFightDetail(
        record
      );
  }

  detailContent.innerHTML = html;

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
      removeFromCalendar
    );

  detailPanel.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest'
  });
}

async function removeFromCalendar(
  event
) {
  const button =
    event.currentTarget;

  const recordType =
    button.dataset.recordType;

  const id =
    Number(
      button.dataset.recordId
    );

  const tableMap = {
    job: 'jobs',
    task: 'tasks',
    fight: 'fights'
  };

  const table =
    tableMap[recordType];

  if (!table) {
    return;
  }

  const confirmed =
    window.confirm(
      'Remove this item from the Upcoming calendar? The underlying record will NOT be deleted.'
    );

  if (!confirmed) {
    return;
  }

  button.disabled = true;

  button.textContent =
    'Removing...';

  const { error } = await supabase
    .from(table)
    .update({
      show_on_calendar: false
    })
    .eq('id', id);

  if (error) {
    console.error(
      'Calendar removal error:',
      error
    );

    button.disabled = false;

    button.textContent =
      'Remove from Calendar';

    alert(error.message);

    return;
  }

  detailPanel.style.display =
    'none';

  await loadCalendarData();
}

async function startCalendar() {
  const {
    data: { session }
  } = await supabase.auth
    .getSession();

  if (session?.user) {
    await loadCalendarData();

    return;
  }

  const { data: authListener } =
    supabase.auth
      .onAuthStateChange(
        async (
          _event,
          newSession
        ) => {

          if (newSession?.user) {
            await loadCalendarData();
          }

          if (!newSession) {
            calendarRecords = [];

            renderCalendar();

            if (detailPanel) {
              detailPanel.style.display =
                'none';
            }
          }
        }
      );

  window.addEventListener(
    'beforeunload',
    () => {
      authListener
        .subscription
        .unsubscribe();
    }
  );
}

startCalendar();