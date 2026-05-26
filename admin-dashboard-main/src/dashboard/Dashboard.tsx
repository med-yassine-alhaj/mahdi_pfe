import { useEffect, useState, useContext } from "react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { databaseClient } from "../firebaseConfig";
import { AuthContext } from "../auth/AuthContext";
import {
  FaUserTie, FaTruck, FaExclamationTriangle,
  FaCheckCircle, FaRoute,
} from "react-icons/fa";
import "./Dashboard.css";

type StatCard = {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
};

export const Dashboard = () => {
  const authContext = useContext(AuthContext)!;
  const [stats, setStats] = useState({ agents: 0, camions: 0, incidents: 0, tournees: 0, tourneesRealisees: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const userId = authContext.userId;
        const uid = authContext.user?.uid;

        // Agents et camions sont dans le document user
        const userDoc = await getDoc(doc(databaseClient, "users", userId || ""));
        const userData = userDoc.exists() ? userDoc.data() : {};
        const agentsCount = (userData["agents"] as unknown[])?.length ?? 0;
        const camionsCount = (userData["camions"] as unknown[])?.length ?? 0;

        // Tournées, incidents et tournéesRealisées sont dans des collections séparées
        const [tourneesSnap, tourneesRSnap, incidentsSnap] = await Promise.all([
          getDocs(query(collection(databaseClient, "tournees"), where("supervisorId", "==", userId))),
          getDocs(query(collection(databaseClient, "tourneesRealisees"), where("supervisorId", "==", uid))),
          getDocs(query(collection(databaseClient, "incidents"), where("supervisorId", "==", uid))),
        ]);

        setStats({
          agents: agentsCount,
          camions: camionsCount,
          incidents: incidentsSnap.size,
          tournees: tourneesSnap.size,
          tourneesRealisees: tourneesRSnap.size,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    if (authContext.userId || authContext.user?.uid) {
      fetchStats();
    }
  }, [authContext.userId, authContext.user?.uid]);

  const cards: StatCard[] = [
    { label: "Agents", value: stats.agents, icon: <FaUserTie />, color: "#3b82f6" },
    { label: "Camions", value: stats.camions, icon: <FaTruck />, color: "#10b981" },
    { label: "Tournées", value: stats.tournees, icon: <FaRoute />, color: "#8b5cf6" },
    { label: "Tournées Réalisées", value: stats.tourneesRealisees, icon: <FaCheckCircle />, color: "#06b6d4" },
    { label: "Incidents", value: stats.incidents, icon: <FaExclamationTriangle />, color: "#f59e0b" },
  ];

  return (
    <div>
      <div className="dashboard-header">
        <h2 className="dashboard-title">Tableau de bord</h2>
        <p className="dashboard-subtitle">Vue d'ensemble de vos opérations</p>
      </div>

      {loading ? (
        <div className="dashboard-loading">Chargement des statistiques...</div>
      ) : (
        <div className="stats-grid">
          {cards.map((card) => (
            <div className="stat-card" key={card.label}>
              <div className="stat-icon" style={{ background: `${card.color}20`, color: card.color }}>
                {card.icon}
              </div>
              <div className="stat-info">
                <div className="stat-value">{card.value}</div>
                <div className="stat-label">{card.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
