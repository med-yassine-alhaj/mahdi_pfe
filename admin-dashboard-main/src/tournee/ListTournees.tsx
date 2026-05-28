import toast from "react-hot-toast";
import { MdDelete, MdEdit } from "react-icons/md";
import { IoMapOutline } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../auth/AuthContext";
import { databaseClient } from "../firebaseConfig";
import { useContext, useEffect, useState } from "react";
import { PointDeCollect } from "../CentreDeDepot/types";
import { Agent } from "../agents/types";
import { Camion } from "../camions/type";
import { Button, Card, Col, Container, Modal, Row, Form } from "react-bootstrap";
import {
  AdvancedMarker,
  APIProvider,
  Map,
  Pin,
} from "@vis.gl/react-google-maps";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { GeoPoint, pointInPolygon, zoneCentroid } from "../utils/geo";
import { ZonePolygon } from "../components/ZonePolygon";

type Tournee = {
  id: string;
  agentId: string;
  pointsDeCollect: PointDeCollect[];
  agentName: string;
  supervisorId: string;
  camionMatricule: string;
};

const MAP_API_KEY = "AIzaSyDXdXXNJTBEKGgZWNm-bYhrUDz6_3gysTY";
const DEFAULT_CENTER = { lat: 36.742173, lng: 10.036566 };

