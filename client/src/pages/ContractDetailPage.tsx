import { useParams, Link } from "react-router-dom";
import { useGetContractQuery } from "../api/contractsApi";
import ErrorBanner from "../components/ErrorBanner";
import ContractDetailView from "../features/contracts/ContractDetailView";

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useGetContractQuery(id ?? "", { skip: !id });

  return (
    <div className="page">
      <Link to="/contracts">← Back to contracts</Link>
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
