import { baseApi } from "./baseApi";
import type { SpendingSummary, AllInsights } from "./financeApi";
import type { ContractSummary, ContractDetail } from "./contractsApi";

export type LinkStatus = "PENDING" | "ACCEPTED" | "REVOKED";

export interface CaClientLink {
  id: string;
  caId: string;
  clientId: string;
  status: LinkStatus;
  invitedAt: string;
  respondedAt: string | null;
  ca?: { id: string; name: string; email: string };
  client?: { id: string; name: string; email: string };
}

export const caClientsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    inviteClient: builder.mutation<CaClientLink, { clientEmail: string }>({
      query: (body) => ({ url: "/ca-clients/invite", method: "POST", body }),
      invalidatesTags: ["CaClients"],
    }),
    listPendingInvites: builder.query<CaClientLink[], void>({
      query: () => "/ca-clients/invites",
      providesTags: ["CaClients"],
    }),
    acceptInvite: builder.mutation<CaClientLink, string>({
      query: (linkId) => ({ url: `/ca-clients/invites/${linkId}/accept`, method: "POST" }),
      invalidatesTags: ["CaClients"],
    }),
    declineInvite: builder.mutation<CaClientLink, string>({
      query: (linkId) => ({ url: `/ca-clients/invites/${linkId}/decline`, method: "POST" }),
      invalidatesTags: ["CaClients"],
    }),
    revokeLink: builder.mutation<CaClientLink, string>({
      query: (linkId) => ({ url: `/ca-clients/links/${linkId}/revoke`, method: "POST" }),
      invalidatesTags: ["CaClients"],
    }),
    listMyClients: builder.query<CaClientLink[], LinkStatus | "ALL" | undefined>({
      query: (status) => ({ url: "/ca-clients/clients", params: status ? { status } : undefined }),
      providesTags: ["CaClients"],
    }),
    listMyCas: builder.query<CaClientLink[], void>({
      query: () => "/ca-clients/mine",
      providesTags: ["CaClients"],
    }),
    getClientFinanceSummary: builder.query<SpendingSummary, string>({
      query: (clientId) => `/ca-clients/clients/${clientId}/finance-summary`,
    }),
    getClientInsights: builder.query<AllInsights, string>({
      query: (clientId) => `/ca-clients/clients/${clientId}/insights`,
    }),
    getClientContracts: builder.query<ContractSummary[], string>({
      query: (clientId) => `/ca-clients/clients/${clientId}/contracts`,
    }),
    getClientContractDetail: builder.query<ContractDetail, { clientId: string; contractId: string }>({
      query: ({ clientId, contractId }) => `/ca-clients/clients/${clientId}/contracts/${contractId}`,
    }),
  }),
});

export const {
  useInviteClientMutation,
  useListPendingInvitesQuery,
  useAcceptInviteMutation,
  useDeclineInviteMutation,
  useRevokeLinkMutation,
  useListMyClientsQuery,
  useListMyCasQuery,
  useGetClientFinanceSummaryQuery,
  useGetClientInsightsQuery,
  useGetClientContractsQuery,
  useGetClientContractDetailQuery,
} = caClientsApi;
