import toast from "react-hot-toast";
import { CiUser } from "react-icons/ci";
import { MdDelete, MdEdit } from "react-icons/md";
import { Agent, AgentDocument } from "./types";
import { useContext, useEffect, useState } from "react";
import { AjouterAgent } from "./AjouterAgent";
import { databaseClient, secondaryAuth } from "../firebaseConfig";
import { Button, Card, Col, Container, Form, Modal, Row } from "react-bootstrap";
import {
  collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, where,
} from "firebase/firestore";
import {
  signInWithEmailAndPassword, updateEmail, updatePassword, signOut, deleteUser,
} from "firebase/auth";
import { AuthContext } from "../auth/AuthContext";

export const PageAgents = () => {
  const authContext = useContext(AuthContext)!;
  const [agents, setAgents] = useState<AgentDocument[]>([]);

  const [show, setShow] = useState(false);
  const handleShow = () => setShow(true);
  const handleClose = () => setShow(false);

  const [editShow, setEditShow] = useState(false);
  const [editAgent, setEditAgent] = useState<Agent | null>(null);
  const [editOriginalEmail, setEditOriginalEmail] = useState<string>("");
  const [editOriginalPassword, setEditOriginalPassword] = useState<string>("");

  const getAgents = async () => {
    try {
      const docRef = doc(databaseClient, "users", authContext.userId || "");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setAgents((docSnap.data()["agents"] as Agent[]) || []);
      }
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la récupération des agents");
    }
  };

  // Supprime de Firebase Auth + collection "agents" + tableau du document user
  const deleteAgent = async (email: string) => {
    // Récupérer le mot de passe stocké pour se connecter via l'instance secondaire
    const agentData = agents.find(a => a.email === email);
    const password = agentData?.motDePasse || "";

    // 1. Supprimer de Firebase Authentication
    try {
      const credential = await signInWithEmailAndPassword(secondaryAuth, email, password);
      await deleteUser(credential.user);
    } catch (authError: unknown) {
      const code = (authError as { code?: string })?.code || "";
      await signOut(secondaryAuth).catch(() => {});
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        toast.error("Impossible de supprimer de Firebase Auth (mot de passe incorrect) — supprimé de Firestore uniquement.");
      } else {
        console.error("Auth delete error:", authError);
        toast.error("Erreur Firebase Auth — supprimé de Firestore uniquement.");
      }
    }

    // 2. Supprimer du tableau dans le document user
    try {
      const userRef = doc(databaseClient, "users", authContext.userId || "");
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const updated = (userSnap.data()["agents"] as Agent[]).filter(a => a.email !== email);
        await updateDoc(userRef, { agents: updated });
        setAgents(updated);
      }

      // 3. Supprimer le document dans la collection "agents"
      const agentsQuery = query(
        collection(databaseClient, "agents"),
        where("email", "==", email),
        where("supervisorId", "==", authContext.userId)
      );
      const agentDocs = await getDocs(agentsQuery);
      await Promise.all(agentDocs.docs.map(d => deleteDoc(d.ref)));

      toast.success("Agent supprimé avec succès");
    } catch (e) {
      console.error("Firestore delete error:", e);
      toast.error("Erreur lors de la suppression dans Firestore.");
    }
  };

  const openEdit = (agent: Agent) => {
    setEditAgent({ ...agent });
    setEditOriginalEmail(agent.email);
    setEditOriginalPassword(agent.motDePasse);
    setEditShow(true);
  };

  // Modifie dans Firebase Auth + collection "agents" + tableau du document user
  const saveEdit = async () => {
    if (!editAgent) return;

    let authUpdated = false;

    // 1. Mettre à jour Firebase Authentication via l'instance secondaire
    try {
      const credential = await signInWithEmailAndPassword(
        secondaryAuth, editOriginalEmail, editOriginalPassword
      );
      const agentUser = credential.user;

      if (editAgent.email !== editOriginalEmail) {
        await updateEmail(agentUser, editAgent.email);
      }
      if (editAgent.motDePasse && editAgent.motDePasse !== editOriginalPassword) {
        await updatePassword(agentUser, editAgent.motDePasse);
      }
      await signOut(secondaryAuth);
      authUpdated = true;
    } catch (authError: unknown) {
      await signOut(secondaryAuth).catch(() => {});
      const code = (authError as { code?: string })?.code || "";
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        toast.error("Mot de passe actuel incorrect — Firestore mis à jour uniquement.");
      } else if (code === "auth/email-already-in-use") {
        toast.error("Cet email est déjà utilisé par un autre compte.");
        return;
      } else if (code === "auth/operation-not-allowed") {
        toast.error(
          "Firebase bloque la modification directe d'email. " +
          "Désactivez 'Email enumeration protection' dans Firebase Console → Authentication → Settings."
        );
      } else {
        console.error("Auth error:", authError);
        toast.error("Erreur Firebase Auth — Firestore mis à jour uniquement.");
      }
    }

    // 2. Mettre à jour le tableau dans le document user
    try {
      const userRef = doc(databaseClient, "users", authContext.userId || "");
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const updated = (userSnap.data()["agents"] as Agent[]).map(a =>
          a.email === editOriginalEmail ? editAgent : a
        );
        await updateDoc(userRef, { agents: updated });
        setAgents(updated);
      }

      // 3. Mettre à jour le document dans la collection "agents"
      const agentsQuery = query(
        collection(databaseClient, "agents"),
        where("email", "==", editOriginalEmail),
        where("supervisorId", "==", authContext.userId)
      );
      const agentDocs = await getDocs(agentsQuery);
      await Promise.all(
        agentDocs.docs.map(d =>
          updateDoc(d.ref, {
            nom: editAgent.nom,
            prenom: editAgent.prenom,
            email: editAgent.email,
            telephone: editAgent.telephone,
            numeroCIN: editAgent.numeroCIN,
            motDePasse: editAgent.motDePasse,
          })
        )
      );

      if (authUpdated) {
        toast.success("Agent modifié avec succès (Auth + Firestore)");
      } else {
        toast.success("Données Firestore mises à jour.");
      }
      setEditShow(false);
    } catch (e) {
      console.error("Firestore error:", e);
      toast.error("Erreur lors de la mise à jour Firestore.");
    }
  };

  useEffect(() => {
    getAgents();
  }, []);

  return (
    <div className="mt-5">
      <Container>
        {/* Add modal */}
        <Modal show={show} onHide={handleClose}>
          <Modal.Header closeButton>
            <Modal.Title>Ajouter Agent</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <AjouterAgent
              hide={handleClose}
              ajouterAgent={(agent) => setAgents([...agents, agent])}
            />
          </Modal.Body>
        </Modal>

        {/* Edit modal */}
        <Modal show={editShow} onHide={() => setEditShow(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Modifier Agent</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {editAgent && (
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Nom</Form.Label>
                  <Form.Control
                    value={editAgent.nom}
                    onChange={e => setEditAgent({ ...editAgent, nom: e.target.value })}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Prénom</Form.Label>
                  <Form.Control
                    value={editAgent.prenom}
                    onChange={e => setEditAgent({ ...editAgent, prenom: e.target.value })}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={editAgent.email}
                    onChange={e => setEditAgent({ ...editAgent, email: e.target.value })}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Mot de passe</Form.Label>
                  <Form.Control
                    type="password"
                    value={editAgent.motDePasse}
                    onChange={e => setEditAgent({ ...editAgent, motDePasse: e.target.value })}
                    placeholder="Laisser vide pour ne pas modifier"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Téléphone</Form.Label>
                  <Form.Control
                    value={editAgent.telephone}
                    onChange={e => setEditAgent({ ...editAgent, telephone: e.target.value })}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Numéro CIN</Form.Label>
                  <Form.Control
                    value={editAgent.numeroCIN}
                    onChange={e => setEditAgent({ ...editAgent, numeroCIN: e.target.value })}
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

        <h3 className="mt-3 text-center">Liste des agents</h3>
        <Row className="mt-3" xs={2} md={8} lg={8}>
          {agents.map((agent, index) => (
            <Col sm={12} md={6} lg={4} key={index}>
              <Card style={{ width: "18rem" }}>
                <Card.Body>
                  <CiUser size={35} className="m-1" />
                  <Card.Title>nom: {agent.nom}</Card.Title>
                  <Card.Subtitle className="mb-2 text-muted">
                    prenom: {agent.prenom}
                  </Card.Subtitle>
                  <Card.Text>
                    <div>Email: {agent.email}</div>
                    <div>Téléphone: {agent.telephone}</div>
                    <div>Numéro CIN: {agent.numeroCIN}</div>
                  </Card.Text>
                  <div className="d-flex justify-content-end gap-2">
                    <MdEdit size={22} cursor="pointer" color="#3b82f6" onClick={() => openEdit(agent)} />
                    <MdDelete size={22} cursor="pointer" color="red" onClick={() => deleteAgent(agent.email)} />
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        <Button className="mt-3" variant="primary" onClick={handleShow}>
          Ajouter Agent
        </Button>
      </Container>
    </div>
  );
};
