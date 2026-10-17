import { baseApi } from "./baseApi";

export interface ContractSummary {
  id: string;
  filename: string;
  uploadedAt: string;
  status: "PROCESSING" | "ANALYZED" | "FAILED";
  riskRating: "LOW" | "MEDIUM" | "HIGH" | null;
  renewalDate: string | null;
}

export interface ContractFinding {
  id: string;
  type: "RISK" | "MISSING";
  text: string;
  explanation: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
}

export interface ContractDetail extends ContractSummary {
  summary: {
    plainEnglishSummary: string;
    conclusion: string;
    renewalInfo: string;
    disclaimer: string;
    aiGenerated: boolean;
    truncated: boolean;
  } | null;
  findings: ContractFinding[];
}

export const contractsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    uploadContract: builder.mutation<ContractDetail, FormData>({
      query: (body) => ({ url: "/contracts/upload", method: "POST", body }),
      invalidatesTags: ["Contracts"],
    }),
    listContracts: builder.query<ContractSummary[], void>({
      query: () => "/contracts",
      providesTags: ["Contracts"],
    }),
    getContract: builder.query<ContractDetail, string>({
      query: (id) => `/contracts/${id}`,
      providesTags: (_result, _err, id) => [{ type: "Contracts" as const, id }],
    }),
  }),
});

export const { useUploadContractMutation, useListContractsQuery, useGetContractQuery } = contractsApi;
