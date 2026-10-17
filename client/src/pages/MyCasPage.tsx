import {
  useListPendingInvitesQuery,
  useAcceptInviteMutation,
  useDeclineInviteMutation,
  useListMyCasQuery,
  useRevokeLinkMutation,
} from "../api/caClientsApi";
import ErrorBanner from "../components/ErrorBanner";

export default function MyCasPage() {
  const { data: invites, isLoading: invitesLoading, error: invitesError } = useListPendingInvitesQuery();
  const { data: cas, isLoading: casLoading, error: casError } = useListMyCasQuery();
  const [accept, { isLoading: accepting }] = useAcceptInviteMutation();
  const [decline, { isLoading: declining }] = useDeclineInviteMutation();
  const [revoke, { isLoading: revoking }] = useRevokeLinkMutation();

  return (
    <div className="page">
      <h1>My Chartered Accountants</h1>

      <div className="card">
        <h3>Pending Invites</h3>
        {invitesLoading && <p>Loading...</p>}
        <ErrorBanner error={invitesError} />
        {invites && invites.length === 0 && <p className="muted">No pending invites.</p>}
        {invites && invites.length > 0 && (
          <ul className="finding-list">
            {invites.map((inv) => (
              <li key={inv.id}>
                <strong>{inv.ca?.name}</strong> ({inv.ca?.email}) wants to be your CA.
                <div className="inline-form" style={{ marginTop: 8 }}>
                  <button disabled={accepting} onClick={() => accept(inv.id)}>
                    Accept
                  </button>
                  <button disabled={declining} onClick={() => decline(inv.id)} className="secondary">
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h3>Your CAs</h3>
        {casLoading && <p>Loading...</p>}
        <ErrorBanner error={casError} />
        {cas && cas.length === 0 && <p className="muted">You haven't accepted any CA yet.</p>}
        {cas && cas.length > 0 && (
          <ul className="finding-list">
            {cas.map((link) => (
              <li key={link.id}>
                <div>
                  <strong>{link.ca?.name}</strong> — {link.ca?.email}
                </div>
                <div className="inline-form" style={{ marginTop: 8 }}>
                  <button
                    disabled={revoking}
                    onClick={() => {
                      if (confirm(`Revoke ${link.ca?.name}'s access to your finance and contract data?`)) {
                        revoke(link.id);
                      }
                    }}
                    className="secondary"
                  >
                    Revoke Access
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
