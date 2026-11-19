import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  onValue,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

// Add this website's Firebase web app configuration.
// Do not add ESP32 credentials or private service-account keys here.
const firebaseConfig = {
  apiKey: "AIzaSyDBu-iAarwIEwoc2VrdYQZrJ91i6jv9eJA",
  authDomain: "finalyearmidterm.firebaseapp.com",
  databaseURL: "https://finalyearmidterm-default-rtdb.firebaseio.com",
  projectId: "finalyearmidterm",
  storageBucket: "finalyearmidterm.firebasestorage.app",
  messagingSenderId: "505574271600",
  appId: "1:505574271600:web:2b78411b25e187e997e2b5",
  measurementId: "G-TR030R5XP3"
};


const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const stateRef = ref(database, "device/state");
const connectedRef = ref(database, ".info/connected");

const onButton = document.querySelector("#onButton");
const offButton = document.querySelector("#offButton");
const deviceStatus = document.querySelector("#deviceStatus");
const connectionBadge = document.querySelector("#connectionBadge");
const connectionText = document.querySelector("#connectionText");
const loader = document.querySelector("#loader");
const errorMessage = document.querySelector("#errorMessage");

let currentState = null;
let updateInProgress = false;

function setLoading(isLoading) {
  loader.classList.toggle("visible", isLoading);
  onButton.disabled = isLoading;
  offButton.disabled = isLoading;
}

function setConnectionState(state, message) {
  connectionBadge.className = `connection-badge ${state}`;
  connectionText.textContent = message;
}

function showError(message) {
  errorMessage.textContent = message;
}

function renderStatus(state) {
  currentState = typeof state === "boolean" ? state : null;

  if (currentState === null) {
    deviceStatus.textContent = "Unknown";
    deviceStatus.className = "device-status loading";
    showError("The value at /device/state must be a boolean.");
  } else {
    deviceStatus.textContent = currentState ? "ON" : "OFF";
    deviceStatus.className = `device-status ${currentState ? "on" : "off"}`;
  }

  setLoading(false);
  updateInProgress = false;
}

onValue(
  connectedRef,
  (snapshot) => {
    if (snapshot.val() === true) {
      setConnectionState("connected", "Firebase connected");
      showError("");
    } else {
      setConnectionState("connecting", "Connecting...");
    }
  },
  (error) => {
    setConnectionState("error", "Connection error");
    showError(`Firebase connection error: ${error.message}`);
    setLoading(false);
  },
);

onValue(
  stateRef,
  (snapshot) => {
    renderStatus(snapshot.val());
  },
  (error) => {
    setConnectionState("error", "Firebase error");
    showError(`Could not read /device/state: ${error.message}`);
    setLoading(false);
  },
);

async function updateDeviceState(nextState) {
  if (updateInProgress) {
    return;
  }

  if (currentState === nextState) {
    return;
  }

  updateInProgress = true;
  setLoading(true);
  showError("");

  try {
    await set(stateRef, nextState);
  } catch (error) {
    setConnectionState("error", "Update failed");
    showError(`Could not update device state: ${error.message}`);
  } finally {
    updateInProgress = false;
    setLoading(false);
  }
}

onButton.addEventListener("click", () => updateDeviceState(true));
offButton.addEventListener("click", () => updateDeviceState(false));
