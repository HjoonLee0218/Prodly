import { useEffect, useState } from "react";

function App() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const response = await fetch("/api/status");
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        const data = await response.json();
        setStatus(data);
      } catch (fetchError) {
        setError(fetchError.message);
      }
    }

    fetchStatus();
  }, []);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>Prodly React Frontend</h1>
      {status && (
        <section>
          <p>Backend status: {status.status}</p>
          <p>Message: {status.message}</p>
        </section>
      )}
      {error && (
        <section>
          <p>Failed to reach backend.</p>
          <pre>{error}</pre>
        </section>
      )}
      {!status && !error && <p>Loading backend status...</p>}
    </main>
  );
}

export default App;
