import { supabase } from './supabase.js';


/* =========================================================
   DOM
========================================================= */

const fighterList =
  document.getElementById('fighterList');


/* =========================================================
   STATE
========================================================= */

let fightersCache = [];
let allFightersCache = [];
let profilesCache = [];
let tasksCache = [];


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
    return 'No date';
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
  const date =
    new Date();

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


function getProfileName(
  profileId
) {
  const profile =
    profilesCache.find(
      item =>
        item.id ===
        profileId
    );

  return (
    profile?.full_name ||
    profile?.email ||
    'Unassigned'
  );
}


function taskStatusLabel(
  status
) {
  const labels = {
    open:
      'To Do',

    pending:
      'To Do',

    in_progress:
      'In Progress',

    complete:
      'Complete',

    completed:
      'Complete'
  };

  return (
    labels[status] ||
    status ||
    'To Do'
  );
}


function isTaskComplete(task) {
  return (
    task.status ===
      'complete' ||
    task.status ===
      'completed'
  );
}


function fighterName(fighter) {
  return (
    fighter?.contacts?.name ||
    fighter?.nickname ||
    `Fighter ${fighter?.id ?? ''}`
  );
}


/* =========================================================
   STYLES
========================================================= */

function injectStyles() {

  if (
    document.getElementById(
      'fightersPanelStyles'
    )
  ) {
    return;
  }


  const style =
    document.createElement(
      'style'
    );


  style.id =
    'fightersPanelStyles';


  style.textContent = `

    /* ================================
       ROSTER TOOLBAR
    ================================ */

    .fighter-roster-toolbar {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      flex-wrap:wrap;

      margin-bottom:14px;
      padding:12px;

      background:var(--card);

      border:
        1px solid var(--border);

      border-radius:10px;
    }


    .fighter-roster-controls {
      display:flex;
      align-items:center;
      gap:8px;
      flex-wrap:wrap;
    }


    .fighter-roster-controls select {
      min-width:230px;

      padding:8px;

      color:var(--text);
      background:#111216;

      border:
        1px solid var(--border);

      border-radius:7px;
    }


    /* ================================
       FIGHTER BREAKOUT
    ================================ */

    .fighter-breakout {
      margin-bottom:12px;

      background:var(--card);

      border:
        1px solid var(--border);

      border-radius:12px;

      overflow:hidden;
    }


    .fighter-breakout-head {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;

      padding:14px;

      cursor:pointer;
    }


    .fighter-breakout-head:hover {
      background:
        rgba(255,255,255,.025);
    }


    .fighter-name {
      font-weight:900;
      font-size:16px;
    }


    .fighter-next {
      margin-top:5px;

      color:var(--muted);

      font-size:12px;
    }


    .fighter-chevron {
      font-size:18px;

      transition:
        transform .15s ease;
    }


    .fighter-breakout.open
    .fighter-chevron {
      transform:
        rotate(180deg);
    }


    .fighter-breakout-body {
      display:none;

      padding:
        0 14px 14px;
    }


    .fighter-breakout.open
    .fighter-breakout-body {
      display:block;
    }


    /* ================================
       FIGHTER INFO
    ================================ */

    .fighter-info-grid {
      display:grid;

      grid-template-columns:
        repeat(
          2,
          minmax(0,1fr)
        );

      gap:10px;

      margin-top:4px;
    }


    .fighter-info-card {
      padding:12px;

      background:#111216;

      border:
        1px solid var(--border);

      border-radius:9px;
    }


    .fighter-section-label {
      margin-bottom:9px;

      color:var(--muted);

      font-size:10px;
      font-weight:800;

      letter-spacing:1px;

      text-transform:uppercase;
    }


    .fighter-detail-row {
      display:flex;

      justify-content:
        space-between;

      gap:12px;

      padding:5px 0;

      font-size:12px;

      border-bottom:
        1px solid rgba(
          255,
          255,
          255,
          .035
        );
    }


    .fighter-detail-row:last-child {
      border-bottom:0;
    }


    .fighter-detail-row span:first-child {
      color:var(--muted);
    }


    /* ================================
       BUTTONS
    ================================ */

    .fighter-small-btn {
      display:inline-block;

      padding:6px 8px;

      color:var(--text);

      background:var(--card);

      border:
        1px solid var(--border);

      border-radius:7px;

      font-size:10px;

      text-decoration:none;

      cursor:pointer;
    }


    .fighter-small-btn.primary {
      color:#111;

      background:#fff;

      border-color:#fff;

      font-weight:700;
    }


    .fighter-small-btn:disabled {
      opacity:.45;
      cursor:not-allowed;
    }


    .fighter-remove-btn {
      color:#fecaca;

      border-color:#7f1d1d;

      margin-left:6px;
    }


    /* ================================
       DESIGN TASKS
    ================================ */

    .design-task-section {
      margin-top:12px;

      padding-top:12px;

      border-top:
        1px solid var(--border);
    }


    .design-task-head {
      display:flex;

      justify-content:
        space-between;

      align-items:center;

      gap:10px;

      margin-bottom:9px;
    }


    .design-task {
      margin-bottom:7px;

      padding:10px;

      background:#111216;

      border:
        1px solid var(--border);

      border-radius:9px;
    }


    .design-task.complete {
      opacity:.55;
    }


    .design-task-title {
      font-weight:700;
      font-size:13px;
    }


    .design-task-meta {
      margin-top:5px;

      color:var(--muted);

      font-size:11px;

      line-height:1.5;
    }


    .design-task-actions {
      display:flex;

      gap:6px;

      flex-wrap:wrap;

      margin-top:8px;
    }


    /* ================================
       TASK FORM
    ================================ */

    .fighter-task-form {
      display:none;

      margin-top:10px;

      padding:12px;

      background:#111216;

      border:
        1px solid var(--border);

      border-radius:9px;
    }


    .fighter-task-form.open {
      display:block;
    }


    .fighter-task-grid {
      display:grid;

      grid-template-columns:
        repeat(
          2,
          minmax(0,1fr)
        );

      gap:9px;
    }


    .fighter-task-field {
      display:flex;

      flex-direction:column;

      gap:5px;
    }


    .fighter-task-field.full {
      grid-column:
        1 / -1;
    }


    .fighter-task-field label {
      color:var(--muted);

      font-size:10px;
    }


    .fighter-task-field input,
    .fighter-task-field select,
    .fighter-task-field textarea {
      width:100%;

      padding:8px;

      color:var(--text);

      background:var(--card);

      border:
        1px solid var(--border);

      border-radius:7px;
    }


    .fighter-empty {
      padding:12px;

      color:var(--muted);

      font-size:12px;

      text-align:center;

      border:
        1px dashed var(--border);

      border-radius:9px;
    }


    @media (
      max-width:700px
    ) {

      .fighter-info-grid,
      .fighter-task-grid {
        grid-template-columns:
          1fr;
      }


      .fighter-task-field.full {
        grid-column:auto;
      }


      .fighter-roster-controls {
        width:100%;
      }


      .fighter-roster-controls select {
        width:100%;
      }

    }

  `;


  document.head.appendChild(
    style
  );
}