export const ListTournees = () => {
  const navigate = useNavigate();
  const authContext = useContext(AuthContext)!;
  const [tournees, setTournees] = useState<Tournee[]>([]);

  const [editShow, setEditShow] = useState(false);
  const [editTournee, setEditTournee] = useState<Tournee | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [camions, setCamions] = useState<Camion[]>([]);
  const [centresDeDepots, setCentresDeDepots] = useState<PointDeCollect[]>([]);
  const [zone, setZone] = useState<GeoPoint[]>([]);

  const getTournees = async () => {
    setTournees([]);
    const snap = await getDocs(
      query(collection(databaseClient, "tournees"), where("supervisorId", "==", authContext.userId))
    );
    setTournees(
      snap.docs.map((d) => ({
        id: d.id,
        agentId: d.data().agentId,
        pointsDeCollect: d.data().pointsDeCollect,
        agentName: d.data().agentName,
        supervisorId: d.data().supervisorId,
        camionMatricule: d.data().camionMatricule,
      }))
    );
  };

  const deleteTournee = async (id: string) => {
    await deleteDoc(doc(collection(databaseClient, "tournees"), id));
    getTournees();
  };

  const openEdit = async (tournee: Tournee) => {
    setEditTournee({ ...tournee, pointsDeCollect: [...tournee.pointsDeCollect] });
    if (agents.length === 0 || camions.length === 0) {
      const userDoc = await getDoc(doc(databaseClient, "users", authContext.userId || ""));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setAgents((data["agents"] as Agent[]) || []);
        setCamions((data["camions"] as Camion[]) || []);
        setCentresDeDepots((data["centresDeDepots"] as PointDeCollect[]) || []);
        setZone((data["zone"] as GeoPoint[]) || []);
      }
    }
    setEditShow(true);
  };

  const addPoint = (lat: number, lng: number) => {
    if (!editTournee) return;
    if (!pointInPolygon({ lat, lng }, zone)) {
      toast.error("Ce point est en dehors de votre zone géographique.");
      return;
    }
    setEditTournee({
      ...editTournee,
      pointsDeCollect: [...editTournee.pointsDeCollect, { lat, lng }],
    });
  };

  const removePoint = (index: number) => {
    if (!editTournee) return;
    setEditTournee({
      ...editTournee,
      pointsDeCollect: editTournee.pointsDeCollect.filter((_, i) => i !== index),
    });
  };

  const saveEdit = async () => {
    if (!editTournee) return;
    try {
      const selectedAgent = agents.find((a) => a.id === editTournee.agentId);
      const agentName = selectedAgent
        ? `${selectedAgent.nom} ${selectedAgent.prenom}`
        : editTournee.agentName;

      const updated = { ...editTournee, agentName };
      await updateDoc(doc(databaseClient, "tournees", editTournee.id), {
        agentId: updated.agentId,
        agentName: updated.agentName,
        camionMatricule: updated.camionMatricule,
        pointsDeCollect: updated.pointsDeCollect,
      });
      setTournees((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      toast.success("Tournée modifiée avec succès");
      setEditShow(false);
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la modification de la tournée");
    }
  };

  useEffect(() => {
    getTournees();
  }, []);

  return (
    <div className="mt-5">
      <Container>
        {/* Edit modal — xl pour avoir de la place pour la carte */}
        <Modal show={editShow} onHide={() => setEditShow(false)} size="xl" fullscreen="lg-down">
          <Modal.Header closeButton>
            <Modal.Title>Modifier la tournée</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ padding: "20px" }}>
            {editTournee && (
              <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                {/* Colonne gauche : sélecteurs */}
                <div style={{ minWidth: "220px", flex: "0 0 220px" }}>
                  <Form.Group className="mb-3">
                    <Form.Label><strong>Agent</strong></Form.Label>
                    <Form.Select
                      value={editTournee.agentId}
                      onChange={(e) =>
                        setEditTournee({ ...editTournee, agentId: e.target.value })
                      }
                    >
                      <option value="">-- Sélectionner --</option>
                      {agents.map((a, i) => (
                        <option key={i} value={a.id || a.email}>
                          {a.nom} {a.prenom}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label><strong>Camion</strong></Form.Label>
                    <Form.Select
                      value={editTournee.camionMatricule}
                      onChange={(e) =>
                        setEditTournee({ ...editTournee, camionMatricule: e.target.value })
                      }
                    >
                      <option value="">-- Sélectionner --</option>
                      {camions.map((c, i) => (
                        <option key={i} value={c.matricule}>
                          {c.matricule} — {c.marque} {c.modele}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>

                  <Form.Label>
                    <strong>Points de collecte</strong>{" "}
                    <span style={{ color: "#6c757d", fontSize: "13px" }}>
                      ({editTournee.pointsDeCollect.length})
                    </span>
                  </Form.Label>
                  <div
                    style={{
                      border: "1px solid #dee2e6",
                      borderRadius: "6px",
                      maxHeight: "280px",
                      overflowY: "auto",
                    }}
                  >
                    {editTournee.pointsDeCollect.length === 0 ? (
                      <div style={{ padding: "14px", color: "#6c757d", fontSize: "13px", textAlign: "center" }}>
                        Cliquez sur la carte pour ajouter des points
                      </div>
                    ) : (
                      editTournee.pointsDeCollect.map((pt, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 12px",
                            borderBottom:
                              i < editTournee.pointsDeCollect.length - 1
                                ? "1px solid #dee2e6"
                                : "none",
                            fontSize: "13px",
                          }}
                        >
                          <span>
                            Point {i + 1} — {pt.lat.toFixed(4)}, {pt.lng.toFixed(4)}
                          </span>
                          <button
                            type="button"
                            onClick={() => removePoint(i)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#ef4444",
                              cursor: "pointer",
                              fontSize: "18px",
                              lineHeight: 1,
                              padding: "0 4px",
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6c757d", marginTop: "6px" }}>
                    💡 Clic sur la carte = ajouter · Clic sur marqueur rouge = supprimer
                  </div>
                </div>

                {/* Colonne droite : carte */}
                <div style={{ flex: 1, minWidth: "300px", minHeight: "450px" }}>
                  {zone.length >= 3 && (
                    <div style={{ fontSize: "0.8rem", color: "#1d4ed8", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "6px", padding: "6px 12px", marginBottom: "8px" }}>
                      🗺️ Zone géographique active — placez les points à l'intérieur de la zone bleue
                    </div>
                  )}
                  <APIProvider apiKey={MAP_API_KEY}>
                    <Map
                      style={{ width: "100%", height: "450px", borderRadius: "10px" }}
                      defaultCenter={
                        zone.length >= 3
                          ? zoneCentroid(zone)
                          : editTournee.pointsDeCollect.length > 0
                          ? { lat: editTournee.pointsDeCollect[0].lat, lng: editTournee.pointsDeCollect[0].lng }
                          : DEFAULT_CENTER
                      }
                      defaultZoom={zone.length >= 3 ? 11 : 10}
                      gestureHandling="greedy"
                      disableDefaultUI={true}
                      mapId="tournee-edit-map"
                      mapTypeId="hybrid"
                      onClick={(e) => {
                        if (e.detail.latLng)
                          addPoint(e.detail.latLng.lat, e.detail.latLng.lng);
                      }}
                    >
                      {/* Zone overlay */}
                      <ZonePolygon zone={zone} />

                      {/* Centres de dépôt (verts, non cliquables) */}
                      {centresDeDepots.map((pt, i) => (
                        <AdvancedMarker key={`depot-${i}`} position={{ lat: pt.lat, lng: pt.lng }}>
                          <Pin background="#0f9d58" borderColor="#006425" glyphColor="#60d98f" />
                        </AdvancedMarker>
                      ))}

                      {/* Points de collecte (rouges, cliquables pour supprimer) */}
                      {editTournee.pointsDeCollect.map((pt, i) => (
                        <AdvancedMarker
                          key={`point-${i}`}
                          position={{ lat: pt.lat, lng: pt.lng }}
                          title={`Point ${i + 1} — cliquer pour supprimer`}
                          onClick={() => removePoint(i)}
                        >
                          <Pin background="#ef4444" borderColor="#b91c1c" glyphColor="#fff" />
                        </AdvancedMarker>
                      ))}
                    </Map>
                  </APIProvider>
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setEditShow(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={saveEdit}>
              Enregistrer
            </Button>
          </Modal.Footer>
        </Modal>

        <h3 className="mt-3 text-center">Liste des tournées</h3>
        <Row className="mt-3" xs={2} md={8} lg={8}>
          {tournees.map((tournee, index) => (
            <Col sm={12} md={6} lg={4} key={index}>
              <Card style={{ width: "18rem" }}>
                <Card.Body>
                  <IoMapOutline size={40} className="m-1 mb-3" />
                  <Card.Title className="mb-2">Agent : {tournee.agentName}</Card.Title>
                  <Card.Subtitle className="mb-2 text-muted">
                    <div className="mb-2">Points : {tournee.pointsDeCollect.length}</div>
                    <div>Camion : {tournee.camionMatricule}</div>
                  </Card.Subtitle>
                  <div className="d-flex justify-content-end gap-2 mt-2">
                    <MdEdit
                      size={22}
                      cursor="pointer"
                      color="#3b82f6"
                      onClick={() => openEdit(tournee)}
                    />
                    <MdDelete
                      size={22}
                      cursor="pointer"
                      color="red"
                      onClick={() => deleteTournee(tournee.id)}
                    />
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        <Button className="mt-3" onClick={() => navigate("/tournees/ajouter")}>
          Créer une tournée
        </Button>
      </Container>
    </div>
  );
};
