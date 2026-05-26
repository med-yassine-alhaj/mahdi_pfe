import { useState } from "react";
import toast from "react-hot-toast";
import { Button, Form } from "react-bootstrap";
import { addDoc, collection } from "firebase/firestore";
import { authClient, databaseClient } from "../firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";

export const AddUser = () => {
  const [input, setInput] = useState({
    nom: "",
    prenom: "",
    email: "",
    password: "",
    ville: "",
    role: "superviseur",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput({
      ...input,
      [e.target.id]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    // save user to firebase auth
    try {
      const data = await createUserWithEmailAndPassword(
        authClient,
        input.email,
        input.password,
      );

      const user: {
        id: string;
        nom: string;
        prenom: string;
        email: string;
        ville: {
          nom: string;
        };
        role: string;
        agents: [];
        camions: [];
        pointsDeCollect: [];
      } = {
        id: data.user.uid,
        nom: input.nom,
        prenom: input.prenom,
        email: input.email,
        ville: {
          nom: input.ville,
        },
        role: input.role,
        agents: [],
        camions: [],
        pointsDeCollect: [],
      };

      // save user to firestore
      await addDoc(collection(databaseClient, "users"), {
        ...user,
      });

      toast.success("Utilisateur ajouté avec succès");
    } catch (e) {
      toast.error("Erreur lors de l'ajout de l'utilisateur");
    }
  };

  return (
    <div
      style={{
        padding: "40px 100px",
      }}
    >
      <h1>Ajouter un utilisateur</h1>
      <Form
        style={{
          marginBottom: "50px",
        }}
      >
        <Form.Group className="mb-3" controlId="nom">
          <Form.Label>First name</Form.Label>
          <Form.Control onChange={handleChange} type="text" />
        </Form.Group>
        <Form.Group className="mb-3" controlId="prenom">
          <Form.Label>Last name</Form.Label>
          <Form.Control onChange={handleChange} type="text" />
        </Form.Group>
        <Form.Group className="mb-3" controlId="email">
          <Form.Label>Email</Form.Label>
          <Form.Control onChange={handleChange} type="text" />
        </Form.Group>
        <Form.Group className="mb-3" controlId="password">
          <Form.Label>Password</Form.Label>
          <Form.Control onChange={handleChange} type="password" />
        </Form.Group>
        <Form.Group className="mb-3" controlId="ville">
          <Form.Label>City</Form.Label>
          <Form.Control onChange={handleChange} type="text" />
        </Form.Group>
        <Button
          style={{
            marginTop: "20px",
          }}
          onClick={handleSubmit}
        >
          Ajouter
        </Button>
      </Form>
    </div>
  );
};
