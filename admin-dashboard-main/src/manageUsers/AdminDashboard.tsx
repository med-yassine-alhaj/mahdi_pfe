import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { databaseClient } from "../firebaseConfig";
import { FaUsers, FaUserTie, FaTruck, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { CiUser } from "react-icons/ci";
import { PiTruckThin } from "react-icons/pi";
import { Container } from "react-bootstrap";
import "./AdminDashboard.css";

type Agent = {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
};

type Camion = {
  matricule: string;
  marque: string;
  modele: string;
  annee?: number;
};

type Supervisor = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  ville: { nom: string };
  agents: Agent[];
  camions: Camion[];
};

// ─── Supervisor card ─────────────────────────────────────────────────────────

const SupervisorCard = ({ sup }: { sup: Supervisor }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="adm-sup-card">
      {/* Header */}
      <div className="adm-sup-header">
        <div className="adm-sup-avatar">
          <CiUser size={24} />
        </div>
        <div className="adm-sup-info">
          <div className="adm-sup-name">
            {sup.nom} {sup.prenom}
          </div>
          <div className="adm-sup-email">{sup.email}</div>
          {sup.ville?.nom && (
            <div className="adm-sup-ville">📍 {sup.ville.nom}</div>
          )}
        </div>
        <div className="adm-sup-badges">
          <span className="adm-badge adm-badge-agent">
            <FaUserTie size={11} />
            {sup.agents.length} agent{sup.agents.length !== 1 ? "s" : ""}
          </span>
          <span className="adm-badge adm-badge-camion">
            <FaTruck size={11} />
            {sup.camions.length} camion{sup.camions.length !== 1 ? "s" : ""}
          </span>
        </div>
        <button
          className="adm-expand-btn"
          onClick={() => setExpanded((v) => !v)}
          title={expanded ? "Réduire" : "Voir détails"}
        >
          {expanded ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="adm-sup-details">
          {/* Agents column */}
          <div className="adm-detail-section">
            <div className="adm-detail-title">
              <FaUserTie className="adm-detail-icon adm-icon-agent" />
              Agents ({sup.agents.length})
            </div>
            {sup.agents.length === 0 ? (
              <div className="adm-detail-empty">Aucun agent</div>
            ) : (
              <div className="adm-detail-list">
                {sup.agents.map((a, i) => (
                  <div className="adm-detail-row" key={i}>
                    <div className="adm-detail-row-icon">
                      <CiUser size={16} />
                    </div>
                    <div>
                      <div className="adm-detail-row-main">
                        {a.nom} {a.prenom}
                      </div>
                      <div className="adm-detail-row-sub">{a.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Camions column */}
          <div className="adm-detail-section">
            <div className="adm-detail-title">
              <PiTruckThin className="adm-detail-icon adm-icon-camion" size={17} />
              Camions ({sup.camions.length})
            </div>
            {sup.camions.length === 0 ? (
              <div className="adm-detail-empty">Aucun camion</div>
            ) : (
              <div className="adm-detail-list">
                {sup.camions.map((c, i) => (
                  <div className="adm-detail-row" key={i}>
                    <div className="adm-detail-row-icon">
                      <PiTruckThin size={16} />
                    </div>
                    <div>
                      <div className="adm-detail-row-main">{c.matricule}</div>
                      <div className="adm-detail-row-sub">
                        {c.marque} {c.modele}
                        {c.annee ? ` — ${c.annee}` : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Admin dashboard page ─────────────────────────────────────────────────────

export const AdminDashboard = () => {
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const snap = await getDocs(collection(databaseClient, "users"));
        const sups: Supervisor[] = snap.docs
          .filter((d) => d.data().role !== "admin")
          .map((d) => {
            const data = d.data();
            return {
              id: data.id || d.id,
              nom: data.nom || "",
              prenom: data.prenom || "",
              email: data.email || "",
              ville: data.ville || { nom: "" },
              agents: (data.agents as Agent[]) || [],
              camions: (data.camions as Camion[]) || [],
            };
          });
        setSupervisors(sups);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const totalAgents = supervisors.reduce((s, sup) => s + sup.agents.length, 0);
  const totalCamions = supervisors.reduce((s, sup) => s + sup.camions.length, 0);

  return (
    <Container fluid className="adm-page mt-4">
      {/* Header */}
      <div className="adm-header">
        <div>
          <h2 className="adm-title">Tableau de bord — Administration</h2>
          <p className="adm-subtitle">Gestion des superviseurs, agents et camions</p>
        </div>
      </div>

      {/* Summary strip */}
      {!loading && (
        <div className="adm-summary">
          <div className="adm-summary-item">
            <FaUsers className="adm-summary-icon" style={{ color: "#3b82f6" }} />
            <span className="adm-summary-value">{supervisors.length}</span>
            <span className="adm-summary-label">
              superviseur{supervisors.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="adm-summary-sep" />
          <div className="adm-summary-item">
            <FaUserTie className="adm-summary-icon" style={{ color: "#10b981" }} />
            <span className="adm-summary-value">{totalAgents}</span>
            <span className="adm-summary-label">
              agent{totalAgents !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="adm-summary-sep" />
          <div className="adm-summary-item">
            <FaTruck className="adm-summary-icon" style={{ color: "#f59e0b" }} />
            <span className="adm-summary-value">{totalCamions}</span>
            <span className="adm-summary-label">
              camion{totalCamions !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="adm-loading">Chargement...</div>
      ) : supervisors.length === 0 ? (
        <div className="adm-empty">Aucun superviseur enregistré.</div>
      ) : (
        <div className="adm-sup-list">
          {supervisors.map((sup) => (
            <SupervisorCard key={sup.id} sup={sup} />
          ))}
        </div>
      )}
    </Container>
  );
};
