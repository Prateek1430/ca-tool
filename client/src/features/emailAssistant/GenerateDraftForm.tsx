import { useState, type FormEvent } from "react";
import { useListMyClientsQuery } from "../../api/caClientsApi";
import { useGenerateDraftMutation } from "../../api/emailAssistantApi";
import ErrorBanner from "../../components/ErrorBanner";

export default function GenerateDraftForm({ initialClientId }: { initialClientId?: string }) {
  const { data: clients } = useListMyClientsQuery("ACCEPTED");
  const [clientId, setClientId] = useState(initialClientId ?? "");
  const [originalEmail, setOriginalEmail] = useState("");
  const [generate, { isLoading, error }] = useGenerateDraftMutation();
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSuccess(false);
    const result = await generate({ clientId, originalEmail }).unwrap().catch(() => null);
    if (result) {
      setSuccess(true);
      setOriginalEmail("");
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3>Draft a Reply</h3>
      <label>
        Client
        <select value={clientId} onChange={(e) => setClientId(e.target.value)} required>
          <option value="" disabled>
            Select a client
          </option>
          {clients?.map((link) => (
            <option key={link.clientId} value={link.clientId}>
              {link.client?.name} ({link.client?.email})
            </option>
          ))}
        </select>
      </label>
      <label>
        Client's original email
        <textarea
          rows={5}
          value={originalEmail}
          onChange={(e) => setOriginalEmail(e.target.value)}
          required
          placeholder="Paste the client's email here..."
        />
      </label>
      <button type="submit" disabled={isLoading || !clientId}>
        {isLoading ? "Generating draft..." : "Generate AI Draft"}
      </button>
      <ErrorBanner error={error} />
      {success && <p className="success-banner">Draft generated below. Review and edit before sending.</p>}
    </form>
  );
}
