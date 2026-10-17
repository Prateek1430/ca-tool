import type { ContractDetail } from "../../api/contractsApi";
import DisclaimerBanner from "../../components/DisclaimerBanner";

const RISK_CLASS: Record<string, string> = { LOW: "badge ok", MEDIUM: "badge warn", HIGH: "badge danger" };

export default function ContractDetailView({ contract }: { contract: ContractDetail }) {
  if (contract.status === "PROCESSING") {
    return <p>This contract is still being analyzed. Refresh in a moment.</p>;
  }
  if (contract.status === "FAILED") {
    return <p className="error-banner">Analysis failed for this contract. Please try re-uploading it.</p>;
  }

  const riskFindings = contract.findings.filter((f) => f.type === "RISK");
  const missingFindings = contract.findings.filter((f) => f.type === "MISSING");

  return (
    <div>
      <h2>{contract.filename}</h2>
      {contract.riskRating && (
        <p>
          Overall Risk: <span className={RISK_CLASS[contract.riskRating]}>{contract.riskRating}</span>
        </p>
      )}
      {contract.renewalDate && (
        <p>
          <strong>Renewal / Expiry Date:</strong> {new Date(contract.renewalDate).toLocaleDateString("en-IN")}
        </p>
      )}
      {contract.summary && (
        <>
          <h3>Plain-English Summary</h3>
          <p>{contract.summary.plainEnglishSummary}</p>
          <h3>Renewal Terms</h3>
          <p>{contract.summary.renewalInfo}</p>
          <h3>Conclusion</h3>
          <p>{contract.summary.conclusion}</p>
        </>
      )}

      <h3>Risk Clauses ({riskFindings.length})</h3>
      {riskFindings.length === 0 ? (
        <p className="muted">No specific risk clauses flagged.</p>
      ) : (
        <ul className="finding-list">
          {riskFindings.map((f) => (
            <li key={f.id}>
              <span className={RISK_CLASS[f.severity]}>{f.severity}</span> — "{f.text}"
              <div className="muted">{f.explanation}</div>
            </li>
          ))}
        </ul>
      )}

      <h3>Missing Standard Clauses ({missingFindings.length})</h3>
      {missingFindings.length === 0 ? (
        <p className="muted">No commonly-expected clauses appear to be missing.</p>
      ) : (
        <ul className="finding-list">
          {missingFindings.map((f) => (
            <li key={f.id}>
              <strong>{f.text}</strong>
              <div className="muted">{f.explanation}</div>
            </li>
          ))}
        </ul>
      )}

      {contract.summary?.truncated && (
        <p className="muted">Note: this document was long and only the first portion was analyzed.</p>
      )}
      {contract.summary && <DisclaimerBanner text={contract.summary.disclaimer} />}
    </div>
  );
}
