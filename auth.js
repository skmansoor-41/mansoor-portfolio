import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword,
  linkWithCredential, EmailAuthProvider, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const $ = id => document.getElementById(id);
const googleButton = $("google-login-button");
const logoutButton = $("google-logout-button");
const statusText = $("login-status");
const setupNote = $("login-setup-note");
const userPanel = $("login-user");
const userName = $("login-name");
const userEmail = $("login-email");
const userAvatar = $("login-avatar");
const title = $("login-title");
const profileForm = $("profile-form");
const passwordLoginForm = $("password-login-form");
const passwordLoginPanel = $("password-login-panel");
const profilePanel = $("profile-panel");
const passwordPanel = $("password-panel");
const signedInPanel = $("signed-in-panel");

const configured = firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("PASTE_") &&
  firebaseConfig.projectId && !firebaseConfig.projectId.startsWith("PASTE_") &&
  firebaseConfig.appId && !firebaseConfig.appId.startsWith("PASTE_");

if (!configured) {
  statusText.textContent = "Sign-in is not active yet. The website owner needs to finish Firebase setup.";
} else {
  try {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    let currentUser = null;

    googleButton.disabled = false;
    setupNote.hidden = true;

    const show = (element, visible) => { element.hidden = !visible; };
    const setStatus = message => { statusText.textContent = message; };

    googleButton.addEventListener("click", async () => {
      googleButton.disabled = true;
      setStatus("Opening Google sign-in…");
      try {
        await signInWithPopup(auth, provider);
      } catch (error) {
        console.error("Google sign-in error:", error);
        setStatus(error.code === "auth/popup-closed-by-user"
          ? "Sign-in was cancelled. You can try again."
          : "Google sign-in failed. Check that Google is enabled in Firebase Authentication and this domain is authorised.");
      } finally {
        googleButton.disabled = false;
      }
    });

    passwordLoginForm.addEventListener("submit", async event => {
      event.preventDefault();
      const email = $("login-email-input").value.trim();
      const password = $("login-password-input").value;
      const button = passwordLoginForm.querySelector("button[type=submit]");
      button.disabled = true;
      setStatus("Signing in…");
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (error) {
        console.error("Password sign-in error:", error);
        setStatus(error.code === "auth/invalid-credential" || error.code === "auth/wrong-password" || error.code === "auth/user-not-found"
          ? "Email or password is incorrect."
          : "Could not sign in. Please try again.");
      } finally {
        button.disabled = false;
      }
    });

    profileForm.addEventListener("submit", async event => {
      event.preventDefault();
      if (!currentUser) return;
      const firstName = $("profile-first-name").value.trim();
      const secondName = $("profile-second-name").value.trim();
      const phone = $("profile-phone").value.trim();
      const gender = $("profile-gender").value;
      const dob = $("profile-dob").value;
      const password = $("profile-new-password").value;
      const confirmPassword = $("profile-confirm-password").value;

      if (!firstName || !secondName || !phone || !gender || !dob) {
        setStatus("Please complete all profile fields.");
        return;
      }
      if (!/^\\+?[0-9]{10,15}$/.test(phone.replace(/[\\s-]/g, ""))) {
        setStatus("Enter a valid phone number with 10 to 15 digits.");
        return;
      }
      if (password.length < 6) {
        setStatus("Your password must contain at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setStatus("The passwords do not match.");
        return;
      }

      const button = profileForm.querySelector("button[type=submit]");
      button.disabled = true;
      setStatus("Saving your profile securely…");
      try {
        const alreadyHasPassword = currentUser.providerData.some(item => item.providerId === "password");
        if (!alreadyHasPassword) {
          const credential = EmailAuthProvider.credential(currentUser.email, password);
          await linkWithCredential(currentUser, credential);
        }
        await setDoc(doc(db, "visitorProfiles", currentUser.uid), {
          uid: currentUser.uid,
          firstName, secondName, phone, gender, dateOfBirth: dob,
          email: currentUser.email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        profileForm.reset();
        setStatus("Your profile is saved. Next time, sign in with your email and password.");
      } catch (error) {
        console.error("Profile save error:", error);
        if (error.code === "auth/credential-already-in-use") {
          setStatus("This email already has a password login. Please sign out and use the email/password login.");
        } else if (error.code === "permission-denied" || error.code === "firestore/permission-denied") {
          setStatus("Your profile could not be saved because Firestore security rules need to be configured. Ask the website owner to finish the database setup.");
        } else {
          setStatus("Could not save your profile. Please try again.");
        }
      } finally {
        button.disabled = false;
      }
    });

    logoutButton.addEventListener("click", async () => {
      try { await signOut(auth); }
      catch (error) { console.error("Sign-out error:", error); setStatus("Sign-out failed. Please try again."); }
    });

    onAuthStateChanged(auth, async user => {
      currentUser = user;
      show(userPanel, !!user);
      show(logoutButton, !!user);
      show(googleButton, !user);
      show(passwordLoginPanel, !user);
      show(profilePanel, false);
      show(signedInPanel, false);

      if (!user) {
        title.textContent = "Sign in or create an account";
        setStatus("New here? Continue with Google to create your profile. Returning visitors can use email and password.");
        return;
      }

      userName.textContent = user.displayName || user.email || "Signed-in visitor";
      userEmail.textContent = user.email || "";
      if (user.photoURL) { userAvatar.src = user.photoURL; userAvatar.hidden = false; }
      else { userAvatar.hidden = true; }

      title.textContent = "Your visitor account";
      try {
        const profileSnapshot = await getDoc(doc(db, "visitorProfiles", user.uid));
        if (!profileSnapshot.exists()) {
          setStatus("Welcome! Please complete your profile and create a password for future sign-ins.");
          show(profilePanel, true);
          show(signedInPanel, false);
          $("profile-first-name").value = user.displayName ? user.displayName.split(" ")[0] : "";
          $("profile-second-name").value = user.displayName ? user.displayName.split(" ").slice(1).join(" ") : "";
        } else {
          const profile = profileSnapshot.data();
          setStatus("You're signed in. Your profile is saved.");
          show(signedInPanel, true);
          $("saved-profile-name").textContent = [profile.firstName, profile.secondName].filter(Boolean).join(" ");
          $("saved-profile-phone").textContent = profile.phone || "";
        }
      } catch (error) {
        console.error("Profile lookup error:", error);
        setStatus("Could not load your profile. Check that the Firestore database and security rules are configured.");
      }
    });
  } catch (error) {
    console.error("Firebase initialisation error:", error);
    statusText.textContent = "Firebase could not be initialised. Please check the web app configuration.";
  }
}