/* =========================================================
   LOAD DATA
========================================================= */

export async function refreshFightersPanel() {

  if (!fighterList) {
    return;
  }


  fighterList.innerHTML = `

    <div class="muted">
      Loading fighters...
    </div>

  `;


  const [
    fightersResult,
    profilesResult,
    tasksResult
  ] =
    await Promise.all([


      /* ALL FIGHTERS */

      supabase
        .from('fighters')
        .select(`
          id,
          nickname,
          contact_id,
          show_on_fighters_panel,
          created_at,

          contacts (
            id,
            name,
            phone,
            instagram,
            contact_type
          ),

          fights (
            id,
            fighter_id,
            opponent,
            promotion,
            event_name,
            fight_date,
            result,
            notes,
            show_on_calendar
          )
        `)
        .order(
          'created_at',
          {
            ascending:true
          }
        ),


      /* EMPLOYEES */

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
            ascending:true
          }
        ),


      /* DESIGN TASKS */

      supabase
        .from('tasks')
        .select(`
          id,
          job_id,
          fighter_id,
          fight_id,
          task_type,
          title,
          description,
          assigned_to,
          due_date,
          status,
          completed_at,
          created_at,
          updated_at
        `)
        .eq(
          'task_type',
          'design'
        )
        .order(
          'due_date',
          {
            ascending:true,
            nullsFirst:false
          }
        )

    ]);


  if (
    fightersResult.error
  ) {

    console.error(
      'Fighters panel error:',
      fightersResult.error
    );


    fighterList.innerHTML = `

      <div class="fighter-empty">

        Could not load fighters.

        <br><br>

        ${esc(
          fightersResult.error.message
        )}

      </div>

    `;


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


  if (
    tasksResult.error
  ) {

    console.error(
      'Design tasks error:',
      tasksResult.error
    );

  }


  /*
    Keep every fighter available
    for the roster dropdown.
  */

  allFightersCache =
    fightersResult.data ??
    [];


  /*
    ONLY manually assigned fighters
    appear in the actual panel.
  */

  fightersCache =
    allFightersCache.filter(
      fighter =>
        fighter
          .show_on_fighters_panel ===
        true
    );


  profilesCache =
    profilesResult.data ??
    [];


  tasksCache =
    tasksResult.data ??
    [];


  renderFighters();
}


