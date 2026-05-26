import { PointDeCollect } from "./types";
import { useContext, useEffect, useId, useState } from "react";
import { databaseClient } from "../firebaseConfig";
import { Button, Form } from "react-bootstrap";
import { arrayUnion, doc, getDoc, updateDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { IoMdRemoveCircleOutline } from "react-icons/io";
import { AuthContext } from "../auth/AuthContext";

import {
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map,
  Pin,
  useAdvancedMarkerRef,
} from "@vis.gl/react-google-maps";

export const CentreDeDepot = () => {
  return (
    <>
      <div
        style={{
          overflow: "hidden",
          padding: "20px 20px",
        }}
      >
        <div
          style={{
            textAlign: "center",
            fontSize: "20px",
            marginBottom: "20px",
          }}
        >
          <h3 className="mt-3 text-center">Centres De Depots et CET</h3>
        </div>
        <GoogleMapVisgl />
      </div>
    </>
  );
};

const GoogleMapVisgl = () => {
  const [newCollectionPoint, setNewCollectionPoint] =
    useState<PointDeCollect | null>(null);

  const [pointsDeCollect, setPointsDeCollect] = useState<PointDeCollect[]>([]);

  const authContext = useContext(AuthContext)!;

  const ajouterPointDeCollect = (pointDeCollect: PointDeCollect) => {
    setPointsDeCollect([...pointsDeCollect, pointDeCollect]);
  };

  const removeCollectionPoint = (name: string) => {
    setPointsDeCollect(pointsDeCollect.filter((p) => p.nom !== name));
  };

  const updateCollectionPoint = (oldNom: string, updated: PointDeCollect) => {
    setPointsDeCollect(prev =>
      prev.map(p => p.nom === oldNom ? updated : p)
    );
  };

  const getPointsDeCollect = async () => {
    try {
      const docRef = doc(databaseClient, "users", authContext.userId || "");

      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();

        const collectionPoints = data["centresDeDepots"] as PointDeCollect[];

        console.log(collectionPoints);

        if (collectionPoints) setPointsDeCollect(collectionPoints);
      }
    } catch (e) {
      toast.error("Erreur lors de la récupération des centres de depots");
    }
  };

  useEffect(() => {
    getPointsDeCollect();
  }, []);

  const defaultCenter = { lat: 36.742173, lng: 10.036566 };

  return defaultCenter ? (
    <APIProvider apiKey={"AIzaSyDXdXXNJTBEKGgZWNm-bYhrUDz6_3gysTY"}>
      <Map
        style={{ width: "100%", height: "80vh" }}
        defaultCenter={defaultCenter}
        defaultZoom={9}
        gestureHandling={"greedy"}
        disableDefaultUI={true}
        mapId={"someId"}
        mapTypeId="hybrid"
        onClick={(e) => {
          if (e.detail.latLng)
            setNewCollectionPoint({
              lat: e.detail.latLng?.lat,
              lng: e.detail.latLng?.lng,
            });
        }}
      >
        {pointsDeCollect.map((pointDeCollect) => {
          return (
            <MarkerVisglWrapper
              key={pointDeCollect.nom}
              deleteCollectionPoint={removeCollectionPoint}
              updateCollectionPoint={updateCollectionPoint}
              pointDeCollect={pointDeCollect}
            />
          );
        })}

        {newCollectionPoint && (
          <NewCollectionPointMarker
            pointDeCollect={newCollectionPoint}
            addCollectionPoint={ajouterPointDeCollect}
          />
        )}
      </Map>
    </APIProvider>
  ) : (
    ""
  );
};

type MarkerVisglWrapperProps = {
  pointDeCollect: PointDeCollect;
  deleteCollectionPoint: (nom: string) => void;
  updateCollectionPoint: (oldNom: string, updated: PointDeCollect) => void;
};

