import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useUploadContractMutation } from "../../api/contractsApi";
import ErrorBanner from "../../components/ErrorBanner";

export default function UploadContract() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [upload, { isLoading, error }] = useUploadContractMutation();
  const navigate = useNavigate();

  async function handleFileChange() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("contract", file);
    const res = await upload(formData).unwrap().catch(() => null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (res) navigate(`/contracts/${res.id}`);
  }

  return (
    <div className="card">
      <h3>Upload Contract / Agreement</h3>
      <p className="muted">Supported: PDF or DOCX.</p>
      <input ref={fileInputRef} type="file" accept=".pdf,.docx" onChange={handleFileChange} disabled={isLoading} />
      {isLoading && <p>Uploading and analyzing (this can take a moment)...</p>}
      <ErrorBanner error={error} />
    </div>
  );
}
