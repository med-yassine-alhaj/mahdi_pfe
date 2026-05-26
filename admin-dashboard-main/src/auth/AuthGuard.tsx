import { useContext } from "react";
import { LoginPage } from "./LoginPage";
import { AuthContext } from "./AuthContext";

export const AuthGuard: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { user } = useContext(AuthContext)!;

  if (!user) return <LoginPage />;

  return <>{children}</>;
};

export const RoleGuard: React.FC<{
  role: string;
  children: React.ReactNode;
}> = ({ role, children }) => {
  const { role: userRole } = useContext(AuthContext)!;

  if (userRole !== role) return <LoginPage />;

  return <>{children}</>;
};
