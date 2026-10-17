import { Link } from "react-router-dom";
import type { CaClientLink } from "../../api/caClientsApi";

const STATUS_CLASS: Record<string, string> = { PENDING: "badge warn", ACCEPTED: "badge ok", REVOKED: "badge danger" };

export default function ClientsTable({ links }: { links: CaClientLink[] }) {
  if (links.length === 0) return <p className="muted">No clients yet — send an invite above.</p>;

  return (
    <table className="simple-table">
      <thead>
        <tr>
          <th>Client</th>
          <th>Email</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {links.map((l) => (
          <tr key={l.id}>
            <td>{l.client?.name ?? "—"}</td>
            <td>{l.client?.email ?? "—"}</td>
            <td>
              <span className={STATUS_CLASS[l.status]}>{l.status}</span>
            </td>
            <td>{l.status === "ACCEPTED" && <Link to={`/ca/clients/${l.clientId}`}>View data</Link>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
