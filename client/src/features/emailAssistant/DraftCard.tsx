import { useState } from "react";
import type { EmailDraft } from "../../api/emailAssistantApi";
import { useUpdateDraftMutation, useMarkSentMutation } from "../../api/emailAssistantApi";

const STATUS_CLASS: Record<string, string> = { DRAFT: "badge warn", EDITED: "badge ok", SENT: "badge ok" };

export default function DraftCard({ draft }: { draft: EmailDraft }) {
  const [text, setText] = useState(draft.draftReply);
  const [editing, setEditing] = useState(false);
  const [updateDraft, { isLoading: saving }] = useUpdateDraftMutation();
  const [markSent, { isLoading: marking }] = useMarkSentMutation();

  async function handleSave() {
    await updateDraft({ id: draft.id, draftReply: text }).unwrap().catch(() => null);
    setEditing(false);
  }

  return (
    <div className="card">
      <div className="draft-header">
        <strong>{draft.client?.name ?? draft.clientId}</strong>
        <span className={STATUS_CLASS[draft.status]}>{draft.status}</span>
      </div>
      <p className="muted">Original: {draft.originalEmail.slice(0, 160)}{draft.originalEmail.length > 160 ? "…" : ""}</p>

      {editing ? (
        <textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} />
      ) : (
        <pre className="draft-reply">{draft.draftReply}</pre>
      )}

      <div className="inline-form">
        {editing ? (
          <button disabled={saving} onClick={handleSave}>
            {saving ? "Saving..." : "Save Edit"}
          </button>
        ) : (
          <button onClick={() => setEditing(true)}>Edit</button>
        )}
        {draft.status !== "SENT" && (
          <button disabled={marking} onClick={() => markSent(draft.id)} className="secondary">
            {marking ? "Marking..." : "Mark as Sent"}
          </button>
        )}
      </div>
      <p className="muted">
        This app never sends email automatically — copy this draft into your own email client after review.
      </p>
    </div>
  );
}
