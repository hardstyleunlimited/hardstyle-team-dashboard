import { supabase } from './supabase.js';


// =========================
// ELEMENTS
// =========================

const loginScreen =
  document.getElementById('loginScreen');

const dashboardApp =
  document.getElementById('dashboardApp');

const loginEmail =
  document.getElementById('loginEmail');

const loginPassword =
  document.getElementById('loginPassword');

const loginBtn =
  document.getElementById('loginBtn');

const loginMessage =
  document.getElementById('loginMessage');

const logoutBtn =
  document.getElementById('logoutBtn');


// =========================
// SHOW LOGGED OUT
// =========================

function showLoggedOut() {

  if (loginScreen) {
    loginScreen.style.display = 'flex';
  }

  if (dashboardApp) {
    dashboardApp.style.display = 'none';
  }

  if (loginPassword) {
    loginPassword.value = '';
  }

}


// =========================
// SHOW LOGGED IN
// =========================

async function showLoggedIn(user) {

  if (loginScreen) {
    loginScreen.style.display = 'none';
  }

  if (dashboardApp) {
    dashboardApp.style.display = 'block';
  }


  console.log(
    'Logged in user:',
    user.email
  );


  // Refresh dashboard modules
  // after authentication.

  if (
    typeof window.refreshHardstyleCalendar ===
    'function'
  ) {

    await window
      .refreshHardstyleCalendar();

  }


  if (
    typeof window.refreshHardstyleContacts ===
    'function'
  ) {

    await window
      .refreshHardstyleContacts();

  }

}


// =========================
// LOGIN
// =========================

async function login() {

  const email =
    loginEmail.value
      .trim();

  const password =
    loginPassword.value;


  if (!email) {

    loginMessage.textContent =
      'Please enter your email.';

    return;
  }


  if (!password) {

    loginMessage.textContent =
      'Please enter your password.';

    return;
  }


  loginBtn.disabled =
    true;

  loginBtn.textContent =
    'Logging In...';

  loginMessage.textContent =
    '';


  try {

    const {
      data,
      error
    } =
      await supabase.auth
        .signInWithPassword({

          email:
            email,

          password:
            password

        });


    if (error) {
      throw error;
    }


    if (!data.user) {

      throw new Error(
        'Login failed.'
      );

    }


    console.log(
      'Login successful:',
      data.user.email
    );


    await showLoggedIn(
      data.user
    );


  } catch (error) {

    console.error(
      'Login error:',
      error
    );


    loginMessage.textContent =
      error.message ||
      'Unable to log in.';


  } finally {

    loginBtn.disabled =
      false;

    loginBtn.textContent =
      'Log In';

  }

}


// =========================
// LOG OUT
// =========================

async function logout() {

  try {

    const {
      error
    } =
      await supabase.auth
        .signOut();


    if (error) {
      throw error;
    }


    showLoggedOut();


  } catch (error) {

    console.error(
      'Logout error:',
      error
    );

    alert(
      error.message ||
      'Unable to log out.'
    );

  }

}


// =========================
// BUTTON EVENTS
// =========================

loginBtn
  ?.addEventListener(
    'click',
    login
  );


logoutBtn
  ?.addEventListener(
    'click',
    logout
  );


// Allow ENTER to log in

loginPassword
  ?.addEventListener(
    'keydown',
    (event) => {

      if (
        event.key ===
        'Enter'
      ) {

        login();

      }

    }
  );


loginEmail
  ?.addEventListener(
    'keydown',
    (event) => {

      if (
        event.key ===
        'Enter'
      ) {

        login();

      }

    }
  );


// =========================
// CHECK EXISTING SESSION
// =========================

async function checkSession() {

  const {
    data: {
      session
    },
    error
  } =
    await supabase.auth
      .getSession();


  if (error) {

    console.error(
      'Session check error:',
      error
    );

    showLoggedOut();

    return;

  }


  if (
    session?.user
  ) {

    console.log(
      'Existing session:',
      session.user.email
    );


    await showLoggedIn(
      session.user
    );


  } else {

    showLoggedOut();

  }

}


// =========================
// WATCH AUTH CHANGES
// =========================

supabase.auth
  .onAuthStateChange(
    async (
      event,
      session
    ) => {

      console.log(
        'Auth event:',
        event
      );


      if (
        event ===
        'SIGNED_OUT'
      ) {

        showLoggedOut();

        return;

      }


      if (
        session?.user
      ) {

        await showLoggedIn(
          session.user
        );

      }

    }
  );


// =========================
// START
// =========================

checkSession();