/* =========================================================
   NEXT / CURRENT FIGHT
========================================================= */

function getNextFight(
  fighter
) {

  const fights =
    fighter.fights ??
    [];


  const today =
    todayString();


  const upcoming =
    fights
      .filter(
        fight =>
          fight.fight_date &&
          String(
            fight.fight_date
          ).slice(
            0,
            10
          ) >= today
      )
      .sort(
        (a,b) =>
          String(
            a.fight_date
          ).localeCompare(
            String(
              b.fight_date
            )
          )
      );


  if (
    upcoming.length
  ) {
    return upcoming[0];
  }


  /*
    No upcoming fight.

    Show most recent fight instead.
  */

  return [...fights]
    .filter(
      fight =>
        fight.fight_date
    )
    .sort(
      (a,b) =>
        String(
          b.fight_date
        ).localeCompare(
          String(
            a.fight_date
          )
        )
    )[0] ||
    null;
}


/* =========================================================
   RENDER PANEL
========================================================= */

function renderFighters() {

  /*
    Fighters NOT currently assigned
    to the panel.
  */

  const availableFighters =
    allFightersCache.filter(
      fighter =>
        fighter
          .show_on_fighters_panel !==
        true
    );


  const fighterOptions =
    availableFighters
      .map(
        fighter => `

          <option
            value="${fighter.id}"
          >
            ${esc(
              fighterName(
                fighter
              )
            )}
          </option>

        `
      )
      .join('');


  /*
    Roster control.
  */

  const rosterToolbar = `

    <div
      class="fighter-roster-toolbar"
    >

      <div>

        <div
          class="fighter-section-label"
        >
          Fighter Panel Roster
        </div>


        <div
          class="muted"
          style="
            font-size:11px;
          "
        >
          Choose which fighters are actively displayed here.
        </div>

      </div>


      <div
        class="fighter-roster-controls"
      >

        <select
          id="fighterPanelAddSelect"
        >

          <option value="">
            Select fighter to add
          </option>

          ${fighterOptions}

        </select>


        <button
          id="addFighterToPanelBtn"
          class="
            fighter-small-btn
            primary
          "
          type="button"

          ${
            availableFighters.length
              ? ''
              : 'disabled'
          }
        >

          + Add Fighter To Panel

        </button>

      </div>

    </div>

  `;


  /*
    No one assigned yet.
  */

  if (
    !fightersCache.length
  ) {

    fighterList.innerHTML =
      rosterToolbar +
      `

        <div class="fighter-empty">

          No fighters assigned to this panel yet.

          <br><br>

          Use the dropdown above to add one.

        </div>

      `;


    bindRosterEvents();

    return;
  }


  /*
    Assigned roster.
  */

  fighterList.innerHTML =
    rosterToolbar +
    fightersCache
      .map(
        fighter =>
          fighterCard(
            fighter
          )
      )
      .join('');


  bindRosterEvents();

  bindFighterEvents();
}


