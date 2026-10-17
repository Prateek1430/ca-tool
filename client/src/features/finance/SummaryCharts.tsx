import { useGetSummaryQuery } from "../../api/financeApi";
import ErrorBanner from "../../components/ErrorBanner";
import SpendingSummaryView from "./SpendingSummaryView";

export default function SummaryCharts() {
  const { data, isLoading, error } = useGetSummaryQuery();

  if (isLoading) return <p>Loading summary...</p>;
  if (error) return <ErrorBanner error={error} />;
  if (!data || data.transactionCount === 0) {
    return <p className="muted">Upload a statement to see your spending summary.</p>;
  }

  return (
    <div className="card">
      <h3>Spending Overview</h3>
      <SpendingSummaryView data={data} />
    </div>
  );
}
