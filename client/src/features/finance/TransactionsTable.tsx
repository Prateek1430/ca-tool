import { useListTransactionsQuery } from "../../api/financeApi";
import ErrorBanner from "../../components/ErrorBanner";

export default function TransactionsTable() {
  const { data, isLoading, error } = useListTransactionsQuery();

  if (isLoading) return <p>Loading transactions...</p>;
  if (error) return <ErrorBanner error={error} />;
  if (!data || data.length === 0) return <p className="muted">No transactions yet.</p>;

  return (
    <div className="card">
      <h3>Recent Transactions</h3>
      <table className="simple-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Category</th>
            <th>Type</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 50).map((t) => (
            <tr key={t.id}>
              <td>{new Date(t.date).toLocaleDateString("en-IN")}</td>
              <td title={t.description}>
                {t.description.length > 40 ? `${t.description.slice(0, 40)}…` : t.description}
                {t.isRecurring && <span className="badge ok">recurring</span>}
              </td>
              <td>{t.category}</td>
              <td className={t.type === "CREDIT" ? "credit" : "debit"}>{t.type}</td>
              <td>₹{t.amount.toLocaleString("en-IN")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
