import { NavLink } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { loggedOut } from "../features/auth/authSlice";

export default function NavBar() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="navbar-brand">AI CA Assistant</div>
      <div className="navbar-links">
        {user.role === "USER" && (
          <>
            <NavLink to="/dashboard">Finance Dashboard</NavLink>
            <NavLink to="/contracts">Contracts</NavLink>
            <NavLink to="/my-cas">My CAs</NavLink>
          </>
        )}
        {user.role === "CA" && (
          <>
            <NavLink to="/ca/clients">Clients</NavLink>
            <NavLink to="/ca/drafts">Email Drafts</NavLink>
          </>
        )}
      </div>
      <div className="navbar-user">
        <span>
          {user.name} ({user.role})
        </span>
        <button onClick={() => dispatch(loggedOut())}>Log out</button>
      </div>
    </nav>
  );
}
