// AuthProvider.js
import PropTypes from "prop-types";
import { authClient, databaseClient } from "../firebaseConfig";
import { createContext, useEffect, useState } from "react";
import {
  User,
  UserCredential,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

type AuthContextProps = {
  userId: string;
  user: User | null;
  role: "admin" | "superviseur" | "_";
  loading: boolean;
  loginUser: (email: string, password: string) => Promise<UserCredential>;
  logOut: () => Promise<void>;
  setRole: (role: "admin" | "superviseur") => void;
  setAuthUserId: (id: string) => void;
  loadAuth: () => void;
};
export const AuthContext = createContext<AuthContextProps | null>(null);
type AuthProviderProps = {
  children: React.ReactNode;
};

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"admin" | "superviseur" | "_">("_");
  const [userId, setUserId] = useState<string>("");
  const navigate = useNavigate();

  const loginUser = (email: string, password: string) => {
    setLoading(true);
    return signInWithEmailAndPassword(authClient, email, password);
  };

  const logOut = async () => {
    setLoading(true);
    setUser(null);
    setRole("_");
    setUserId("");
    await signOut(authClient);
    navigate("/login");
  };

  const setUserRole = (role: "admin" | "superviseur") => {
    setRole(role);
  };

  const setAuthUserId = (id: string) => {
    setUserId(id);
  };

  const persistAuth = () => {
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: user,
        role: role,
        userId: userId,
      }),
    );
  };

  const loadAuth = () => {
    const authData = localStorage.getItem("role");
    if (authData) {
      const auth = JSON.parse(authData);
      setUser(auth.user);
      setRole(auth.role);
      setUserId(auth.userId);
    }
  };

  useEffect(() => {
    persistAuth();
  }, [user, role, userId]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(authClient, async (currentUser) => {
      setUser(currentUser);

      if (!currentUser?.uid) {
        setLoading(false);
        return;
      }

      const usersCollection = collection(databaseClient, "users");
      const docSnap = query(
        usersCollection,
        where("id", "==", currentUser.uid),
      );

      getDocs(docSnap).then((querySnapshot) => {
        if (querySnapshot.docs.length === 0) {
          setLoading(false);
          return;
        }
        const userDoc = querySnapshot.docs[0];
        const userRole = userDoc.data().role;
        if (userRole === "admin") {
          setRole("admin");
          setAuthUserId(userDoc.id);
        } else if (userRole === "superviseur") {
          setRole("superviseur");
          setAuthUserId(userDoc.id);
        }
        setLoading(false);
      });
    });

    loadAuth();

    return () => {
      unsubscribe();
    };
  }, []);

  const authValue = {
    user,
    loginUser,
    logOut,
    loading,
    setRole: setUserRole,
    role,
    userId,
    setAuthUserId,
    loadAuth,
  };

  return (
    <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthProvider;
