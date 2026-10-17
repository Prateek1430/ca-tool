import UploadStatement from "../features/finance/UploadStatement";
import SummaryCharts from "../features/finance/SummaryCharts";
import InsightsPanel from "../features/finance/InsightsPanel";
import TransactionsTable from "../features/finance/TransactionsTable";
import DisclaimerBanner from "../components/DisclaimerBanner";

export default function FinanceDashboardPage() {
  return (
    <div className="page">
      <h1>Personal Finance Assistant</h1>
      <DisclaimerBanner text="This is AI-generated guidance, not certified financial/legal/tax advice. Please confirm important decisions with a qualified CA." />
      <UploadStatement />
      <SummaryCharts />
      <InsightsPanel />
      <TransactionsTable />
    </div>
  );
}