const MarkerVisglWrapper: React.FC<MarkerVisglWrapperProps> = ({
  pointDeCollect,
  deleteCollectionPoint,
  updateCollectionPoint,
}) => {
  const [infowindowOpen, setInfowindowOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(pointDeCollect.nom || "");
  const [position, setPosition] = useState({ lat: pointDeCollect.lat, lng: pointDeCollect.lng });
  const [markerRef, marker] = useAdvancedMarkerRef();
  const authContext = useContext(AuthContext)!;

  const removeCollectionPoint = async (name: string) => {
    try {
      const docRef = doc(databaseClient, "users", authContext.userId || "");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const updated = (data["centresDeDepots"] as PointDeCollect[]).filter(
          (p) => p.nom !== name,
        );
        await updateDoc(docRef, { centresDeDepots: updated });
        deleteCollectionPoint(pointDeCollect.nom || "");
        toast.success("Centre de dépôt supprimé avec succès");
      }
    } catch {
      toast.error("Erreur lors de la suppression du centre de dépôt");
    }
  };

  const saveEdit = async () => {
    if (!editName.trim()) return;
    try {
      const docRef = doc(databaseClient, "users", authContext.userId || "");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const updated = (data["centresDeDepots"] as PointDeCollect[]).map((p) =>
          p.nom === pointDeCollect.nom ? { ...p, nom: editName.trim() } : p
        );
        await updateDoc(docRef, { centresDeDepots: updated });
        const newPoint = { ...pointDeCollect, nom: editName.trim() };
        updateCollectionPoint(pointDeCollect.nom || "", newPoint);
        pointDeCollect.nom = editName.trim();
        setEditing(false);
        toast.success("Nom modifié avec succès");
      }
    } catch {
      toast.error("Erreur lors de la modification");
    }
  };

  const handleDragEnd = async (e: { latLng: { lat: () => number; lng: () => number } | null }) => {
    if (!e.latLng) return;
    const newLat = e.latLng.lat();
    const newLng = e.latLng.lng();
    try {
      const docRef = doc(databaseClient, "users", authContext.userId || "");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const updatedList = (data["centresDeDepots"] as PointDeCollect[]).map((p) =>
          p.nom === pointDeCollect.nom ? { ...p, lat: newLat, lng: newLng } : p
        );
        await updateDoc(docRef, { centresDeDepots: updatedList });
        const newPoint = { ...pointDeCollect, lat: newLat, lng: newLng };
        updateCollectionPoint(pointDeCollect.nom || "", newPoint);
        setPosition({ lat: newLat, lng: newLng });
        toast.success("Emplacement mis à jour");
      }
    } catch {
      toast.error("Erreur lors de la mise à jour de l'emplacement");
    }
  };

  return (
    <AdvancedMarker
      ref={markerRef}
      key={useId()}
      position={position}
      draggable
      onDragEnd={handleDragEnd}
      title={"Cliquer pour modifier · Glisser pour déplacer"}
      onClick={() => { setInfowindowOpen(true); setEditing(false); }}
    >
      {infowindowOpen && (
        <InfoWindow
          anchor={marker}
          maxWidth={250}
          onCloseClick={() => { setInfowindowOpen(false); setEditing(false); }}
        >
          {editing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "14px" }}
                autoFocus
              />
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  onClick={saveEdit}
                  style={{ flex: 1, padding: "4px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px" }}
                >
                  Enregistrer
                </button>
                <button
                  onClick={() => { setEditing(false); setEditName(pointDeCollect.nom || ""); }}
                  style={{ flex: 1, padding: "4px", background: "#6b7280", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px" }}
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "15px", fontWeight: "600" }}>
                {pointDeCollect.nom}
              </span>
              <span
                onClick={() => setEditing(true)}
                style={{ cursor: "pointer", fontSize: "16px", color: "#3b82f6" }}
                title="Modifier"
              >
                ✏️
              </span>
              <IoMdRemoveCircleOutline
                onClick={() => removeCollectionPoint(pointDeCollect.nom || "")}
                color="red"
                size={22}
                cursor="pointer"
                title="Supprimer"
              />
            </div>
          )}
        </InfoWindow>
      )}
      <Pin
        background={"#0f9d58"}
        borderColor={"#006425"}
        glyphColor={"#60d98f"}
      />
    </AdvancedMarker>
  );
};

type NewCollectionPointMarkerProps = {
  pointDeCollect: PointDeCollect;
  addCollectionPoint: (collectionPoint: PointDeCollect) => void;
};

const NewCollectionPointMarker: React.FC<NewCollectionPointMarkerProps> = ({
  pointDeCollect,
  addCollectionPoint,
}) => {
  const [infowindowOpen, setInfowindowOpen] = useState(false);
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [name, setName] = useState<string>("");
  const authContext = useContext(AuthContext)!;

  const addNewCollectionPoint = async () => {
    const user = authContext.userId;

    if (!user) {
      toast.error("Erreur lors de l'ajout du centre de depots");
      return;
    }

    await updateDoc(doc(databaseClient, "users", user), {
      centresDeDepots: arrayUnion({
        lat: pointDeCollect.lat,
        lng: pointDeCollect.lng,
        nom: name,
      }),
    })
      .then(() => {
        addCollectionPoint({
          lat: pointDeCollect.lat,
          lng: pointDeCollect.lng,
          nom: name,
        });

        setName("");

        setInfowindowOpen(false);
        toast.success("Centre de depots ajouté avec succès");
      })
      .catch(() => {
        toast.error("Erreur lors de l'ajout du centre de depots");
      });
  };

  useEffect(() => {
    return () => {
      setInfowindowOpen(false);
    };
  }, []);
  return (
    <AdvancedMarker
      ref={markerRef}
      key={useId()}
      position={{ lat: pointDeCollect.lat, lng: pointDeCollect.lng }}
      title={"AdvancedMarker that opens an Infowindow when clicked."}
      onClick={() => setInfowindowOpen(true)}
    >
      {infowindowOpen && (
        <InfoWindow anchor={marker} minWidth={400}>
          <Form.Control
            value={name}
            onChange={(e) => setName(e.target.value)}
            type="text"
            placeholder="Nom du point de collect"
            id="name"
            name="name"
            autoComplete="off"
          />
          <Button
            variant="primary"
            style={{
              marginTop: "5px",
              width: "100%",
            }}
            onClick={addNewCollectionPoint}
          >
            Ajouter
          </Button>
        </InfoWindow>
      )}
      <Pin
        background={"#ff0000"}
        borderColor={"#ff4433"}
        glyphColor={"#E34234"}
      />
    </AdvancedMarker>
  );
};
