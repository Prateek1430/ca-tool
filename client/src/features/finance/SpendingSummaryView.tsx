import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import type { SpendingSummary } from "../../api/financeApi";

const COLORS = ["#4f46e5", "#059669", "#d97706", "#dc2626", "#0891b2", "#7c3aed", "#db2777", "#65a30d", "#ea580c"];

export default function SpendingSummaryView({ data }: { data: SpendingSummary }) {
  if (data.transactionCount === 0) {
    return <p className="muted">No statements uploaded yet.</p>;
  }

  return (
    <div>
      <div className="summary-stats">
        <div>
          <span className="stat-label">Total Income</span>
          <span className="stat-value">₹{data.totalIncome.toLocaleString("en-IN")}</span>
        </div>
        <div>
          <span className="stat-label">Total Expense</span>
          <span className="stat-value">₹{data.totalExpense.toLocaleString("en-IN")}</span>
        </div>
        <div>
          <span className="stat-label">Savings Rate</span>
          <span className="stat-value">{Math.round(data.savingsRate * 100)}%</span>
        </div>
      </div>

      <div className="chart-row">
        <div className="chart-box">
          <h4>Spending by Category</h4>
          {data.spendingByCategory.length === 0 ? (
            <p className="muted">No expense categories yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={data.spendingByCategory} dataKey="amount" nameKey="category" outerRadius={90} label>
                  {data.spendingByCategory.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => (typeof v === "number" ? `₹${v.toLocaleString("en-IN")}` : String(v))} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-box">
          <h4>Monthly Trend</h4>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(v) => (typeof v === "number" ? `₹${v.toLocaleString("en-IN")}` : String(v))} />
              <Legend />
              <Line type="monotone" dataKey="income" stroke="#059669" name="Income" />
              <Line type="monotone" dataKey="expense" stroke="#dc2626" name="Expense" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
