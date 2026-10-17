import { useState } from "react";
import type { AllInsights } from "../../api/financeApi";
import DisclaimerBanner from "../../components/DisclaimerBanner";

type Tab = "leaks" | "subscriptions" | "tax" | "budget" | "forecast";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "leaks", label: "Money Leaks" },
  { key: "subscriptions", label: "Subscriptions" },
  { key: "tax", label: "Tax Saving" },
  { key: "budget", label: "Budget" },
  { key: "forecast", label: "Forecast" },
];

export default function InsightsView({ data }: { data: AllInsights }) {
  const [tab, setTab] = useState<Tab>("leaks");

  return (
    <div>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? "tab active" : "tab"} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "leaks" && (
        <div>
          <p>{data.moneyLeaks.summary}</p>
          <p>
            <strong>Estimated monthly leak: ₹{data.moneyLeaks.totalMonthlyLeakEstimate.toLocaleString("en-IN")}</strong>
          </p>
          <ul className="finding-list">
            {data.moneyLeaks.leaks.map((l, i) => (
              <li key={i}>
                <strong>{l.merchant}</strong> ({l.category}) — ₹{l.monthlyImpact}/mo
                <div className="muted">{l.explanation}</div>
                <div>{l.recommendation}</div>
              </li>
            ))}
          </ul>
          <DisclaimerBanner text={data.moneyLeaks.disclaimer} />
        </div>
      )}

      {tab === "subscriptions" && (
        <div>
          <p>{data.subscriptions.summary}</p>
          <p>
            <strong>Total active monthly cost: ₹{data.subscriptions.totalMonthlyCost.toLocaleString("en-IN")}</strong>
          </p>
          <ul className="finding-list">
            {data.subscriptions.subscriptions.map((s) => (
              <li key={s.id}>
                <strong>{s.merchant}</strong> — ₹{s.amount} / {s.frequency}{" "}
                <span className={s.status === "LIKELY_UNUSED" ? "badge warn" : "badge ok"}>{s.status}</span>
              </li>
            ))}
          </ul>
          {data.subscriptions.recommendations.length > 0 && (
            <>
              <h4>Recommendations</h4>
              <ul className="finding-list">
                {data.subscriptions.recommendations.map((r, i) => (
                  <li key={i}>
                    <strong>{r.merchant}</strong>: {r.advice}
                  </li>
                ))}
              </ul>
            </>
          )}
          <DisclaimerBanner text={data.subscriptions.disclaimer} />
        </div>
      )}

      {tab === "tax" && (
        <div>
          <p>{data.tax.summary}</p>
          <ul className="finding-list">
            {data.tax.suggestions.map((s, i) => (
              <li key={i}>
                <strong>{s.section}</strong> — {s.observation}
                <div>{s.suggestion}</div>
                <div className="muted">Limit: {s.estimatedAnnualLimit}</div>
              </li>
            ))}
          </ul>
          <DisclaimerBanner text={`${data.tax.regimeNote} ${data.tax.disclaimer}`} />
        </div>
      )}

      {tab === "budget" && (
        <div>
          <p>{data.budget.summary}</p>
          <ul className="finding-list">
            {data.budget.budgets.map((b, i) => (
              <li key={i}>
                <strong>{b.category}</strong>: ₹{b.recommendedMonthlyBudget.toLocaleString("en-IN")}/mo
                <div className="muted">{b.reasoning}</div>
              </li>
            ))}
          </ul>
          <DisclaimerBanner text={data.budget.disclaimer} />
        </div>
      )}

      {tab === "forecast" && (
        <div>
          <p>{data.forecast.commentary}</p>
          <table className="simple-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Projected Income</th>
                <th>Projected Expense</th>
                <th>Projected Savings</th>
              </tr>
            </thead>
            <tbody>
              {data.forecast.forecast.map((f) => (
                <tr key={f.month}>
                  <td>{f.month}</td>
                  <td>₹{f.projectedIncome.toLocaleString("en-IN")}</td>
                  <td>₹{f.projectedExpense.toLocaleString("en-IN")}</td>
                  <td>₹{f.projectedSavings.toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <DisclaimerBanner text={data.forecast.disclaimer} />
        </div>
      )}
    </div>
  );
}
