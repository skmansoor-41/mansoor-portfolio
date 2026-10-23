import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const signInButton = document.getElementById("google-login-button");
const signOutButton = document.getElementById("google-logout-button");
const statusText = document.getElementById("login-status");
const setupNote = document.getElementById("login-setup-note");
const userPanel = document.getElementById("login-user");
const userName = document.getElementById("login-name");
const userEmail = document.getElementById("login-email");
const userAvatar = document.getElementById("login-avatar");
const title = document.getElementById("login-title");

const configured = firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("PASTE_") &&
  firebaseConfig.projectId && !firebaseConfig.projectId.startsWith("PASTE_") &&
  firebaseConfig.appId && !firebaseConfig.appId.startsWith("PASTE_");

if (!configured) {
  statusText.textContent = "Google sign-in is not active yet. The website owner needs to finish Firebase setup.";
} else {
  try {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    signInButton.disabled = false;
    setupNote.hidden = true;

    signInButton.addEventListener("click", async () => {
      signInButton.disabled = true;
      statusText.textContent = "Opening Google sign-in…";
      try {
        await signInWithPopup(auth, provider);
      } catch (error) {
        console.error("Google sign-in error:", error);
        statusText.textContent = error.code === "auth/popup-closed-by-user"
          ? "Sign-in was cancelled. You can try again."
          : "Could not sign in. Please check the Firebase Google provider and authorised domains.";
      } finally {
        signInButton.disabled = false;
      }
    });

    signOutButton.addEventListener("click", async () => {
      try {
        await signOut(auth);
      } catch (error) {
        console.error("Sign-out error:", error);
        statusText.textContent = "Sign-out failed. Please try again.";
      }
    });

    onAuthStateChanged(auth, user => {
      if (user) {
        title.textContent = "You're signed in";
        statusText.textContent = "Google account connected successfully.";
        userName.textContent = user.displayName || "Google user";
        userEmail.textContent = user.email || "";
        if (user.photoURL) {
          userAvatar.src = user.photoURL;
          userAvatar.hidden = false;
        } else {
          userAvatar.hidden = true;
        }
        userPanel.hidden = false;
        signInButton.hidden = true;
        signOutButton.hidden = false;
      } else {
        title.textContent = "Continue with Google";
        statusText.textContent = "Sign in securely using your Google account.";
        userPanel.hidden = true;
        signInButton.hidden = false;
        signOutButton.hidden = true;
      }
    });
  } catch (error) {
    console.error("Firebase initialisation error:", error);
    statusText.textContent = "Firebase could not be initialised. Please check the configuration.";
  }
}
