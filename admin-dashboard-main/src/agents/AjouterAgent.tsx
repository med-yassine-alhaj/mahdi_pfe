import toast from "react-hot-toast";
import React, { useContext } from "react";
import { Button, Form } from "react-bootstrap";
import { Agent, AgentDocument } from "./types";
import { AuthContext } from "../auth/AuthContext";
import { authClient, databaseClient } from "../firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  updateDoc,
} from "firebase/firestore";

type AjouterAgentProps = {
  ajouterAgent: (agent: AgentDocument) => void;
  hide: () => void;
};

export const AjouterAgent: React.FC<AjouterAgentProps> = ({
  ajouterAgent,
  hide,
}) => {
  const authContext = useContext(AuthContext)!;
  const [agent, setAgent] = React.useState<Agent>({
    nom: "",
    prenom: "",
    numeroCIN: "",
    email: "",
    telephone: "",
    motDePasse: "",
    role: "agent",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAgent({
      ...agent,
      [e.target.id]: e.target.value,
    });
  };

  const AjouterAgent = async () => {
    const user = authContext.userId;

    if (!user) {
      toast.error("Erreur lors de l'ajout du agent");
      return;
    }

    const data = await createUserWithEmailAndPassword(
      authClient,
      agent.email,
      agent.motDePasse,
    );

    // FIXME : use this to fetch data later
    await addDoc(collection(databaseClient, "agents"), {
      id: data.user.uid,
      ...agent,
      supervisorId: authContext.userId,
    });

    await updateDoc(doc(databaseClient, "users", user), {
      agents: arrayUnion({
        id: data.user.uid,
        ...agent,
      }),
    })
      .then(() => {
        ajouterAgent({
          ...agent,
        });
        toast.success("Agent ajouté avec succès");
        hide();
      })
      .catch(() => {
        toast.error("Erreur lors de l'ajout du agent");
      });
  };

  return (
    <Form>
      <Form.Group className="mb-3" controlId="nom">
        <Form.Label>Nom</Form.Label>
        <Form.Control onChange={handleChange} type="text" />
      </Form.Group>
      <Form.Group className="mb-3" controlId="prenom">
        <Form.Label>Prenom</Form.Label>
        <Form.Control onChange={handleChange} type="text" />
      </Form.Group>
      <Form.Group className="mb-3" controlId="email">
        <Form.Label>Email</Form.Label>
        <Form.Control onChange={handleChange} type="email" />
      </Form.Group>
      <Form.Group className="mb-3" controlId="numeroCIN">
        <Form.Label>Numero CIN</Form.Label>
        <Form.Control onChange={handleChange} type="tel" />
      </Form.Group>
      <Form.Group className="mb-3" controlId="telephone">
        <Form.Label>Telephone</Form.Label>
        <Form.Control onChange={handleChange} type="number" />
      </Form.Group>
      <Form.Group className="mb-3" controlId="motDePasse">
        <Form.Label>Mot De Passe</Form.Label>
        <Form.Control onChange={handleChange} type="password" />
      </Form.Group>
      <Button
        style={{
          marginTop: "20px",
        }}
        onClick={AjouterAgent}
      >
        Ajouter
      </Button>
    </Form>
  );
};
