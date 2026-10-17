import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLoginMutation } from "../api/authApi";
import { useAppDispatch } from "../app/hooks";
import { credentialsSet } from "../features/auth/authSlice";
import ErrorBanner from "../components/ErrorBanner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [login, { isLoading, error }] = useLoginMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const result = await login({ email, password }).unwrap().catch(() => null);
    if (result) {
      dispatch(credentialsSet(result));
      navigate(result.user.role === "CA" ? "/ca/clients" : "/dashboard");
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Log in</h1>
        <ErrorBanner error={error} />
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Logging in..." : "Log in"}
        </button>
        <p>
          No account? <Link to="/register">Register</Link>
        </p>
      </form>
    </div>
  );
}
