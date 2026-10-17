import { useSearchParams } from "react-router-dom";
import { useListDraftsQuery } from "../api/emailAssistantApi";
import ErrorBanner from "../components/ErrorBanner";
import GenerateDraftForm from "../features/emailAssistant/GenerateDraftForm";
import DraftCard from "../features/emailAssistant/DraftCard";

export default function CaDraftsPage() {
  const [searchParams] = useSearchParams();
  const initialClientId = searchParams.get("clientId") ?? undefined;
  const { data, isLoading, error } = useListDraftsQuery();

  return (
    <div className="page">
      <h1>AI Email Reply Assistant</h1>
      <p className="muted">Drafts are AI-generated suggestions only — review and edit before sending manually.</p>
      <GenerateDraftForm initialClientId={initialClientId} />

      <h2>Drafts</h2>
      {isLoading && <p>Loading...</p>}
      <ErrorBanner error={error} />
      {data && data.length === 0 && <p className="muted">No drafts yet.</p>}
      {data?.map((draft) => (
        <DraftCard key={draft.id} draft={draft} />
      ))}
    </div>
  );
}
