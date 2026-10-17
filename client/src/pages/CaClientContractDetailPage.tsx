import { useParams, Link } from "react-router-dom";
import { useGetClientContractDetailQuery } from "../api/caClientsApi";
import ErrorBanner from "../components/ErrorBanner";
import ContractDetailView from "../features/contracts/ContractDetailView";

export default function CaClientContractDetailPage() {
  const { clientId, contractId } = useParams<{ clientId: string; contractId: string }>();
  const { data, isLoading, error } = useGetClientContractDetailQuery(
    { clientId: clientId ?? "", contractId: contractId ?? "" },
    { skip: !clientId || !contractId }
  );

  return (
    <div className="page">
      <Link to={`/ca/clients/${clientId}`}>← Back to client</Link>
      {isLoading && <p>Loading...</p>}
      <ErrorBanner error={error} />
      {data && (
        <div className="card">
          <ContractDetailView contract={data} />
        </div>
      )}
    </div>
  );
}
