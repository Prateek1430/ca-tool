import { baseApi } from "./baseApi";

export interface EmailDraft {
  id: string;
  caId: string;
  clientId: string;
  originalEmail: string;
  draftReply: string;
  status: "DRAFT" | "EDITED" | "SENT";
  createdAt: string;
  client?: { id: string; name: string; email: string };
}

export const emailAssistantApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    generateDraft: builder.mutation<EmailDraft, { clientId: string; originalEmail: string }>({
      query: (body) => ({ url: "/email-assistant/draft", method: "POST", body }),
      invalidatesTags: ["Drafts"],
    }),
    listDrafts: builder.query<EmailDraft[], void>({
      query: () => "/email-assistant",
      providesTags: ["Drafts"],
    }),
    updateDraft: builder.mutation<EmailDraft, { id: string; draftReply: string }>({
      query: ({ id, draftReply }) => ({ url: `/email-assistant/${id}`, method: "PATCH", body: { draftReply } }),
      invalidatesTags: ["Drafts"],
    }),
    markSent: builder.mutation<EmailDraft, string>({
      query: (id) => ({ url: `/email-assistant/${id}/mark-sent`, method: "POST" }),
      invalidatesTags: ["Drafts"],
    }),
  }),
});

export const { useGenerateDraftMutation, useListDraftsQuery, useUpdateDraftMutation, useMarkSentMutation } =
  emailAssistantApi;
