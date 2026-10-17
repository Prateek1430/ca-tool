import { baseApi } from "./baseApi";
import type { AuthUser, Role } from "../features/auth/authSlice";

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    register: builder.mutation<AuthResponse, { email: string; password: string; name: string; role: Role }>({
      query: (body) => ({ url: "/auth/register", method: "POST", body }),
    }),
    login: builder.mutation<AuthResponse, { email: string; password: string }>({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
    }),
    me: builder.query<AuthUser, void>({
      query: () => "/auth/me",
      providesTags: ["Me"],
    }),
  }),
});

export const { useRegisterMutation, useLoginMutation, useMeQuery } = authApi;
