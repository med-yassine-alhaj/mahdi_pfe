import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { databaseClient } from "../firebaseConfig";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../auth/AuthContext";
import { FaExclamationTriangle, FaTruck, FaUser, FaBell } from "react-icons/fa";
import "./Incidents.css";

type Incident = {
  agentId: string;
  supervisorId: string;
  incident: string;
  timestamp: { toDate: () => Date };
};

type Agent = {
  id?: string;
  nom: string;
  prenom: string;
  email: string;
};

type Camion = {
  matricule: string;
  marque: string;
  modele: string;
};

type Tournee = {
  agentId: string;
  camionMatricule: string;
};

type AgentRow = {
  agent: Agent;
  camion: Camion | null;
  incidents: Incident[];
};

export const Incidents = () => {
  const authContext = useContext(AuthContext)!;
  const [agentRows, setAgentRows] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authContext.user?.uid) return;

    let incidents: Incident[] = [];
    let agents: Agent[] = [];
    let camions: Camion[] = [];
    let tournees: Tournee[] = [];

    const merge = () => {
      // Map agentId → camionMatricule (most recent tournée wins)
      const agentCamionMap = new Map<string, string>();
      tournees.forEach((t) => {
        if (t.agentId && t.camionMatricule) agentCamionMap.set(t.agentId, t.camionMatricule);
      });

      // Map matricule → camion
      const camionMap = new Map<string, Camion>();
      camions.forEach((c) => camionMap.set(c.matricule, c));

      // Group incidents by agentId
      const incidentsByAgent = new Map<string, Incident[]>();
      incidents.forEach((inc) => {
        const list = incidentsByAgent.get(inc.agentId) || [];
        list.push(inc);
        incidentsByAgent.set(inc.agentId, list);
      });

      // Build rows: one per agent who has at least one incident
      const rows: AgentRow[] = [];
      agents.forEach((agent) => {
        const agentId = agent.id || agent.email;
        const agentIncidents = incidentsByAgent.get(agentId) || [];
        if (agentIncidents.length === 0) return;

        const matricule = agentCamionMap.get(agentId);
        const camion = matricule ? camionMap.get(matricule) ?? null : null;

        rows.push({
          agent,
          camion,
          incidents: agentIncidents.sort(
            (a, b) => b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime()
          ),
        });
      });

      // Sort by most recent incident
      rows.sort((a, b) =>
        b.incidents[0].timestamp.toDate().getTime() - a.incidents[0].timestamp.toDate().getTime()
      );

      setAgentRows(rows);
      setLoading(false);
    };

    // 1. Real-time incidents
    const q = query(
      collection(databaseClient, "incidents"),
      where("supervisorId", "==", authContext.user?.uid)
    );
    const unsubscribeIncidents = onSnapshot(q, (snap) => {
      incidents = snap.docs.map((d) => d.data() as Incident);
      merge();
    });

    // 2. Load agents, camions, tournées once
    const loadStatic = async () => {
      const userDoc = await getDoc(doc(databaseClient, "users", authContext.userId || ""));
      if (userDoc.exists()) {
        const data = userDoc.data();
        agents = (data["agents"] as Agent[]) || [];
        camions = (data["camions"] as Camion[]) || [];
      }

      const tourSnap = await getDocs(query(
        collection(databaseClient, "tournees"),
        where("supervisorId", "==", authContext.userId)
      ));
      tournees = tourSnap.docs.map((d) => d.data() as Tournee);
      merge();
    };

    loadStatic();

    return () => unsubscribeIncidents();
  }, [authContext.user?.uid, authContext.userId]);

  const totalIncidents = agentRows.reduce((sum, r) => sum + r.incidents.length, 0);

  return (
    <div className="incidents-page">
      <div className="incidents-header">
        <div>
          <h2 className="incidents-title">Incidents</h2>
          <p className="incidents-subtitle">Notifications envoyées par les agents en temps réel</p>
        </div>
        <div className="incidents-count-badge">
          <FaBell />
          <span>{totalIncidents} incident{totalIncidents !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {loading ? (
        <div className="incidents-loading">Chargement des incidents...</div>
      ) : agentRows.length === 0 ? (
        <div className="incidents-empty">
          <FaExclamationTriangle size={40} />
          <p>Aucun incident signalé pour le moment.</p>
        </div>
      ) : (
        <div className="incidents-list">
          {agentRows.map((row, i) => (
            <div className="agent-incident-card" key={i}>
              {/* Agent + Camion header */}
              <div className="agent-incident-header">
                <div className="agent-avatar">
                  <FaUser />
                </div>
                <div className="agent-info">
                  <div className="agent-name">
                    {row.agent.nom} {row.agent.prenom}
                  </div>
                  <div className="agent-email">{row.agent.email}</div>
                </div>
                <div className="camion-info">
                  {row.camion ? (
                    <>
                      <FaTruck className="camion-icon" />
                      <div>
                        <div className="camion-matricule">{row.camion.matricule}</div>
                        <div className="camion-detail">
                          {row.camion.marque} {row.camion.modele}
                        </div>
                      </div>
                    </>
                  ) : (
                    <span className="camion-none">Aucun camion assigné</span>
                  )}
                </div>
                <div className="incident-count-pill">
                  {row.incidents.length} incident{row.incidents.length !== 1 ? "s" : ""}
                </div>
              </div>

              {/* Incident notifications */}
              <div className="incident-notifications">
                {row.incidents.map((inc, j) => (
                  <div className="incident-notif-row" key={j}>
                    <div className="incident-notif-icon">
                      <FaExclamationTriangle />
                    </div>
                    <div className="incident-notif-body">
                      <div className="incident-notif-message">{inc.incident}</div>
                      <div className="incident-notif-time">
                        {inc.timestamp.toDate().toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
