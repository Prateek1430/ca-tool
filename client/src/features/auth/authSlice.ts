import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type Role = "USER" | "CA";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
}

const storedToken = localStorage.getItem("ca_tool_token");
const storedUser = localStorage.getItem("ca_tool_user");

const initialState: AuthState = {
  token: storedToken,
  user: storedUser ? (JSON.parse(storedUser) as AuthUser) : null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    credentialsSet(state, action: PayloadAction<{ token: string; user: AuthUser }>) {
      state.token = action.payload.token;
      state.user = action.payload.user;
      localStorage.setItem("ca_tool_token", action.payload.token);
      localStorage.setItem("ca_tool_user", JSON.stringify(action.payload.user));
    },
    loggedOut(state) {
      state.token = null;
      state.user = null;
      localStorage.removeItem("ca_tool_token");
      localStorage.removeItem("ca_tool_user");
    },
  },
});

export const { credentialsSet, loggedOut } = authSlice.actions;
export default authSlice.reducer;
