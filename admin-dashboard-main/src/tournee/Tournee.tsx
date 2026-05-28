import toast from "react-hot-toast";
import { Button, Form } from "react-bootstrap";
import { AuthContext } from "../auth/AuthContext";
import { databaseClient } from "../firebaseConfig";
import { Agent, AgentDocument } from "../agents/types";
import { useContext, useEffect, useState } from "react";
import { addDoc, arrayUnion, collection, doc, getDoc, updateDoc } from "firebase/firestore";
import { APIProvider, AdvancedMarker, Map, Pin } from "@vis.gl/react-google-maps";
import { Camion, CamionDocument } from "../camions/type";
import { PointDeCollect } from "../CentreDeDepot/types";
import { useNavigate } from "react-router-dom";
import { GeoPoint, pointInPolygon, zoneCentroid } from "../utils/geo";
import { ZonePolygon } from "../components/ZonePolygon";

const MAP_API_KEY = "AIzaSyDXdXXNJTBEKGgZWNm-bYhrUDz6_3gysTY";

export const Tournee = () => {
  const navigate = useNavigate();
  const authContext = useContext(AuthContext)!;

  const [agents, setAgents] = useState<AgentDocument[]>([]);
  const [camions, setCamions] = useState<CamionDocument[]>([]);
  const [centresDeDepots, setCentresDeDepots] = useState<PointDeCollect[]>([]);
  const [collectionPoints, setCollectionPoints] = useState<PointDeCollect[]>([]);
  const [zone, setZone] = useState<GeoPoint[]>([]);

  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [selectedCamionMatricule, setSelectedCamionMatricule] = useState("");
  const [agentName, setAgentName] = useState("");

  const loadUserData = async () => {
    try {
      const docRef = doc(databaseClient, "users", authContext.userId || "");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAgents((data["agents"] as Agent[]) || []);
        setCamions((data["camions"] as Camion[]) || []);
        setCentresDeDepots((data["centresDeDepots"] as PointDeCollect[]) || []);
        setZone((data["zone"] as GeoPoint[]) || []);
      }
    } catch {
      toast.error("Erreur lors du chargement des données");
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const createTournee = async () => {
    if (!selectedAgentId) {
      toast.error("Veuillez sélectionner un agent.");
      return;
    }
    if (!selectedCamionMatricule) {
      toast.error("Veuillez sélectionner un camion.");
      return;
    }
    try {
      const docRef = doc(databaseClient, "users", authContext.userId || "");
      await updateDoc(docRef, {
        tournees: arrayUnion({
          agentId: selectedAgentId,
          agentName,
          camionMatricule: selectedCamionMatricule,
          pointsDeCollect: collectionPoints,
          supervisorId: authContext.userId,
        }),
      });
      await addDoc(collection(databaseClient, "tournees"), {
        agentId: selectedAgentId,
        agentName,
        camionMatricule: selectedCamionMatricule,
        pointsDeCollect: collectionPoints,
        supervisorId: authContext.userId,
      });
      toast.success("Tournée créée avec succès");
      navigate("/tournees");
    } catch {
      toast.error("Erreur lors de la création de la tournée");
    }
  };

  const mapCenter = zone.length >= 3 ? zoneCentroid(zone) : { lat: 36.742173, lng: 10.036566 };

  return (
    <>
      <h3 className="mt-3 text-center">Créer une tournée</h3>

      <div style={{ margin: "auto", marginTop: "20px", width: "70%" }}>
        <p style={{ fontSize: "16px", marginBottom: "6px" }}>Choisir un agent</p>
        <Form.Select
          size="sm"
          onChange={(e) => {
            const val = e.target.value;
            if (!val) return;
            const agent = agents.find((a) => a.nom === val);
            setSelectedAgentId(agent?.id || "");
            setAgentName(val);
          }}
        >
          <option value="">— Choisir un agent —</option>
          {agents.map((a, i) => (
            <option key={i}>{a.nom}</option>
          ))}
        </Form.Select>

        <p style={{ fontSize: "16px", marginBottom: "6px", marginTop: "16px" }}>
          Choisir un camion
        </p>
        <Form.Select
          size="sm"
          onChange={(e) => {
            const val = e.target.value;
            if (!val) return;
            setSelectedCamionMatricule(val);
          }}
        >
          <option value="">— Choisir un camion —</option>
          {camions.map((c, i) => (
            <option key={i} value={c.matricule}>
              {c.matricule} — {c.marque} {c.modele}
            </option>
          ))}
        </Form.Select>
      </div>

      <div style={{ margin: "auto", marginTop: "20px", marginBottom: "20px", width: "70%" }}>
        <p style={{ fontSize: "16px", marginBottom: "6px" }}>
          Choisir les points de collecte
        </p>

        {/* Zone hint */}
        {zone.length >= 3 && (
          <div
            style={{
              fontSize: "0.8rem",
              color: "#1d4ed8",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: "6px",
              padding: "6px 12px",
              marginBottom: "8px",
            }}
          >
            🗺️ Zone géographique active — les points doivent être placés à l'intérieur de la zone bleue
          </div>
        )}

        <APIProvider apiKey={MAP_API_KEY}>
          <Map
            style={{ width: "100%", height: "80vh" }}
            defaultCenter={mapCenter}
            defaultZoom={zone.length >= 3 ? 11 : 9}
            gestureHandling="greedy"
            disableDefaultUI={true}
            mapId="tournee-create-map"
            mapTypeId="hybrid"
            onClick={(e) => {
              if (!e.detail.latLng) return;
              const pt = { lat: e.detail.latLng.lat, lng: e.detail.latLng.lng };
              if (!pointInPolygon(pt, zone)) {
                toast.error("Ce point est en dehors de votre zone géographique.");
                return;
              }
              setCollectionPoints((prev) => [...prev, pt]);
            }}
          >
            {/* Zone overlay */}
            <ZonePolygon zone={zone} />

            {/* Collection points — red, click to remove */}
            {collectionPoints.map((pt, i) => (
              <AdvancedMarker
                key={i}
                position={{ lat: pt.lat, lng: pt.lng }}
                title="Cliquer pour supprimer"
                onClick={() =>
                  setCollectionPoints((prev) => prev.filter((_, idx) => idx !== i))
                }
              >
                <Pin background="#ef4444" borderColor="#b91c1c" glyphColor="#fff" />
              </AdvancedMarker>
            ))}

            {/* Centres de dépôt — green, informational */}
            {centresDeDepots.map((pt, i) => (
              <AdvancedMarker key={`depot-${i}`} position={{ lat: pt.lat, lng: pt.lng }}>
                <Pin background="#0f9d58" borderColor="#006425" glyphColor="#60d98f" />
              </AdvancedMarker>
            ))}
          </Map>
        </APIProvider>

        {collectionPoints.length > 0 && (
          <div style={{ fontSize: "0.82rem", color: "#6b7280", marginTop: "6px" }}>
            {collectionPoints.length} point{collectionPoints.length !== 1 ? "s" : ""} sélectionné
            {collectionPoints.length !== 1 ? "s" : ""} · Cliquez sur un marqueur rouge pour le supprimer
          </div>
        )}
      </div>

      <div style={{ margin: "auto", width: "70%", marginBottom: "40px" }}>
        <Button variant="primary" onClick={createTournee}>
          Créer la tournée
        </Button>
      </div>
    </>
  );
};
