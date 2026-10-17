import UploadContract from "../features/contracts/UploadContract";
import ContractsList from "../features/contracts/ContractsList";
import { useListContractsQuery } from "../api/contractsApi";
import ErrorBanner from "../components/ErrorBanner";
import DisclaimerBanner from "../components/DisclaimerBanner";

export default function ContractsPage() {
  const { data, isLoading, error } = useListContractsQuery();

  return (
    <div className="page">
      <h1>Contract Analyzer</h1>
      <DisclaimerBanner text="This is AI-generated guidance, not certified legal advice. Please have a qualified lawyer review important contracts." />
      <UploadContract />
      <div className="card">
        <h3>Your Contracts</h3>
        {isLoading && <p>Loading...</p>}
        <ErrorBanner error={error} />
        {data && <ContractsList contracts={data} linkPrefix="/contracts" />}
      </div>
    </div>
  );
}
