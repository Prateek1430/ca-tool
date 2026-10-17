import { Link } from "react-router-dom";
import type { ContractSummary } from "../../api/contractsApi";

interface Props {
  contracts: ContractSummary[];
  linkPrefix: string;
}

const RISK_CLASS: Record<string, string> = { LOW: "badge ok", MEDIUM: "badge warn", HIGH: "badge danger" };

export default function ContractsList({ contracts, linkPrefix }: Props) {
  if (contracts.length === 0) return <p className="muted">No contracts uploaded yet.</p>;

  return (
    <table className="simple-table">
      <thead>
        <tr>
          <th>Filename</th>
          <th>Uploaded</th>
          <th>Status</th>
          <th>Risk</th>
          <th>Renewal Date</th>
        </tr>
      </thead>
      <tbody>
        {contracts.map((c) => (
          <tr key={c.id}>
            <td>
              <Link to={`${linkPrefix}/${c.id}`}>{c.filename}</Link>
            </td>
            <td>{new Date(c.uploadedAt).toLocaleDateString("en-IN")}</td>
            <td>{c.status}</td>
            <td>{c.riskRating && <span className={RISK_CLASS[c.riskRating]}>{c.riskRating}</span>}</td>
            <td>{c.renewalDate ? new Date(c.renewalDate).toLocaleDateString("en-IN") : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