/* =========================================================
   FIGHTER BREAKOUT CARD
========================================================= */

function fighterCard(
  fighter
) {

  const name =
    fighterName(
      fighter
    );


  const nextFight =
    getNextFight(
      fighter
    );


  const designTasks =
    tasksCache.filter(
      task =>
        Number(
          task.fighter_id
        ) ===
        Number(
          fighter.id
        )
    );


  return `

    <div
      class="fighter-breakout"
      data-fighter-id="${fighter.id}"
    >


      <!-- HEADER -->

      <div
        class="fighter-breakout-head"
      >

        <div>

          <div class="fighter-name">

            ${esc(name)}

          </div>


          ${
            fighter.nickname &&
            fighter.nickname !== name

              ? `

                  <div class="fighter-next">
                    "${esc(
                      fighter.nickname
                    )}"
                  </div>

                `

              : ''
          }


          <div class="fighter-next">

            ${
              nextFight

                ? `Next Fight: ${
                    esc(
                      formatDate(
                        nextFight
                          .fight_date
                      )
                    )
                  }`

                : 'No fight scheduled'
            }

          </div>

        </div>


        <div class="fighter-chevron">
          ▾
        </div>

      </div>


      <!-- BODY -->

      <div
        class="fighter-breakout-body"
      >


        <div
          class="fighter-info-grid"
        >


          <!-- FIGHT INFORMATION -->

          <div
            class="fighter-info-card"
          >

            <div
              class="fighter-section-label"
            >
              Fight Information
            </div>


            ${
              nextFight

                ? `

                    ${detailRow(
                      'Opponent',
                      nextFight.opponent ||
                      'TBD'
                    )}


                    ${detailRow(
                      'Promotion',
                      nextFight.promotion ||
                      'Not listed'
                    )}


                    ${detailRow(
                      'Event',
                      nextFight.event_name ||
                      'Not listed'
                    )}


                    ${detailRow(
                      'Fight Date',
                      formatDate(
                        nextFight
                          .fight_date
                      )
                    )}


                    ${detailRow(
                      'Result',
                      nextFight.result ||
                      'Upcoming'
                    )}


                    ${detailRow(
                      'Notes',
                      nextFight.notes ||
                      'None'
                    )}

                  `

                : `

                    <div
                      class="fighter-empty"
                    >
                      No fight information yet.
                    </div>

                  `
            }

          </div>


          <!-- FIGHTER INFORMATION -->

          <div
            class="fighter-info-card"
          >

            <div
              class="fighter-section-label"
            >
              Fighter
            </div>


            ${detailRow(
              'Name',
              name
            )}


            ${detailRow(
              'Nickname',
              fighter.nickname ||
              'None'
            )}


            ${detailRow(
              'Phone',
              fighter
                .contacts
                ?.phone ||
              'Not listed'
            )}


            ${detailRow(
              'Instagram',
              fighter
                .contacts
                ?.instagram ||
              'Not listed'
            )}


            <div
              style="
                margin-top:12px;
              "
            >

              <a
                class="
                  fighter-small-btn
                  primary
                "
                href="./designs.html"
              >
                Open Design Center
              </a>


              <button
                class="
                  fighter-small-btn
                  fighter-remove-btn
                  removeFighterFromPanelBtn
                "
                data-fighter-id="${fighter.id}"
                type="button"
              >
                Remove From Panel
              </button>

            </div>

          </div>


        </div>


        <!-- DESIGN TASKS -->

        <div
          class="design-task-section"
        >

          <div
            class="design-task-head"
          >

            <div>

              <div
                class="fighter-section-label"
              >
                Design Tasks
              </div>


              <div
                class="muted"
                style="
                  font-size:11px;
                "
              >
                Assign design work to team members
              </div>

            </div>


            <button
              class="
                fighter-small-btn
                primary
                addDesignTaskBtn
              "
              data-fighter-id="${fighter.id}"
              data-fight-id="${nextFight?.id || ''}"
              type="button"
            >
              + Add Design Task
            </button>

          </div>


          <div
            class="designTaskList"
          >

            ${
              designTasks.length

                ? designTasks
                    .map(
                      task =>
                        designTaskCard(
                          task
                        )
                    )
                    .join('')

                : `

                    <div
                      class="fighter-empty"
                    >
                      No design tasks assigned.
                    </div>

                  `
            }

          </div>


          ${
            designTaskForm(
              fighter,
              nextFight
            )
          }


        </div>


      </div>

    </div>

  `;
}


