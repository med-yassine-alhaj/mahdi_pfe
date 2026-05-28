import { useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../auth/AuthContext";
import { useTheme } from "../theme/ThemeContext";
import {
  FaHome, FaTruck, FaUserTie, FaMapMarkerAlt,
  FaSignOutAlt, FaUsers, FaUserPlus, FaRoute,
  FaCheckCircle, FaExclamationTriangle, FaTrash,
  FaSun, FaMoon,
} from "react-icons/fa";
import { HiLocationMarker } from "react-icons/hi";
import "./Sidebar.css";

const superviseurLinks = [
  { path: "/", icon: <FaHome />, label: "Dashboard" },
  { path: "/camions", icon: <FaTruck />, label: "Camions" },
  { path: "/agents", icon: <FaUserTie />, label: "Agents" },
  { path: "/pdc", icon: <FaMapMarkerAlt />, label: "Centres de Dépôt" },
  { path: "/tournees", icon: <FaRoute />, label: "Tournées" },
  { path: "/tracking", icon: <HiLocationMarker />, label: "Tracking" },
  { path: "/tournees/realisees", icon: <FaCheckCircle />, label: "Tournées Réalisées" },
  { path: "/incidents", icon: <FaExclamationTriangle />, label: "Incidents" },
];

const adminLinks = [
  { path: "/admin", icon: <FaHome />, label: "Dashboard" },
  { path: "/users", icon: <FaUsers />, label: "Utilisateurs" },
  { path: "/users/add", icon: <FaUserPlus />, label: "Ajouter Utilisateur" },
];

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const authContext = useContext(AuthContext)!;
  const { theme, toggleTheme } = useTheme();

  if (authContext.role === "_") return null;

  const links = authContext.role === "admin" ? adminLinks : superviseurLinks;
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <FaTrash className="brand-icon" />
        <span>WasteTrack</span>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-title">Navigation</div>
        {links.map((link) => (
          <div
            key={link.path}
            className={`sidebar-link ${isActive(link.path) ? "active" : ""}`}
            onClick={() => navigate(link.path)}
          >
            <span className="sidebar-icon">{link.icon}</span>
            <span>{link.label}</span>
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-link theme-toggle" onClick={toggleTheme}>
          <span className="sidebar-icon">
            {theme === "dark" ? <FaSun /> : <FaMoon />}
          </span>
          <span>{theme === "dark" ? "Mode Clair" : "Mode Sombre"}</span>
        </div>
        <div className="sidebar-link logout" onClick={() => authContext.logOut()}>
          <span className="sidebar-icon"><FaSignOutAlt /></span>
          <span>Déconnexion</span>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
