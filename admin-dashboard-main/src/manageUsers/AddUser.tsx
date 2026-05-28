import { useState } from "react";
import toast from "react-hot-toast";
import { Button, Col, Form, Row } from "react-bootstrap";
import { addDoc, collection } from "firebase/firestore";
import { authClient, databaseClient } from "../firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { APIProvider, AdvancedMarker, Map, Pin } from "@vis.gl/react-google-maps";
import { GeoPoint, zoneCentroid } from "../utils/geo";
import { ZonePolygon } from "../components/ZonePolygon";

const MAP_API_KEY = "AIzaSyDXdXXNJTBEKGgZWNm-bYhrUDz6_3gysTY";
const DEFAULT_CENTER = { lat: 36.742173, lng: 10.036566 };

export const AddUser = () => {
  const [input, setInput] = useState({
    nom: "",
    prenom: "",
    email: "",
    password: "",
    ville: "",
    role: "superviseur",
  });
  const [zone, setZone] = useState<GeoPoint[]>([]);
  const [saving, setSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput({ ...input, [e.target.id]: e.target.value });
  };

  const addVertex = (lat: number, lng: number) => {
    setZone((prev) => [...prev, { lat, lng }]);
  };

  const removeVertex = (index: number) => {
    setZone((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!input.nom || !input.prenom || !input.email || !input.password) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    setSaving(true);
    try {
      const cred = await createUserWithEmailAndPassword(
        authClient,
        input.email,
        input.password
      );
      await addDoc(collection(databaseClient, "users"), {
        id: cred.user.uid,
        nom: input.nom,
        prenom: input.prenom,
        email: input.email,
        password: input.password,
        ville: { nom: input.ville },
        role: input.role,
        agents: [],
        camions: [],
        centresDeDepots: [],
        zone,
      });
      toast.success("Superviseur ajouté avec succès");
      setInput({ nom: "", prenom: "", email: "", password: "", ville: "", role: "superviseur" });
      setZone([]);
    } catch (e: unknown) {
      console.error(e);
      const code = (e as { code?: string })?.code ?? "";
      if (code === "auth/email-already-in-use") {
        toast.error("Cet email est déjà utilisé.");
      } else {
        toast.error("Erreur lors de l'ajout du superviseur.");
      }
    }
    setSaving(false);
  };

  const zoneStatus =
    zone.length === 0
      ? "Cliquez sur la carte pour délimiter la zone géographique du superviseur"
      : zone.length < 3
      ? `${zone.length} point${zone.length > 1 ? "s" : ""} — encore ${3 - zone.length} pour fermer le polygone`
      : `✓ Zone définie — ${zone.length} points`;

  const mapCenter = zone.length > 0 ? zoneCentroid(zone) : DEFAULT_CENTER;

  return (
    <div style={{ padding: "32px" }}>
      <h3 style={{ marginBottom: "24px" }}>Ajouter un superviseur</h3>

      <Row>
        {/* ── Left column : form ─────────────────────────────────── */}
        <Col md={4}>
          <Form>
            <Form.Group className="mb-3" controlId="nom">
              <Form.Label>Nom *</Form.Label>
              <Form.Control
                type="text"
                value={input.nom}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="prenom">
              <Form.Label>Prénom *</Form.Label>
              <Form.Control
                type="text"
                value={input.prenom}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="email">
              <Form.Label>Email *</Form.Label>
              <Form.Control
                type="email"
                value={input.email}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="password">
              <Form.Label>Mot de passe *</Form.Label>
              <Form.Control
                type="password"
                value={input.password}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="ville">
              <Form.Label>Ville</Form.Label>
              <Form.Control
                type="text"
                value={input.ville}
                onChange={handleChange}
              />
            </Form.Group>

            {/* Zone status box */}
            <div
              style={{
                background: zone.length >= 3 ? "#ecfdf5" : "#f8fafc",
                border: `1px solid ${zone.length >= 3 ? "#6ee7b7" : "#e2e8f0"}`,
                borderRadius: "8px",
                padding: "12px 14px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: "4px",
                }}
              >
                Zone géographique
              </div>
              <div style={{ fontSize: "0.78rem", color: "#6b7280" }}>
                {zoneStatus}
              </div>
              {zone.length > 0 && (
                <Button
                  size="sm"
                  variant="outline-danger"
                  style={{ marginTop: "8px" }}
                  onClick={() => setZone([])}
                >
                  Effacer la zone
                </Button>
              )}
            </div>

            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? "Enregistrement..." : "Ajouter"}
            </Button>
          </Form>
        </Col>

        {/* ── Right column : map ─────────────────────────────────── */}
        <Col md={8}>
          <div
            style={{
              fontSize: "0.82rem",
              color: "#6b7280",
              marginBottom: "8px",
            }}
          >
            💡 Cliquez sur la carte pour ajouter un sommet · Cliquez sur un
            marqueur pour le supprimer
          </div>

          <APIProvider apiKey={MAP_API_KEY}>
            <Map
              style={{ width: "100%", height: "520px", borderRadius: "12px" }}
              defaultCenter={mapCenter}
              defaultZoom={9}
              gestureHandling="greedy"
              disableDefaultUI={true}
              mapId="add-user-zone-map"
              mapTypeId="hybrid"
              onClick={(e) => {
                if (e.detail.latLng)
                  addVertex(e.detail.latLng.lat, e.detail.latLng.lng);
              }}
            >
              {/* Polygon overlay */}
              <ZonePolygon zone={zone} />

              {/* Vertex markers */}
              {zone.map((pt, i) => (
                <AdvancedMarker
                  key={i}
                  position={{ lat: pt.lat, lng: pt.lng }}
                  title={`Point ${i + 1} — cliquer pour supprimer`}
                  onClick={() => removeVertex(i)}
                >
                  <Pin
                    background="#3b82f6"
                    borderColor="#1d4ed8"
                    glyphColor="#fff"
                    glyph={String(i + 1)}
                  />
                </AdvancedMarker>
              ))}
            </Map>
          </APIProvider>
        </Col>
      </Row>
    </div>
  );
};
