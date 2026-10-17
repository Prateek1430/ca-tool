import { useGetAllInsightsQuery } from "../../api/financeApi";
import ErrorBanner from "../../components/ErrorBanner";
import InsightsView from "./InsightsView";

export default function InsightsPanel() {
  const { data, isLoading, error } = useGetAllInsightsQuery();

  if (isLoading) return <p>Generating AI insights...</p>;
  if (error) return <ErrorBanner error={error} />;
  if (!data) return null;

  return (
    <div className="card">
      <h3>AI Insights</h3>
      <InsightsView data={data} />
    </div>
  );
}
