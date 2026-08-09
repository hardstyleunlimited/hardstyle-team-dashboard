import { supabase } from './supabase.js';

// Supports both the original IDs and the newer index.html IDs.
const editor =
  document.getElementById('topFiveEditor') ||
  document.getElementById('topFive');

const saveButton =
  document.getElementById('saveTopFive') ||
  document.getElementById('saveTopFiveBtn');

const status =
  document.getElementById('topFiveStatus') ||
  document.getElementById('topFiveSaveStatus');


function setStatus(message, error = false) {
  if (!status) return;

  status.textContent = message;
  status.style.color =
    error ? '#ff8b8b' : '';
}


async function getSession() {
  const {
    data: { session },
    error
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return session;
}


async function loadTopPriorities() {
  if (!editor) return;

  const session =
    await getSession();

  if (!session?.user) {
    return;
  }

  const {
    data,
    error
  } = await supabase
    .from('top_priorities')
    .select(`
      position,
      content
    `)
    .order(
      'position',
      {
        ascending: true
      }
    );


  if (error) {
    console.error(
      'Top 5 load error:',
      error
    );

    setStatus(
      error.message,
      true
    );

    return;
  }


  if (!data?.length) {

    if (
      !editor.innerHTML.trim()
    ) {
      editor.innerHTML = `
        <ol>
          <li></li>
          <li></li>
          <li></li>
          <li></li>
          <li></li>
        </ol>
      `;
    }

    setStatus(
      'No saved priorities yet.'
    );

    return;
  }


  const rows =
    new Map(
      data.map(
        row => [
          row.position,
          row.content
        ]
      )
    );


  const items = [];

  for (
    let position = 1;
    position <= 5;
    position++
  ) {

    items.push(
      `
        <li>
          ${
            rows.get(position) ??
            ''
          }
        </li>
      `
    );

  }


  editor.innerHTML = `
    <ol>
      ${items.join('')}
    </ol>
  `;


  setStatus(
    'Loaded'
  );
}


function normalizeEditor() {
  let items =
    [
      ...editor
        .querySelectorAll('li')
    ];


  if (items.length) {
    return items;
  }


  const lines =
    editor.innerText
      .split('\n')
      .map(
        line =>
          line.trim()
      )
      .filter(Boolean)
      .slice(0, 5);


  editor.innerHTML = `
    <ol>
      ${
        lines
          .map(
            line =>
              `<li>${line}</li>`
          )
          .join('')
      }
    </ol>
  `;


  return [
    ...editor
      .querySelectorAll('li')
  ];
}


async function saveTopPriorities() {
  try {

    const session =
      await getSession();


    if (!session?.user) {
      setStatus(
        'Please log in first.',
        true
      );

      return;
    }


    let items =
      normalizeEditor();


    if (items.length > 5) {
      setStatus(
        "MAX'S TOP 5 can only contain five items.",
        true
      );

      return;
    }


    let list =
      editor.querySelector('ol');


    if (!list) {
      list =
        document.createElement(
          'ol'
        );

      editor.appendChild(list);
    }


    while (
      items.length < 5
    ) {

      const li =
        document.createElement(
          'li'
        );

      list.appendChild(li);

      items = [
        ...editor
          .querySelectorAll('li')
      ];

    }


    saveButton.disabled =
      true;

    saveButton.textContent =
      'Saving...';

    setStatus(
      'Saving...'
    );


    const rows =
      items
        .slice(0, 5)
        .map(
          (item, index) => ({
            position:
              index + 1,

            // Keeps rich-text formatting.
            content:
              item.innerHTML,

            created_by:
              session.user.id,

            updated_at:
              new Date()
                .toISOString()
          })
        );


    const {
      error
    } = await supabase
      .from('top_priorities')
      .upsert(
        rows,
        {
          onConflict:
            'position'
        }
      );


    if (error) {
      throw error;
    }


    setStatus(
      'Saved'
    );


  } catch (error) {

    console.error(
      'Top 5 save error:',
      error
    );

    setStatus(
      error.message ||
      'Could not save.',
      true
    );


  } finally {

    if (saveButton) {
      saveButton.disabled =
        false;

      saveButton.textContent =
        'Save';
    }

  }
}


saveButton
  ?.addEventListener(
    'click',
    saveTopPriorities
  );


editor
  ?.addEventListener(
    'input',
    () => {
      setStatus(
        'Unsaved changes'
      );
    }
  );


async function startTopFive() {
  const session =
    await getSession();

  if (session?.user) {
    await loadTopPriorities();
  }


  supabase.auth
    .onAuthStateChange(
      (event, session) => {

        if (
          event === 'SIGNED_IN' &&
          session?.user
        ) {

          setTimeout(
            () =>
              loadTopPriorities(),
            0
          );

        }

      }
    );
}


startTopFive();