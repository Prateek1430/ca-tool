import { useState, type FormEvent } from "react";
import { useInviteClientMutation } from "../../api/caClientsApi";
import ErrorBanner from "../../components/ErrorBanner";

export default function InviteClientForm() {
  const [email, setEmail] = useState("");
  const [invite, { isLoading, error }] = useInviteClientMutation();
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSuccess(null);
    const result = await invite({ clientEmail: email }).unwrap().catch(() => null);
    if (result) {
      setSuccess(`Invite sent to ${email}. They must accept it before you can view their data.`);
      setEmail("");
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3>Invite a Client</h3>
      <p className="muted">The client must already have an account registered as an Individual user.</p>
      <div className="inline-form">
        <input
          type="email"
          placeholder="client@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Sending..." : "Send Invite"}
        </button>
      </div>
      <ErrorBanner error={error} />
      {success && <p className="success-banner">{success}</p>}
    </form>
  );
}
