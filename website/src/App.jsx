import { useEffect, useRef, useState } from "react";
import { off, onValue, ref, set } from "firebase/database";
import { database } from "./firebase";

function App() {
  const [currentState, setCurrentState] = useState(null);
  const [connection, setConnection] = useState({
    kind: "connecting",
    text: "Connecting...",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const updateInProgress = useRef(false);

  useEffect(() => {
    const stateRef = ref(database, "device/state");
    const connectedRef = ref(database, ".info/connected");

    const unsubscribeConnection = onValue(
      connectedRef,
      (snapshot) => {
        if (snapshot.val() === true) {
          setConnection({ kind: "connected", text: "Firebase connected" });
          setError("");
        } else {
          setConnection({ kind: "connecting", text: "Connecting..." });
        }
      },
      (firebaseError) => {
        setConnection({ kind: "error", text: "Connection error" });
        setError(`Firebase connection error: ${firebaseError.message}`);
        setLoading(false);
      },
    );

    const unsubscribeState = onValue(
      stateRef,
      (snapshot) => {
        const value = snapshot.val();
        setCurrentState(typeof value === "boolean" ? value : null);
        setLoading(false);
        updateInProgress.current = false;

        if (typeof value !== "boolean") {
          setError("The value at /device/state must be a boolean.");
        }
      },
      (firebaseError) => {
        setConnection({ kind: "error", text: "Firebase error" });
        setError(`Could not read /device/state: ${firebaseError.message}`);
        setLoading(false);
      },
    );

    return () => {
      off(connectedRef);
      off(stateRef);
      unsubscribeConnection();
      unsubscribeState();
    };
  }, []);

  async function updateDeviceState(nextState) {
    if (updateInProgress.current || currentState === nextState) {
      return;
    }

    updateInProgress.current = true;
    setLoading(true);
    setError("");

    try {
      await set(ref(database, "device/state"), nextState);
    } catch (firebaseError) {
      setConnection({ kind: "error", text: "Update failed" });
      setError(`Could not update device state: ${firebaseError.message}`);
      setLoading(false);
      updateInProgress.current = false;
    }
  }

  const statusText =
    currentState === null ? "Unknown" : currentState ? "ON" : "OFF";

  return (
    <main className="dashboard">
      <section className="card" aria-labelledby="dashboard-title">
        <div className="header">
          <div>
            <p className="eyebrow">IoT Dashboard</p>
            <h1 id="dashboard-title">Device Control</h1>
          </div>
          <span className={`connection-badge ${connection.kind}`}>
            <span className="dot"></span>
            <span>{connection.text}</span>
          </span>
        </div>

        <div className="status-panel" aria-live="polite">
          <span className="status-label">Current status</span>
          <strong
            className={`device-status ${
              currentState === null ? "loading" : currentState ? "on" : "off"
            }`}
          >
            {loading && currentState === null ? "Loading" : statusText}
          </strong>
        </div>

        {loading && (
          <div className="loader" role="status" aria-label="Loading">
            <span></span>
          </div>
        )}

        <div className="controls">
          <button
            className="control-button on"
            type="button"
            disabled={loading}
            onClick={() => updateDeviceState(true)}
          >
            Turn ON
          </button>
          <button
            className="control-button off"
            type="button"
            disabled={loading}
            onClick={() => updateDeviceState(false)}
          >
            Turn OFF
          </button>
        </div>

        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}

export default App;
