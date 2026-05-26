import { useContext, useState } from "react";
import { Form, Button, Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { AuthContext } from "./AuthContext";
import { collection, getDocs, query, where } from "firebase/firestore";
import { databaseClient } from "../firebaseConfig";
import "./LoginPage.css";

export const LoginPage = () => {
  const [credentials, setCredentials] = useState({ email: "", password: "" });

  const authContext = useContext(AuthContext)!;
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    authContext
      .loginUser(credentials.email, credentials.password)
      .then(async (user) => {
        // check user saved role on firestore
        const usersCollection = collection(databaseClient, "users");
        const docSnap = query(
          usersCollection,
          where("id", "==", user.user?.uid),
        );

        await getDocs(docSnap).then((querySnapshot) => {
          if (querySnapshot.docs[0].data().role === "admin") {
            authContext.setRole("admin");
            authContext.setAuthUserId(querySnapshot.docs[0].id);
            navigate("/");
            return;
          } else if (querySnapshot.docs[0].data().role === "superviseur") {
            authContext.setRole("superviseur");
            authContext.setAuthUserId(querySnapshot.docs[0].id);
            navigate("/");
            return;
          }
        });
      })
      .catch(() => {
        toast.error("Erreur lors de la connexion");
      });
  };

  return (
    <div className="login-page">
      <Container className="d-flex justify-content-center align-items-center login-container">
        <div className="login-form">
          <h2>Connectez-vous</h2>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="formBasicEmail">
              <Form.Label>Addresse email</Form.Label>
              <Form.Control
                name="email"
                onChange={(e) =>
                  setCredentials({ ...credentials, email: e.target.value })
                }
                type="email"
                placeholder="Entrez votre email"
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="formBasicPassword">
              <Form.Label>Mot de passe</Form.Label>
              <Form.Control
                name="password"
                type="password"
                placeholder="Mot de passe"
                onChange={(e) =>
                  setCredentials({ ...credentials, password: e.target.value })
                }
              />
            </Form.Group>
            <Button variant="primary" type="submit" className="login-button">
              Connexion
            </Button>
          </Form>
        </div>
      </Container>
    </div>
  );
};
