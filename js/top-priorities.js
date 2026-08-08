import { supabase } from './supabase.js';

const editor = document.getElementById('topFive');
const saveButton = document.getElementById('saveTopFiveBtn');
const status = document.getElementById('topFiveSaveStatus');

function setStatus(message, isError = false) {
  status.textContent = message;
  status.style.color = isError ? '#ff8b8b' : '';
}

async function waitForSession() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (session?.user) {
    return session;
  }

  return await new Promise((resolve) => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (nextSession?.user) {
          listener.subscription.unsubscribe();
          resolve(nextSession);
        }
      }
    );
  });
}

async function loadTopPriorities() {
  await waitForSession();

  const { data, error } = await supabase
    .from('top_priorities')
    .select('position, content')
    .order('position', { ascending: true });

  if (error) {
    console.error('Top priorities load error:', error);
    setStatus('Could not load saved priorities', true);
    return;
  }

  if (!data || data.length === 0) {
    setStatus('Not saved yet');
    return;
  }

  const priorities = new Map(
    data.map((row) => [row.position, row.content])
  );

  const items = [];

  for (let position = 1; position <= 5; position++) {
    items.push(
      `<li>${priorities.get(position) ?? ''}</li>`
    );
  }

  editor.innerHTML = `<ol>${items.join('')}</ol>`;

  setStatus('Loaded from database');
}

async function saveTopPriorities() {
  const {
    data: { session },
    error: sessionError
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    setStatus('Please sign in first', true);
    return;
  }

  let items = [
    ...editor.querySelectorAll('li')
  ];

  if (items.length > 5) {
    setStatus(
      "Please keep Max's Top 5 to five items",
      true
    );

    return;
  }

  while (items.length < 5) {
    let list = editor.querySelector('ol');

    if (!list) {
      list = document.createElement('ol');

      const currentContent = editor.innerHTML;

      editor.innerHTML = '';
      editor.appendChild(list);

      if (currentContent.trim()) {
        const firstItem = document.createElement('li');
        firstItem.innerHTML = currentContent;
        list.appendChild(firstItem);
      }
    }

    const li = document.createElement('li');
    li.innerHTML = '';
    list.appendChild(li);

    items = [
      ...editor.querySelectorAll('li')
    ];
  }

  saveButton.disabled = true;
  saveButton.textContent = 'Saving...';

  setStatus('Saving...');

  const rows = items
    .slice(0, 5)
    .map((item, index) => ({
      position: index + 1,

      // Saves rich-text HTML so bold,
      // italics, colors, etc. remain.
      content: item.innerHTML,

      created_by: session.user.id,

      updated_at:
        new Date().toISOString()
    }));

  const { error } = await supabase
    .from('top_priorities')
    .upsert(
      rows,
      {
        onConflict: 'position'
      }
    );

  saveButton.disabled = false;
  saveButton.textContent = 'Save Top 5';

  if (error) {
    console.error(
      'Top priorities save error:',
      error
    );

    setStatus(error.message, true);

    return;
  }

  setStatus('Saved');
}

saveButton.addEventListener(
  'click',
  saveTopPriorities
);

editor.addEventListener(
  'input',
  () => {
    setStatus('Unsaved changes');
  }
);

loadTopPriorities();