import { useParams, Link } from "react-router-dom";
import {
  useGetClientFinanceSummaryQuery,
  useGetClientInsightsQuery,
  useGetClientContractsQuery,
} from "../api/caClientsApi";
import ErrorBanner from "../components/ErrorBanner";
import SpendingSummaryView from "../features/finance/SpendingSummaryView";
import InsightsView from "../features/finance/InsightsView";
import ContractsList from "../features/contracts/ContractsList";

export default function CaClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const { data: summary, isLoading: summaryLoading, error: summaryError } = useGetClientFinanceSummaryQuery(
    clientId ?? "",
    { skip: !clientId }
  );
  const { data: insights, isLoading: insightsLoading, error: insightsError } = useGetClientInsightsQuery(
    clientId ?? "",
    { skip: !clientId }
  );
  const { data: contracts, isLoading: contractsLoading, error: contractsError } = useGetClientContractsQuery(
    clientId ?? "",
    { skip: !clientId }
  );

  return (
    <div className="page">
      <Link to="/ca/clients">← Back to clients</Link>
      <h1>Client Financial Overview</h1>
      <Link to={`/ca/drafts?clientId=${clientId}`} className="button-link">
        Draft an email reply for this client
      </Link>

      <div className="card">
        <h3>Spending Summary</h3>
        {summaryLoading && <p>Loading...</p>}
        <ErrorBanner error={summaryError} />
        {summary && <SpendingSummaryView data={summary} />}
      </div>

      <div className="card">
        <h3>AI Insights</h3>
        {insightsLoading && <p>Generating insights...</p>}
        <ErrorBanner error={insightsError} />
        {insights && <InsightsView data={insights} />}
      </div>

      <div className="card">
        <h3>Contracts</h3>
        {contractsLoading && <p>Loading...</p>}
        <ErrorBanner error={contractsError} />
        {contracts && <ContractsList contracts={contracts} linkPrefix={`/ca/clients/${clientId}/contracts`} />}
      </div>
    </div>
  );
}
