import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { databaseClient } from "../firebaseConfig";
import React, { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button, Container, Form, Modal } from "react-bootstrap";
import { AuthContext } from "../auth/AuthContext";
import "./TourneesRealisees.css";

type TourneeRealisee = {
  id: string;
  agentId: string;
  startDate: { toDate: () => Date };
  endDate: { toDate: () => Date };
  images: string[];
  agentNom: string;
  agentPrenom: string;
  camionMatricule: string;
  pointsCount: number;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatDate = (d: Date) =>
  d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatDuration = (start: Date, end: Date) => {
  const diff = Math.round((end.getTime() - start.getTime()) / 1000 / 60);
  if (diff < 1) return "< 1 min";
  if (diff < 60) return `${diff} min`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
};

const AVATAR_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#ec4899",
];
const avatarColor = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};
const getInitials = (nom: string, prenom: string) =>
  `${(nom || "?")[0]}${(prenom || "?")[0]}`.toUpperCase();

// ─── Main component ──────────────────────────────────────────────────────────

export const TourneesRealisees = () => {
  const authContext = useContext(AuthContext)!;
  const [tournees, setTournees] = useState<TourneeRealisee[]>([]);
  const [loading, setLoading] = useState(true);

  // Lightbox
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  // Report controls
  const [reportDate, setReportDate] = useState<string>(
    () => new Date().toISOString().slice(0, 10)
  );
  const [reportMonth, setReportMonth] = useState<string>(
    () => new Date().toISOString().slice(0, 7)
  );

  // Report modal
  const [showReport, setShowReport] = useState(false);
  const [reportTitle, setReportTitle] = useState("");
  const [reportTournees, setReportTournees] = useState<TourneeRealisee[]>([]);

  const loadTournees = async () => {
    setLoading(true);
    try {
      // 1. Fetch tourneesRealisees for this supervisor
      const tourSnap = await getDocs(
        query(
          collection(databaseClient, "tourneesRealisees"),
          where("supervisorId", "==", authContext.user?.uid)
        )
      );

      if (tourSnap.empty) {
        setTournees([]);
        setLoading(false);
        return;
      }

      // 2. Fetch images from the images collection (keyed by tourneeId)
      const photosSnap = await getDocs(collection(databaseClient, "images"));
      const imagesMap: Record<string, string[]> = {};
      photosSnap.docs.forEach((d) => {
        const data = d.data();
        if (!imagesMap[data.tourneeId]) imagesMap[data.tourneeId] = [];
        imagesMap[data.tourneeId].push(data.imageUrl);
      });

      // 3. Fetch agents from user document (id = Firebase Auth UID)
      type AgentInfo = { id?: string; nom: string; prenom: string; email: string };
      let agentsList: AgentInfo[] = [];
      if (authContext.userId) {
        const userDoc = await getDoc(
          doc(databaseClient, "users", authContext.userId)
        );
        if (userDoc.exists()) {
          agentsList = (userDoc.data()["agents"] as AgentInfo[]) || [];
        }
      }
      const agentsMap: Record<string, AgentInfo> = {};
      agentsList.forEach((a) => {
        if (a.id) agentsMap[a.id] = a;
        agentsMap[a.email] = a; // fallback by email
      });

      // 4. Fetch tournees for camion mapping (agentId → camionMatricule)
      const camionByAgent: Record<string, string> = {};
      if (authContext.userId) {
        const tourneesSnap = await getDocs(
          query(
            collection(databaseClient, "tournees"),
            where("supervisorId", "==", authContext.userId)
          )
        );
        tourneesSnap.docs.forEach((d) => {
          const data = d.data();
          if (data.agentId && data.camionMatricule)
            camionByAgent[data.agentId] = data.camionMatricule;
        });
      }

      // 5. Build final list
      const result: TourneeRealisee[] = tourSnap.docs.map((d) => {
        const data = d.data();
        const tourneeId = data.id || d.id;
        const agentId = data.agentId || "";
        const agent = agentsMap[agentId] || {
          nom: (data.agentName || "").split(" ")[0] || "",
          prenom: (data.agentName || "").split(" ")[1] || "",
          email: "",
        };
        return {
          id: tourneeId,
          agentId,
          startDate: data.startDate,
          endDate: data.endDate,
          images: imagesMap[tourneeId] || [],
          agentNom: agent.nom || "",
          agentPrenom: agent.prenom || "",
          camionMatricule: data.camionMatricule || camionByAgent[agentId] || "",
          pointsCount: (data.pointsDeCollect || []).length,
        };
      });

      // Sort newest first
      result.sort(
        (a, b) => b.startDate.toDate().getTime() - a.startDate.toDate().getTime()
      );
      setTournees(result);
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors du chargement des tournées réalisées");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (authContext.user?.uid) loadTournees();
  }, [authContext.user?.uid]);

  const openReport = (filtered: TourneeRealisee[], title: string) => {
    setReportTournees(filtered);
    setReportTitle(title);
    setShowReport(true);
  };

  const generateDailyReport = () => {
    const filtered = tournees.filter(
      (t) => t.startDate.toDate().toISOString().slice(0, 10) === reportDate
    );
    const label = new Date(reportDate + "T00:00:00").toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    openReport(filtered, `Rapport journalier — ${label}`);
  };

  const generateMonthlyReport = () => {
    const filtered = tournees.filter(
      (t) => t.startDate.toDate().toISOString().slice(0, 7) === reportMonth
    );
    const label = new Date(reportMonth + "-01").toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });
    openReport(filtered, `Rapport mensuel — ${label}`);
  };

  const openSingleReport = (t: TourneeRealisee) => {
    openReport([t], `Rapport — ${t.agentNom} ${t.agentPrenom}`);
  };

  return (
    <div className="tr-page">
      {/* Lightbox */}
      {lightboxImages.length > 0 && (
        <div
          className="tr-lightbox"
          onClick={() => setLightboxImages([])}
        >
          <button
            className="tr-lightbox-close"
            onClick={(e) => { e.stopPropagation(); setLightboxImages([]); }}
          >
            ×
          </button>
          <button
            className="tr-lightbox-nav tr-lightbox-prev"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIdx((i) => Math.max(0, i - 1));
            }}
            disabled={lightboxIdx === 0}
          >
            ‹
          </button>
          <img
            src={lightboxImages[lightboxIdx]}
            alt={`photo ${lightboxIdx + 1}`}
            className="tr-lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="tr-lightbox-nav tr-lightbox-next"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIdx((i) => Math.min(lightboxImages.length - 1, i + 1));
            }}
            disabled={lightboxIdx === lightboxImages.length - 1}
          >
            ›
          </button>
          <div className="tr-lightbox-counter">
            {lightboxIdx + 1} / {lightboxImages.length}
          </div>
        </div>
      )}

      {/* Report Modal */}
      <ReportModal
        show={showReport}
        onHide={() => setShowReport(false)}
        title={reportTitle}
        tournees={reportTournees}
      />

      <Container>
        {/* Page header */}
        <div className="tr-header">
          <div>
            <h3 className="tr-title">Tournées Réalisées</h3>
            <p className="tr-subtitle">
              {tournees.length} tournée{tournees.length !== 1 ? "s" : ""} enregistrée
              {tournees.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Report controls */}
          <div className="tr-report-controls">
            <div className="tr-report-group">
              <span className="tr-report-label">Rapport journalier</span>
              <div className="tr-report-row">
                <Form.Control
                  type="date"
                  size="sm"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="tr-date-input"
                />
                <Button size="sm" variant="outline-primary" onClick={generateDailyReport}>
                  Générer
                </Button>
              </div>
            </div>
            <div className="tr-report-group">
              <span className="tr-report-label">Rapport mensuel</span>
              <div className="tr-report-row">
                <Form.Control
                  type="month"
                  size="sm"
                  value={reportMonth}
                  onChange={(e) => setReportMonth(e.target.value)}
                  className="tr-date-input"
                />
                <Button size="sm" variant="outline-success" onClick={generateMonthlyReport}>
                  Générer
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="tr-loading">Chargement des tournées...</div>
        ) : tournees.length === 0 ? (
          <div className="tr-empty">Aucune tournée réalisée enregistrée.</div>
        ) : (
          <div className="tr-grid">
            {tournees.map((t, i) => {
              const start = t.startDate.toDate();
              const end = t.endDate.toDate();
              const color = avatarColor(t.agentNom + t.agentPrenom);
              const preview = t.images.slice(0, 3);
              const extra = t.images.length - preview.length;

              return (
                <div className="tr-card" key={i}>
                  {/* Agent header */}
                  <div className="tr-card-header">
                    <div
                      className="tr-avatar"
                      style={{ backgroundColor: color }}
                    >
                      {getInitials(t.agentNom, t.agentPrenom)}
                    </div>
                    <div className="tr-agent-info">
                      <div className="tr-agent-name">
                        {t.agentNom} {t.agentPrenom}
                      </div>
                      {t.camionMatricule && (
                        <div className="tr-camion">🚛 {t.camionMatricule}</div>
                      )}
                    </div>
                  </div>

                  {/* Dates & duration */}
                  <div className="tr-dates">
                    <div className="tr-date-row">
                      <span className="tr-date-label">Début</span>
                      <span className="tr-date-value">{formatDate(start)}</span>
                    </div>
                    <div className="tr-date-row">
                      <span className="tr-date-label">Fin</span>
                      <span className="tr-date-value">{formatDate(end)}</span>
                    </div>
                    <div className="tr-date-row">
                      <span className="tr-date-label">Durée</span>
                      <span className="tr-duration">{formatDuration(start, end)}</span>
                    </div>
                  </div>

                  {/* Photo thumbnails */}
                  {t.images.length > 0 ? (
                    <div className="tr-images-section">
                      <div className="tr-images-label">
                        📷 {t.images.length} photo{t.images.length !== 1 ? "s" : ""} prise
                        {t.images.length !== 1 ? "s" : ""}
                      </div>
                      <div className="tr-image-strip">
                        {preview.map((url, j) => (
                          <img
                            key={j}
                            src={url}
                            alt={`photo ${j + 1}`}
                            className="tr-thumb"
                            onClick={() => {
                              setLightboxImages(t.images);
                              setLightboxIdx(j);
                            }}
                          />
                        ))}
                        {extra > 0 && (
                          <div
                            className="tr-thumb tr-thumb-more"
                            onClick={() => {
                              setLightboxImages(t.images);
                              setLightboxIdx(3);
                            }}
                          >
                            +{extra}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="tr-no-images">Aucune photo prise</div>
                  )}

                  {/* Actions */}
                  <div className="tr-card-actions">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => openSingleReport(t)}
                    >
                      📋 Rapport
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Container>
    </div>
  );
};

// ─── Report Modal ────────────────────────────────────────────────────────────

type ReportModalProps = {
  show: boolean;
  onHide: () => void;
  title: string;
  tournees: TourneeRealisee[];
};

const ReportModal: React.FC<ReportModalProps> = ({
  show,
  onHide,
  title,
  tournees,
}) => {
  const totalImages = tournees.reduce((s, t) => s + t.images.length, 0);
  const totalPoints = tournees.reduce((s, t) => s + t.pointsCount, 0);

  return (
    <Modal show={show} onHide={onHide} size="xl">
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div id="report-printable">
          {/* Print-only title */}
          <div className="tr-print-title">{title}</div>
          <div className="tr-print-date">
            Généré le{" "}
            {new Date().toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </div>

          {/* Summary stats */}
          <div className="tr-report-summary">
            <div className="tr-stat">
              <span className="tr-stat-value">{tournees.length}</span>
              <span className="tr-stat-label">
                Tournée{tournees.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="tr-stat">
              <span className="tr-stat-value">{totalImages}</span>
              <span className="tr-stat-label">Photos prises</span>
            </div>
            <div className="tr-stat">
              <span className="tr-stat-value">{totalPoints}</span>
              <span className="tr-stat-label">Points visités</span>
            </div>
          </div>

          {tournees.length === 0 ? (
            <div className="tr-report-empty">
              Aucune tournée pour cette période.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered tr-report-table">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>Agent</th>
                    <th>Camion</th>
                    <th>Début</th>
                    <th>Fin</th>
                    <th>Durée</th>
                    <th>Photos</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {tournees.map((t, i) => {
                    const start = t.startDate.toDate();
                    const end = t.endDate.toDate();
                    return (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>
                          <strong>
                            {t.agentNom} {t.agentPrenom}
                          </strong>
                        </td>
                        <td>{t.camionMatricule || "—"}</td>
                        <td>{formatDate(start)}</td>
                        <td>{formatDate(end)}</td>
                        <td>
                          <span className="tr-duration-badge">
                            {formatDuration(start, end)}
                          </span>
                        </td>
                        <td>{t.images.length}</td>
                        <td>{t.pointsCount || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Photo gallery for single-tour reports */}
          {tournees.length === 1 && tournees[0].images.length > 0 && (
            <div className="tr-report-gallery">
              <h6 className="tr-report-gallery-title">
                Photos de la tournée ({tournees[0].images.length})
              </h6>
              <div className="tr-report-img-grid">
                {tournees[0].images.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`photo ${i + 1}`}
                    className="tr-report-img"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Fermer
        </Button>
        <Button variant="primary" onClick={() => window.print()}>
          🖨️ Imprimer
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
