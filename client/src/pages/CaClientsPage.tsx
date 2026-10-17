import InviteClientForm from "../features/caClients/InviteClientForm";
import ClientsTable from "../features/caClients/ClientsTable";
import { useListMyClientsQuery } from "../api/caClientsApi";
import ErrorBanner from "../components/ErrorBanner";

export default function CaClientsPage() {
  const { data, isLoading, error } = useListMyClientsQuery("ALL");

  return (
    <div className="page">
      <h1>My Clients</h1>
      <InviteClientForm />
      <div className="card">
        <h3>Client Status</h3>
        {isLoading && <p>Loading...</p>}
        <ErrorBanner error={error} />
        {data && <ClientsTable links={data} />}
      </div>
    </div>
  );
}
