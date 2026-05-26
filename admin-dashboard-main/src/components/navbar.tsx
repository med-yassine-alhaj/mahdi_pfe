import "./DashboardNavbar.css";
import { useContext } from "react";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import { useNavigate } from "react-router-dom";
import Container from "react-bootstrap/Container";
import { AuthContext } from "../auth/AuthContext";
import NavDropdown from "react-bootstrap/NavDropdown";

import {
  FaUsers,
  FaUserPlus,
  FaTruck,
  FaUserTie,
  FaMapMarkerAlt,
  FaSignOutAlt,
  FaHome,
} from "react-icons/fa";

import { HiOutlineLocationMarker } from "react-icons/hi";

function DashboardNavbar() {
  const navigate = useNavigate();
  const authContext = useContext(AuthContext)!;

  return (
    <Navbar collapseOnSelect expand="md" className="custom-navbar">
      <Container
        style={{
          minHeight: "50px",
        }}
      >
        {authContext.role !== "_" && (
          <Navbar.Brand
            style={{
              cursor: "pointer",
              marginRight: "100px",
            }}
          >
            <FaHome size={30} />
          </Navbar.Brand>
        )}

        {authContext.role !== "_" && (
          <Navbar.Toggle aria-controls="responsive-navbar-nav" />
        )}

        <Navbar.Collapse id="responsive-navbar-nav">
          <Nav className="me-auto">
            {authContext.role === "admin" && (
              <NavDropdown title="Users" id="admin-nav-dropdown">
                <NavDropdown.Item onClick={() => navigate("/users")}>
                  <FaUsers className="me-2" />
                  Users
                </NavDropdown.Item>
                <NavDropdown.Item onClick={() => navigate("/users/add")}>
                  <FaUserPlus className="me-2" />
                  Add User
                </NavDropdown.Item>
              </NavDropdown>
            )}
            {authContext.role === "superviseur" && (
              <>
                <Nav.Link className="me-3" onClick={() => navigate("/camions")}>
                  <FaTruck className="me-2" />
                  Camions
                </Nav.Link>
                <Nav.Link className="me-3" onClick={() => navigate("/agents")}>
                  <FaUserTie className="me-2" />
                  Agents
                </Nav.Link>
                <Nav.Link className="me-3" onClick={() => navigate("/pdc")}>
                  <FaMapMarkerAlt className="me-2" />
                  Centres De Depots
                </Nav.Link>
                <Nav.Link
                  className="me-3"
                  onClick={() => navigate("/tournees")}
                >
                  <FaMapMarkerAlt className="me-2" />
                  Tournées
                </Nav.Link>
                <Nav.Link
                  className="me-3"
                  onClick={() => navigate("/tracking")}
                >
                  <HiOutlineLocationMarker className="me-2" />
                  Tracking
                </Nav.Link>

                <Nav.Link
                  className="me-3"
                  onClick={() => navigate("/tournees/realisees")}
                >
                  <HiOutlineLocationMarker className="me-2" />
                  Tournées Realisees
                </Nav.Link>
                <Nav.Link
                  className="me-3"
                  onClick={() => navigate("/incidents")}
                >
                  <HiOutlineLocationMarker className="me-2" />
                  Incidents
                </Nav.Link>
              </>
            )}
          </Nav>
          <Nav>
            {authContext.role !== "_" && (
              <Nav.Link
                onClick={() => {
                  authContext.logOut();
                }}
              >
                <FaSignOutAlt className="me-2" />
                Déconnecter
              </Nav.Link>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default DashboardNavbar;
