import { LoginPage } from "./auth/LoginPage";
import { Route, Routes, useLocation } from "react-router-dom";
import { PageAgents } from "./agents/PageAgents";
import Sidebar from "./components/Sidebar";
import { PageCamions } from "./camions/PageCamions";
import "./app.css";
import { RoleGuard } from "./auth/AuthGuard";
import { AddUser } from "./manageUsers/AddUser";
import { UsersPage } from "./manageUsers/UsersPage";
import { Tournee } from "./tournee/Tournee";
import { ListTournees } from "./tournee/ListTournees";
import { PageTracking } from "./tracking/Tracking";
import { TourneesRealisees } from "./tourneesRealisees/TourneesRealisees";
import { Incidents } from "./incident/Incidents";
import { CentreDeDepot } from "./CentreDeDepot/PagePointsDeCollect";
import { Dashboard } from "./dashboard/Dashboard";
import { TopBar } from "./components/TopBar";
import { useContext } from "react";
import { AuthContext } from "./auth/AuthContext";

function App() {
  const location = useLocation();
  const authContext = useContext(AuthContext)!;
  const isLoginPage = location.pathname === "/login" || authContext.role === "_";

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--bg-main)" }}>
      {!isLoginPage && <Sidebar />}
      <div style={{ flex: 1, marginLeft: isLoginPage ? 0 : "240px", padding: isLoginPage ? 0 : "28px", backgroundColor: "var(--bg-main)", transition: "background-color 0.25s" }}>
        {!isLoginPage && <TopBar />}
        <Routes>
          <Route
            path="/"
            element={
              <RoleGuard role="superviseur">
                <Dashboard />
              </RoleGuard>
            }
          />
          <Route
            path="/camions"
            element={
              <RoleGuard role="superviseur">
                <PageCamions />
              </RoleGuard>
            }
          />
          <Route
            path="/agents"
            element={
              <RoleGuard role="superviseur">
                <PageAgents />
              </RoleGuard>
            }
          />
          <Route
            path="/pdc"
            element={
              <RoleGuard role="superviseur">
                <CentreDeDepot />
              </RoleGuard>
            }
          />
          <Route
            path="/users"
            element={
              <RoleGuard role="admin">
                <UsersPage />
              </RoleGuard>
            }
          />
          <Route
            path="/users/add"
            element={
              <RoleGuard role="admin">
                <AddUser />
              </RoleGuard>
            }
          />
          <Route
            path="/tournees"
            element={
              <RoleGuard role="superviseur">
                <ListTournees />
              </RoleGuard>
            }
          />
          <Route
            path="/tournees/ajouter"
            element={
              <RoleGuard role="superviseur">
                <Tournee />
              </RoleGuard>
            }
          />
          <Route path="/tournees/realisees" element={<TourneesRealisees />} />
          <Route
            path="/tracking"
            element={
              <RoleGuard role="superviseur">
                <PageTracking />
              </RoleGuard>
            }
          />
          <Route
            path="/incidents"
            element={
              <RoleGuard role="superviseur">
                <Incidents />
              </RoleGuard>
            }
          />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