/* =========================================================
   DETAIL ROW
========================================================= */

function detailRow(
  label,
  value
) {

  return `

    <div
      class="fighter-detail-row"
    >

      <span>
        ${esc(label)}
      </span>

      <span>
        ${esc(value)}
      </span>

    </div>

  `;
}


/* =========================================================
   DESIGN TASK CARD
========================================================= */

function designTaskCard(
  task
) {

  const complete =
    isTaskComplete(
      task
    );


  return `

    <div
      class="
        design-task

        ${
          complete
            ? 'complete'
            : ''
        }
      "
    >

      <div
        class="design-task-title"
      >

        ${
          complete
            ? '✓ '
            : ''
        }

        ${esc(task.title)}

      </div>


      <div
        class="design-task-meta"
      >

        Assigned:
        ${esc(
          getProfileName(
            task.assigned_to
          )
        )}

        <br>


        Due:
        ${esc(
          formatDate(
            task.due_date
          )
        )}

        <br>


        Status:
        ${esc(
          taskStatusLabel(
            task.status
          )
        )}


        ${
          task.description

            ? `

                <br>

                Notes:
                ${esc(
                  task.description
                )}

              `

            : ''
        }

      </div>


      <div
        class="design-task-actions"
      >

        ${
          !complete

            ? `

                <button
                  class="
                    fighter-small-btn
                    taskProgressBtn
                  "
                  data-task-id="${task.id}"
                  type="button"
                >
                  In Progress
                </button>


                <button
                  class="
                    fighter-small-btn
                    taskCompleteBtn
                  "
                  data-task-id="${task.id}"
                  type="button"
                >
                  Complete
                </button>

              `

            : ''
        }

      </div>

    </div>

  `;
}


/* =========================================================
   DESIGN TASK FORM
========================================================= */

function designTaskForm(
  fighter,
  nextFight
) {

  return `

    <div
      class="fighter-task-form"
      id="designTaskForm-${fighter.id}"
    >

      <div
        class="fighter-task-grid"
      >


        <!-- TITLE -->

        <div
          class="
            fighter-task-field
            full
          "
        >

          <label>
            Task Name
          </label>


          <input
            class="newTaskTitle"
            type="text"
            placeholder="Fight shorts, walkout shirt, sponsor graphic..."
          >

        </div>


        <!-- OWNER -->

        <div
          class="fighter-task-field"
        >

          <label>
            Assign To
          </label>


          <select
            class="newTaskOwner"
          >

            <option value="">
              Select team member
            </option>


            ${
              profilesCache
                .map(
                  profile => `

                    <option
                      value="${profile.id}"
                    >

                      ${esc(
                        profile.full_name ||
                        profile.email
                      )}

                    </option>

                  `
                )
                .join('')
            }

          </select>

        </div>


        <!-- DUE -->

        <div
          class="fighter-task-field"
        >

          <label>
            Due Date
          </label>


          <input
            class="newTaskDue"
            type="date"
          >

        </div>


        <!-- NOTES -->

        <div
          class="
            fighter-task-field
            full
          "
        >

          <label>
            Notes
          </label>


          <textarea
            class="newTaskDescription"
            rows="3"
            placeholder="Design instructions..."
          ></textarea>

        </div>


        <!-- CREATE -->

        <div
          class="
            fighter-task-field
            full
          "
        >

          <button
            class="
              fighter-small-btn
              primary
              createDesignTaskBtn
            "
            data-fighter-id="${fighter.id}"
            data-fight-id="${nextFight?.id || ''}"
            type="button"
          >
            Create Task
          </button>

        </div>


      </div>

    </div>

  `;
}


/* =========================================================
   ROSTER EVENTS
========================================================= */

