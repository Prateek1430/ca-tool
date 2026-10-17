import { useRef, useState } from "react";
import { useUploadStatementMutation } from "../../api/financeApi";
import ErrorBanner from "../../components/ErrorBanner";

export default function UploadStatement() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [upload, { isLoading, error }] = useUploadStatementMutation();
  const [result, setResult] = useState<string | null>(null);

  async function handleFileChange() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    setResult(null);
    const formData = new FormData();
    formData.append("statement", file);
    const res = await upload(formData).unwrap().catch(() => null);
    if (res) {
      setResult(
        `Imported ${res.transactionsImported} transaction(s) from ${res.bankFormat} format. ` +
          `Detected ${res.recurringMerchantsDetected} recurring merchant(s).` +
          (res.duplicatesSkipped > 0 ? ` Skipped ${res.duplicatesSkipped} duplicate transaction(s).` : "") +
          (res.warnings.length ? ` Warnings: ${res.warnings.join(" ")}` : "")
      );
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="card">
      <h3>Upload Bank / Credit Card / UPI Statement</h3>
      <p className="muted">Supported: CSV (HDFC, ICICI, SBI, generic UPI/credit-card exports) or PDF bank statements.</p>
      <input ref={fileInputRef} type="file" accept=".csv,.pdf" onChange={handleFileChange} disabled={isLoading} />
      {isLoading && <p>Uploading and analyzing...</p>}
      <ErrorBanner error={error} />
      {result && <p className="success-banner">{result}</p>}
    </div>
  );
}
