import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { databaseClient } from "../firebaseConfig";
import { AuthContext } from "../auth/AuthContext";
import { FaBell, FaExclamationTriangle, FaCheckCircle } from "react-icons/fa";
import "./TopBar.css";

type IncidentItem = {
  id: string;
  incident: string;
  agentId: string;
  timestamp: { toDate: () => Date };
};

const loadSeenIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem("incidents_seen_ids");
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
};

const saveSeenIds = (ids: Set<string>) => {
  localStorage.setItem("incidents_seen_ids", JSON.stringify([...ids]));
};

export const TopBar = () => {
  const navigate = useNavigate();
  const authContext = useContext(AuthContext)!;
  const [allIncidents, setAllIncidents] = useState<IncidentItem[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(loadSeenIds);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authContext.user?.uid) return;

    const q = query(
      collection(databaseClient, "incidents"),
      where("supervisorId", "==", authContext.user?.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: IncidentItem[] = snapshot.docs.map((d) => ({
        id: d.id,
        incident: d.data().incident,
        agentId: d.data().agentId,
        timestamp: d.data().timestamp,
      }));
      // Sort newest first
      items.sort((a, b) => b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime());
      setAllIncidents(items);
    });

    return () => unsubscribe();
  }, [authContext.user?.uid]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unreadIncidents = allIncidents.filter((i) => !seenIds.has(i.id));
  const unreadCount = unreadIncidents.length;

  const dismissOne = (incident: IncidentItem) => {
    const newSeen = new Set(seenIds);
    newSeen.add(incident.id);
    setSeenIds(newSeen);
    saveSeenIds(newSeen);
    // If all dismissed, close dropdown and navigate
    if (unreadCount === 1) {
      setOpen(false);
      navigate("/incidents");
    }
  };

  const dismissAll = () => {
    const newSeen = new Set(seenIds);
    allIncidents.forEach((i) => newSeen.add(i.id));
    setSeenIds(newSeen);
    saveSeenIds(newSeen);
    setOpen(false);
    navigate("/incidents");
  };

  return (
    <div className="topbar">
      <div className="topbar-actions">
        <div className="notif-wrapper" ref={dropdownRef}>
          <button
            className="notif-btn"
            onClick={() => setOpen((o) => !o)}
            title="Voir les incidents"
          >
            <FaBell className="notif-icon" />
            {unreadCount > 0 && (
              <span className="notif-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
            )}
          </button>

          {open && (
            <div className="notif-dropdown">
              <div className="notif-dropdown-header">
                <span className="notif-dropdown-title">
                  {unreadCount > 0
                    ? `${unreadCount} incident${unreadCount > 1 ? "s" : ""} non lu${unreadCount > 1 ? "s" : ""}`
                    : "Aucun incident non lu"}
                </span>
                {unreadCount > 0 && (
                  <button className="notif-mark-all" onClick={dismissAll}>
                    Tout voir
                  </button>
                )}
              </div>

              <div className="notif-dropdown-list">
                {unreadCount === 0 ? (
                  <div className="notif-empty">
                    <FaCheckCircle size={28} />
                    <span>Tout est lu</span>
                  </div>
                ) : (
                  unreadIncidents.map((inc) => (
                    <div
                      className="notif-item"
                      key={inc.id}
                      onClick={() => dismissOne(inc)}
                    >
                      <div className="notif-item-icon">
                        <FaExclamationTriangle />
                      </div>
                      <div className="notif-item-body">
                        <div className="notif-item-msg">{inc.incident}</div>
                        <div className="notif-item-time">
                          {inc.timestamp.toDate().toLocaleString("fr-FR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                      <span className="notif-item-dismiss" title="Marquer comme lu">×</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
