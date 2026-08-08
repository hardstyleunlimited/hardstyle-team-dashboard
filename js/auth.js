import { supabase } from './supabase.js';

const authGate = document.getElementById('authGate');
const loginForm = document.getElementById('loginForm');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginButton = document.getElementById('loginButton');
const loginError = document.getElementById('loginError');
const signOutBtn = document.getElementById('signOutBtn');
const authUser = document.getElementById('authUser');
const authUserName = document.getElementById('authUserName');

async function showSignedIn(user) {
  authGate.style.display = 'none';
  authUser.style.display = 'flex';

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Profile lookup error:', error);
  }

  authUserName.textContent =
    profile?.full_name ||
    profile?.email ||
    user.email ||
    'Team Member';
}

function showSignedOut() {
  authGate.style.display = 'flex';
  authUser.style.display = 'none';
  authUserName.textContent = '';
  loginPassword.value = '';
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  loginError.textContent = '';
  loginButton.disabled = true;
  loginButton.textContent = 'Signing In...';

  const { data, error } = await supabase.auth.signInWithPassword({
    email: loginEmail.value.trim(),
    password: loginPassword.value
  });

  loginButton.disabled = false;
  loginButton.textContent = 'Sign In';

  if (error) {
    console.error('Login error:', error);
    loginError.textContent = error.message;
    return;
  }

  if (data.user) {
    await showSignedIn(data.user);
  }
});

signOutBtn.addEventListener('click', async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Sign out error:', error);
    alert(error.message);
  }
});

const {
  data: { session },
  error: sessionError
} = await supabase.auth.getSession();

if (sessionError) {
  console.error('Session error:', sessionError);
}

if (session?.user) {
  await showSignedIn(session.user);
} else {
  showSignedOut();
}

supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event);

  if (event === 'SIGNED_OUT' || !session) {
    showSignedOut();
  }

  if (event === 'SIGNED_IN' && session?.user) {
    setTimeout(() => {
      showSignedIn(session.user);
    }, 0);
  }
});