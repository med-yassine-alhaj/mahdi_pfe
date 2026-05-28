import { CiUser } from "react-icons/ci";
import { useEffect, useState } from "react";
import { databaseClient, secondaryAuth } from "../firebaseConfig";
import { Button, Card, Col, Container, Form, Modal, Row } from "react-bootstrap";
import {
  collection,
  deleteDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  updateEmail,
  updatePassword,
  signOut,
  deleteUser,
} from "firebase/auth";
import { MdDelete, MdEdit } from "react-icons/md";
import {
  FaUsers, FaUserTie, FaTruck, FaRoute, FaCheckCircle,
} from "react-icons/fa";
import toast from "react-hot-toast";
import "./UsersPage.css";

type UserDocument = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  ville: { nom: string };
  role?: string;
  password?: string;
  agents?: unknown[];
  camions?: unknown[];
};

// ─── Admin dashboard stats ──────────────────────────────────────────────────

type AdminStats = {
  supervisors: number;
  totalAgents: number;
  totalCamions: number;
  totalTournees: number;
  totalRealisees: number;
};

const AdminDashboard = ({ users }: { users: UserDocument[] }) => {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const totalAgents = users.reduce(
        (sum, u) => sum + (u.agents?.length ?? 0), 0
      );
      const totalCamions = users.reduce(
        (sum, u) => sum + (u.camions?.length ?? 0), 0
      );

      const [tourneesSnap, realiseesSnap] = await Promise.all([
        getDocs(collection(databaseClient, "tournees")),
        getDocs(collection(databaseClient, "tourneesRealisees")),
      ]);

      setStats({
        supervisors: users.length,
        totalAgents,
        totalCamions,
        totalTournees: tourneesSnap.size,
        totalRealisees: realiseesSnap.size,
      });
    };

    if (users.length > 0) fetchStats();
    else setStats({ supervisors: 0, totalAgents: 0, totalCamions: 0, totalTournees: 0, totalRealisees: 0 });
  }, [users]);

  const cards = stats
    ? [
        { label: "Superviseurs", value: stats.supervisors, icon: <FaUsers />, color: "#3b82f6" },
        { label: "Agents (total)", value: stats.totalAgents, icon: <FaUserTie />, color: "#10b981" },
        { label: "Camions (total)", value: stats.totalCamions, icon: <FaTruck />, color: "#f59e0b" },
        { label: "Tournées planifiées", value: stats.totalTournees, icon: <FaRoute />, color: "#8b5cf6" },
        { label: "Tournées réalisées", value: stats.totalRealisees, icon: <FaCheckCircle />, color: "#06b6d4" },
      ]
    : [];

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-header">
        <h4 className="admin-dashboard-title">Vue d'ensemble — Administration</h4>
        <p className="admin-dashboard-sub">Statistiques globales de la plateforme</p>
      </div>
      <div className="admin-stats-grid">
        {stats === null ? (
          <div className="admin-loading">Chargement...</div>
        ) : (
          cards.map((c) => (
            <div className="admin-stat-card" key={c.label}>
              <div
                className="admin-stat-icon"
                style={{ background: `${c.color}20`, color: c.color }}
              >
                {c.icon}
              </div>
              <div className="admin-stat-info">
                <div className="admin-stat-value">{c.value}</div>
                <div className="admin-stat-label">{c.label}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ─── Users page ──────────────────────────────────────────────────────────────

export const UsersPage = () => {
  const [showEdit, setShowEdit] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserDocument | null>(null);
  const [users, setUsers] = useState<UserDocument[]>([]);

  const fetchUsers = async () => {
    const snap = await getDocs(query(collection(databaseClient, "users")));
    const all = snap.docs.map((d) => ({ id: d.data().id, ...d.data() })) as UserDocument[];
    setUsers(all.filter((u) => u.role !== "admin"));
  };

  const handleDelete = async (userId: string, email: string, password?: string) => {
    try {
      // 1. Delete from Firebase Auth via secondary instance
      if (password) {
        try {
          const cred = await signInWithEmailAndPassword(secondaryAuth, email, password);
          await deleteUser(cred.user);
          await signOut(secondaryAuth).catch(() => {});
        } catch {
          await signOut(secondaryAuth).catch(() => {});
          toast.error("Impossible de supprimer de Firebase Auth — supprimé de Firestore uniquement.");
        }
      }

      // 2. Delete from Firestore
      const snap = await getDocs(
        query(collection(databaseClient, "users"), where("id", "==", userId))
      );
      if (snap.docs[0]) {
        await deleteDoc(snap.docs[0].ref);
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        toast.success("Superviseur supprimé avec succès");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la suppression");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="users-page mt-4">
      {/* Edit modal */}
      <Modal show={showEdit} onHide={() => setShowEdit(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Modifier superviseur</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUser && (
            <UpdateUser
              user={selectedUser}
              onSaved={(updated) => {
                setUsers((prev) =>
                  prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u))
                );
                setShowEdit(false);
              }}
            />
          )}
        </Modal.Body>
      </Modal>

      <Container fluid>
        {/* Admin dashboard */}
        <AdminDashboard users={users} />

        {/* User list */}
        <div className="users-list-header">
          <h5 className="users-list-title">Liste des superviseurs</h5>
        </div>

        <Row className="mt-3" xs={1} md={2} lg={3}>
          {users.map((user, index) => (
            <Col key={index} className="mb-3">
              <Card className="user-card h-100">
                <Card.Body>
                  <div className="user-card-top">
                    <div className="user-avatar">
                      <CiUser size={28} />
                    </div>
                    <div className="user-info">
                      <div className="user-name">
                        {user.nom} {user.prenom}
                      </div>
                      <div className="user-email">{user.email}</div>
                      <div className="user-meta">
                        <span className="user-ville">📍 {user.ville?.nom}</span>
                        <span className="user-counts">
                          {user.agents?.length ?? 0} agents · {user.camions?.length ?? 0} camions
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="user-card-actions">
                    <MdEdit
                      size={22}
                      cursor="pointer"
                      color="#3b82f6"
                      onClick={() => {
                        setSelectedUser(user);
                        setShowEdit(true);
                      }}
                    />
                    <MdDelete
                      size={22}
                      cursor="pointer"
                      color="#ef4444"
                      onClick={() => handleDelete(user.id, user.email, user.password)}
                    />
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>
    </div>
  );
};

// ─── Update user modal form ──────────────────────────────────────────────────

type UpdateUserProps = {
  user: UserDocument;
  onSaved: (updated: Partial<UserDocument>) => void;
};

const UpdateUser: React.FC<UpdateUserProps> = ({ user, onSaved }) => {
  const [nom, setNom] = useState(user.nom);
  const [prenom, setPrenom] = useState(user.prenom);
  const [ville, setVille] = useState(user.ville?.nom ?? "");
  const [email, setEmail] = useState(user.email);
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState(user.password ?? "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    let authUpdated = false;
    const emailChanged = email !== user.email;
    const passwordChanged = newPassword.length > 0;

    // 1. Update Firebase Auth (email / password) via secondary instance
    if ((emailChanged || passwordChanged) && currentPassword) {
      try {
        const cred = await signInWithEmailAndPassword(
          secondaryAuth, user.email, currentPassword
        );
        const authUser = cred.user;

        if (emailChanged) await updateEmail(authUser, email);
        if (passwordChanged) await updatePassword(authUser, newPassword);
        await signOut(secondaryAuth);
        authUpdated = true;
      } catch (authErr: unknown) {
        await signOut(secondaryAuth).catch(() => {});
        const code = (authErr as { code?: string })?.code ?? "";
        if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
          toast.error("Mot de passe actuel incorrect — Firestore mis à jour uniquement.");
        } else if (code === "auth/email-already-in-use") {
          toast.error("Cet email est déjà utilisé.");
          setSaving(false);
          return;
        } else if (code === "auth/operation-not-allowed") {
          toast.error(
            "Firebase bloque la modification d'email. " +
            "Désactivez 'Email enumeration protection' dans Firebase Console → Authentication → Settings."
          );
        } else {
          console.error(authErr);
          toast.error("Erreur Firebase Auth — Firestore mis à jour uniquement.");
        }
      }
    }

    // 2. Update Firestore document
    try {
      const snap = await getDocs(
        query(collection(databaseClient, "users"), where("id", "==", user.id))
      );
      const firestoreDoc = snap.docs[0];
      if (!firestoreDoc) {
        toast.error("Utilisateur introuvable dans Firestore.");
        setSaving(false);
        return;
      }

      await updateDoc(firestoreDoc.ref, {
        nom,
        prenom,
        ville: { nom: ville },
        email,
        ...(passwordChanged
          ? { password: newPassword }
          : user.password
          ? { password: user.password }
          : {}),
      });

      if (authUpdated) {
        toast.success("Superviseur mis à jour (Auth + Firestore)");
      } else {
        toast.success("Données Firestore mises à jour.");
      }

      onSaved({ nom, prenom, email, ville: { nom: ville } });
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la mise à jour Firestore.");
    }
    setSaving(false);
  };

  return (
    <Form>
      <Form.Group className="mb-3">
        <Form.Label>Nom</Form.Label>
        <Form.Control value={nom} onChange={(e) => setNom(e.target.value)} />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Prénom</Form.Label>
        <Form.Control value={prenom} onChange={(e) => setPrenom(e.target.value)} />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Ville</Form.Label>
        <Form.Control value={ville} onChange={(e) => setVille(e.target.value)} />
      </Form.Group>

      <hr />

      <Form.Group className="mb-3">
        <Form.Label>Email</Form.Label>
        <Form.Control
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Nouveau mot de passe</Form.Label>
        <Form.Control
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Laisser vide pour ne pas modifier"
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Mot de passe actuel (requis pour modifier email/mdp)</Form.Label>
        <Form.Control
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Mot de passe actuel du superviseur"
        />
        {!user.password && (
          <Form.Text className="text-muted">
            Non enregistré — saisissez-le manuellement pour pouvoir modifier les credentials Firebase.
          </Form.Text>
        )}
      </Form.Group>

      <Button variant="primary" onClick={handleSubmit} disabled={saving}>
        {saving ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </Form>
  );
};