function bindRosterEvents() {

  /*
    ADD FIGHTER TO PANEL
  */

  const addButton =
    document.getElementById(
      'addFighterToPanelBtn'
    );


  addButton
    ?.addEventListener(
      'click',
      async () => {

        const select =
          document.getElementById(
            'fighterPanelAddSelect'
          );


        const fighterId =
          Number(
            select?.value
          );


        if (!fighterId) {

          alert(
            'Select a fighter to add.'
          );

          return;
        }


        addButton.disabled =
          true;


        addButton.textContent =
          'Adding...';


        const {
          error
        } =
          await supabase
            .from('fighters')
            .update({

              show_on_fighters_panel:
                true

            })
            .eq(
              'id',
              fighterId
            );


        if (error) {

          console.error(
            'Add fighter to panel error:',
            error
          );


          alert(
            error.message
          );


          addButton.disabled =
            false;


          addButton.textContent =
            '+ Add Fighter To Panel';


          return;
        }


        window.dispatchEvent(
          new CustomEvent(
            'hardstyle:data-changed',
            {
              detail: {
                type:
                  'fighter-panel'
              }
            }
          )
        );


        await refreshFightersPanel();

      }
    );


  /*
    REMOVE FIGHTER FROM PANEL
  */

  document
    .querySelectorAll(
      '.removeFighterFromPanelBtn'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          async event => {

            event.stopPropagation();


            const fighterId =
              Number(
                button.dataset
                  .fighterId
              );


            const fighter =
              allFightersCache.find(
                item =>
                  Number(
                    item.id
                  ) ===
                  fighterId
              );


            const name =
              fighterName(
                fighter
              );


            const confirmed =
              confirm(
                `Remove ${name} from the Fighters panel?\n\nThis will NOT delete the fighter, fights, or design tasks.`
              );


            if (!confirmed) {
              return;
            }


            button.disabled =
              true;


            button.textContent =
              'Removing...';


            const {
              error
            } =
              await supabase
                .from('fighters')
                .update({

                  show_on_fighters_panel:
                    false

                })
                .eq(
                  'id',
                  fighterId
                );


            if (error) {

              console.error(
                'Remove fighter error:',
                error
              );


              alert(
                error.message
              );


              button.disabled =
                false;


              button.textContent =
                'Remove From Panel';


              return;
            }


            window.dispatchEvent(
              new CustomEvent(
                'hardstyle:data-changed',
                {
                  detail: {
                    type:
                      'fighter-panel'
                  }
                }
              )
            );


            await refreshFightersPanel();

          }
        );

      }
    );
}


/* =========================================================
   FIGHTER EVENTS
========================================================= */

function bindFighterEvents() {

  /*
    EXPAND / COLLAPSE
  */

  document
    .querySelectorAll(
      '.fighter-breakout-head'
    )
    .forEach(
      head => {

        head.addEventListener(
          'click',
          () => {

            head
              .closest(
                '.fighter-breakout'
              )
              ?.classList
              .toggle(
                'open'
              );

          }
        );

      }
    );


  /*
    SHOW DESIGN TASK FORM
  */

  document
    .querySelectorAll(
      '.addDesignTaskBtn'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          event => {

            event.stopPropagation();


            const fighterId =
              button.dataset
                .fighterId;


            document
              .getElementById(
                `designTaskForm-${fighterId}`
              )
              ?.classList
              .toggle(
                'open'
              );

          }
        );

      }
    );


  /*
    CREATE DESIGN TASK
  */

  document
    .querySelectorAll(
      '.createDesignTaskBtn'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          async () => {

            await createDesignTask(
              button
            );

          }
        );

      }
    );


  /*
    MARK IN PROGRESS
  */

  document
    .querySelectorAll(
      '.taskProgressBtn'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          async () => {

            await updateTaskStatus(
              Number(
                button.dataset
                  .taskId
              ),
              'in_progress'
            );

          }
        );

      }
    );


  /*
    COMPLETE TASK
  */

  document
    .querySelectorAll(
      '.taskCompleteBtn'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          async () => {

            await completeTask(
              Number(
                button.dataset
                  .taskId
              )
            );

          }
        );

      }
    );
}


