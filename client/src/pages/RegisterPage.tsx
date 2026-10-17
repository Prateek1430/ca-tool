import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRegisterMutation } from "../api/authApi";
import { useAppDispatch } from "../app/hooks";
import { credentialsSet } from "../features/auth/authSlice";
import type { Role } from "../features/auth/authSlice";
import ErrorBanner from "../components/ErrorBanner";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("USER");
  const [register, { isLoading, error }] = useRegisterMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const result = await register({ name, email, password, role }).unwrap().catch(() => null);
    if (result) {
      dispatch(credentialsSet(result));
      navigate(result.user.role === "CA" ? "/ca/clients" : "/dashboard");
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Create an account</h1>
        <ErrorBanner error={error} />
        <label>
          Full name
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        <label>
          Account type
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="USER">Individual (Personal Finance + Contracts)</option>
            <option value="CA">Chartered Accountant</option>
          </select>
        </label>
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Creating account..." : "Register"}
        </button>
        <p>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
