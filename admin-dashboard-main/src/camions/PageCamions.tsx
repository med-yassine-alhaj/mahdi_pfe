import toast from "react-hot-toast";
import { MdDelete, MdEdit } from "react-icons/md";
import { PiTruckThin } from "react-icons/pi";
import { Camion, CamionDocument } from "./type";
import { AjouterCamion } from "./AjouterCamion";
import { AuthContext } from "../auth/AuthContext";
import { databaseClient } from "../firebaseConfig";
import { useContext, useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Button, Card, Col, Container, Form, Modal, Row } from "react-bootstrap";

export const PageCamions = () => {
  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const authContext = useContext(AuthContext)!;
  const [camions, setCamions] = useState<CamionDocument[]>([]);

  const [editShow, setEditShow] = useState(false);
  const [editCamion, setEditCamion] = useState<Camion | null>(null);
  const [originalMatricule, setOriginalMatricule] = useState<string>("");

  const ajouterCamion = (camion: CamionDocument) => {
    setCamions([...camions, camion]);
  };

  const getCamions = async () => {
    try {
      const docRef = doc(databaseClient, "users", authContext.userId || "");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCamions(data["camions"] as Camion[]);
      }
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la récupération des camions");
    }
  };

  const deleteCamion = async (matricule: string) => {
    try {
      const docRef = doc(databaseClient, "users", authContext.userId || "");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const updated = (data["camions"] as Camion[]).filter(c => c.matricule !== matricule);
        await updateDoc(docRef, { camions: updated });
        setCamions(updated);
        toast.success("Camion supprimé avec succès");
      }
    } catch {
      toast.error("Erreur lors de la suppression du camion");
    }
  };

  const openEdit = (camion: Camion) => {
    setEditCamion({ ...camion });
    setOriginalMatricule(camion.matricule);
    setEditShow(true);
  };

  const saveEdit = async () => {
    if (!editCamion) return;
    try {
      const docRef = doc(databaseClient, "users", authContext.userId || "");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const updated = (data["camions"] as Camion[]).map(c =>
          c.matricule === originalMatricule ? editCamion : c
        );
        await updateDoc(docRef, { camions: updated });
        setCamions(updated);
        toast.success("Camion modifié avec succès");
        setEditShow(false);
      }
    } catch {
      toast.error("Erreur lors de la modification du camion");
    }
  };

  useEffect(() => {
    getCamions();
  }, []);

  return (
    <div className="mt-5">
      <Container>
        {/* Add modal */}
        <Modal show={show} onHide={handleClose}>
          <Modal.Header closeButton>
            <Modal.Title>Ajouter Camion</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <AjouterCamion ajouterCamion={ajouterCamion} hide={handleClose} />
          </Modal.Body>
        </Modal>

        {/* Edit modal */}
        <Modal show={editShow} onHide={() => setEditShow(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Modifier Camion — {originalMatricule}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {editCamion && (
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Matricule</Form.Label>
                  <Form.Control
                    value={editCamion.matricule}
                    onChange={e => setEditCamion({ ...editCamion, matricule: e.target.value })}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Marque</Form.Label>
                  <Form.Control
                    value={editCamion.marque}
                    onChange={e => setEditCamion({ ...editCamion, marque: e.target.value })}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Modèle</Form.Label>
                  <Form.Control
                    value={editCamion.modele}
                    onChange={e => setEditCamion({ ...editCamion, modele: e.target.value })}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Année</Form.Label>
                  <Form.Control
                    type="number"
                    value={editCamion.annee}
                    onChange={e => setEditCamion({ ...editCamion, annee: Number(e.target.value) })}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Poids (Kg)</Form.Label>
                  <Form.Control
                    type="number"
                    value={editCamion.poids}
                    onChange={e => setEditCamion({ ...editCamion, poids: Number(e.target.value) })}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Charge Utile (Kg)</Form.Label>
                  <Form.Control
                    type="number"
                    value={editCamion.chargeUtile}
                    onChange={e => setEditCamion({ ...editCamion, chargeUtile: Number(e.target.value) })}
                  />
                </Form.Group>
              </Form>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setEditShow(false)}>Annuler</Button>
            <Button variant="primary" onClick={saveEdit}>Enregistrer</Button>
          </Modal.Footer>
        </Modal>

        <h3 className="mt-3 text-center">Liste des camions</h3>
        <Row className="mt-3" xs={2} md={8} lg={8}>
          {camions.map((camion, index) => (
            <Col sm={12} md={6} lg={4} key={index}>
              <Card style={{ width: "18rem" }}>
                <Card.Body>
                  <PiTruckThin size={45} className="m-1" />
                  <Card.Title>Matricule : {camion.matricule}</Card.Title>
                  <Card.Subtitle className="mb-2 text-muted">
                    {camion.marque} {camion.modele} - {camion.annee}
                  </Card.Subtitle>
                  <Card.Text as="div">
                    <div>Poids : {camion.poids} Kg</div>
                    <div>Charge Utile : {camion.chargeUtile} Kg</div>
                  </Card.Text>
                  <div className="d-flex justify-content-end gap-2">
                    <MdEdit
                      size={22}
                      cursor="pointer"
                      color="#3b82f6"
                      onClick={() => openEdit(camion)}
                    />
                    <MdDelete
                      size={22}
                      cursor="pointer"
                      color="red"
                      onClick={() => deleteCamion(camion.matricule)}
                    />
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        <Button className="mt-3" variant="primary" onClick={handleShow}>
          Ajouter Camion
        </Button>
      </Container>
    </div>
  );
};