/* =========================================================
   CREATE DESIGN TASK
========================================================= */

async function createDesignTask(
  button
) {

  const fighterId =
    Number(
      button.dataset
        .fighterId
    );


  const fightId =
    button.dataset
      .fightId

      ? Number(
          button.dataset
            .fightId
        )

      : null;


  const form =
    document.getElementById(
      `designTaskForm-${fighterId}`
    );


  const title =
    form
      .querySelector(
        '.newTaskTitle'
      )
      .value
      .trim();


  const owner =
    form
      .querySelector(
        '.newTaskOwner'
      )
      .value;


  const due =
    form
      .querySelector(
        '.newTaskDue'
      )
      .value;


  const description =
    form
      .querySelector(
        '.newTaskDescription'
      )
      .value
      .trim();


  if (!title) {

    alert(
      'Enter a task name.'
    );

    return;
  }


  if (!owner) {

    alert(
      'Select who the task is assigned to.'
    );

    return;
  }


  if (!due) {

    alert(
      'Select a due date.'
    );

    return;
  }


  button.disabled =
    true;


  button.textContent =
    'Creating...';


  const {
    error
  } =
    await supabase
      .from('tasks')
      .insert({

        title,

        description:
          description ||
          null,

        assigned_to:
          owner,

        due_date:
          due,

        status:
          'open',

        task_type:
          'design',

        fighter_id:
          fighterId,

        fight_id:
          fightId,

        job_id:
          null

      });


  if (error) {

    console.error(
      'Create design task error:',
      error
    );


    alert(
      error.message
    );


    button.disabled =
      false;


    button.textContent =
      'Create Task';


    return;
  }


  /*
    Notify other dashboard modules.
  */

  window.dispatchEvent(
    new CustomEvent(
      'hardstyle:data-changed',
      {
        detail: {
          type:
            'task'
        }
      }
    )
  );


  await refreshFightersPanel();
}


/* =========================================================
   UPDATE TASK STATUS
========================================================= */

async function updateTaskStatus(
  taskId,
  status
) {

  const {
    error
  } =
    await supabase
      .from('tasks')
      .update({

        status,

        updated_at:
          new Date()
            .toISOString()

      })
      .eq(
        'id',
        taskId
      );


  if (error) {

    console.error(
      'Update task error:',
      error
    );


    alert(
      error.message
    );

    return;
  }


  window.dispatchEvent(
    new CustomEvent(
      'hardstyle:data-changed',
      {
        detail: {
          type:
            'task'
        }
      }
    )
  );


  await refreshFightersPanel();
}


/* =========================================================
   COMPLETE TASK
========================================================= */

async function completeTask(
  taskId
) {

  const now =
    new Date()
      .toISOString();


  const {
    error
  } =
    await supabase
      .from('tasks')
      .update({

        status:
          'complete',

        completed_at:
          now,

        updated_at:
          now

      })
      .eq(
        'id',
        taskId
      );


  if (error) {

    console.error(
      'Complete task error:',
      error
    );


    alert(
      error.message
    );

    return;
  }


  window.dispatchEvent(
    new CustomEvent(
      'hardstyle:data-changed',
      {
        detail: {
          type:
            'task'
        }
      }
    )
  );


  await refreshFightersPanel();
}


/* =========================================================
   GLOBAL REFRESH
========================================================= */

window.refreshHardstyleFighters =
  refreshFightersPanel;


/* =========================================================
   DATA CHANGE LISTENER
========================================================= */

window.addEventListener(
  'hardstyle:data-changed',
  async event => {

    if (
      event.detail?.type ===
        'fight' ||

      event.detail?.type ===
        'task' ||

      event.detail?.type ===
        'fighter-panel'
    ) {

      await refreshFightersPanel();

    }

  }
);


/* =========================================================
   START
========================================================= */

async function start() {

  injectStyles();


  const {
    data: { session }
  } =
    await supabase.auth
      .getSession();


  if (
    session?.user
  ) {

    await refreshFightersPanel();

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
            () => {
              refreshFightersPanel();
            },
            0
          );

        }

      }
    );
}


start();