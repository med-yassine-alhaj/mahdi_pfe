import {
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map,
  Pin,
  useAdvancedMarkerRef,
} from "@vis.gl/react-google-maps";
import { useContext, useEffect, useId, useState } from "react";
import { databaseClient, realTimeDB } from "../firebaseConfig";
import { AuthContext } from "../auth/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { onChildAdded, onValue, ref } from "firebase/database";
import toast from "react-hot-toast";
import { FaTruckMoving } from "react-icons/fa";
import { PointDeCollect } from "../CentreDeDepot/types";
import { GeoPoint, zoneCentroid } from "../utils/geo";
import { ZonePolygon } from "../components/ZonePolygon";

const MAP_API_KEY = "AIzaSyDXdXXNJTBEKGgZWNm-bYhrUDz6_3gysTY";
const TUNISIA_CENTER = { lat: 36.742173, lng: 10.036566 };

export const PageTracking = () => {
  return (
    <div style={{ overflow: "hidden", padding: "20px" }}>
      <h3 className="mt-3 text-center">Visualisation de tracking des camions</h3>
      <GoogleMapVisgl />
    </div>
  );
};

const GoogleMapVisgl = () => {
  const authContext = useContext(AuthContext)!;

  const [centresDeDepots, setCentresDeDepots] = useState<PointDeCollect[]>([]);
  const [collectionPoints, setCollectionPoints] = useState<PointDeCollect[]>([]);
  const [zone, setZone] = useState<GeoPoint[]>([]);

  const [trackingPoints, setTrackingPoints] = useState<
    { agentId: string; lat: number; lng: number }[]
  >([]);

  // Load Firestore data: depots, collection points, zone
  useEffect(() => {
    const load = async () => {
      try {
        const docRef = doc(databaseClient, "users", authContext.userId || "");
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return;
        const data = docSnap.data();

        setCentresDeDepots((data["centresDeDepots"] as PointDeCollect[]) || []);
        setZone((data["zone"] as GeoPoint[]) || []);

        // Flatten all tournée points
        const tournees = (data["tournees"] as { pointsDeCollect: PointDeCollect[] }[]) || [];
        const pts: PointDeCollect[] = [];
        tournees.forEach((t) => t.pointsDeCollect?.forEach((p) => pts.push(p)));
        setCollectionPoints(pts);
      } catch {
        toast.error("Erreur lors du chargement des données");
      }
    };
    if (authContext.userId) load();
  }, [authContext.userId]);

  // Real-time tracking from Firebase Realtime DB
  useEffect(() => {
    const trackingRef = ref(realTimeDB, "tracking/");
    let initialLoadDone = false;

    onValue(trackingRef, () => { initialLoadDone = true; }, { onlyOnce: true });

    const unsubscribe = onChildAdded(trackingRef, (snapshot) => {
      if (!initialLoadDone) return;
      const data = snapshot.val();
      if (!data?.agentId || !data?.lat || !data?.lng) return;
      setTrackingPoints((prev) => {
        const idx = prev.findIndex((p) => p.agentId === data.agentId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { agentId: data.agentId, lat: data.lat, lng: data.lng };
          return next;
        }
        return [...prev, { agentId: data.agentId, lat: data.lat, lng: data.lng }];
      });
    });

    return () => unsubscribe();
  }, []);

  const mapCenter = zone.length >= 3 ? zoneCentroid(zone) : TUNISIA_CENTER;
  const mapZoom = zone.length >= 3 ? 11 : 9;

  return (
    <APIProvider apiKey={MAP_API_KEY}>
      <Map
        style={{ width: "100%", height: "80vh" }}
        defaultCenter={mapCenter}
        defaultZoom={mapZoom}
        gestureHandling="greedy"
        disableDefaultUI={true}
        mapId="tracking-map"
        mapTypeId="roadmap"
      >
        {/* Zone overlay */}
        <ZonePolygon zone={zone} />

        {/* Centres de dépôt — green */}
        {centresDeDepots.map((pt, i) => (
          <DepotMarker key={`depot-${i}`} pointDeCollect={pt} />
        ))}

        {/* Collection points — red */}
        {collectionPoints.map((pt, i) => (
          <CollectionMarker key={`cp-${i}`} pointDeCollect={pt} />
        ))}

        {/* Live truck positions — blue truck icon */}
        {trackingPoints.map((pt, i) => (
          <AdvancedMarker
            key={`truck-${i}`}
            position={{ lat: pt.lat, lng: pt.lng }}
            title={`Agent ${pt.agentId}`}
          >
            <FaTruckMoving size={32} color="#2563eb" />
          </AdvancedMarker>
        ))}
      </Map>
    </APIProvider>
  );
};

// ── Marker sub-components ────────────────────────────────────────────────────

const DepotMarker: React.FC<{ pointDeCollect: PointDeCollect }> = ({ pointDeCollect }) => {
  const [open, setOpen] = useState(false);
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <AdvancedMarker
      ref={markerRef}
      key={useId()}
      position={{ lat: pointDeCollect.lat, lng: pointDeCollect.lng }}
      onClick={() => setOpen(true)}
    >
      {open && (
        <InfoWindow anchor={marker} maxWidth={200} onCloseClick={() => setOpen(false)}>
          <span style={{ fontSize: "14px", fontWeight: 600 }}>
            {pointDeCollect.nom}
          </span>
        </InfoWindow>
      )}
      <Pin background="#0f9d58" borderColor="#006425" glyphColor="#60d98f" />
    </AdvancedMarker>
  );
};

const CollectionMarker: React.FC<{ pointDeCollect: PointDeCollect }> = ({ pointDeCollect }) => {
  const [open, setOpen] = useState(false);
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <AdvancedMarker
      ref={markerRef}
      key={useId()}
      position={{ lat: pointDeCollect.lat, lng: pointDeCollect.lng }}
      onClick={() => setOpen(true)}
    >
      {open && (
        <InfoWindow anchor={marker} maxWidth={200} onCloseClick={() => setOpen(false)}>
          <span style={{ fontSize: "14px", fontWeight: 600 }}>
            {pointDeCollect.nom ?? "Point de collecte"}
          </span>
        </InfoWindow>
      )}
      <Pin background="#ef4444" borderColor="#b91c1c" glyphColor="#fff" />
    </AdvancedMarker>
  );
};
