import React, { useState } from "react";
//import { useNavigate } from "react-router-dom";
import { isWithinArea, polygonCoordinates } from "./utils/geoCheck";
import { MapContainer, TileLayer, Polygon, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const Login = () => {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [location, setLocation] = useState(null);
  const [isInArea, setIsInArea] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  //const navigate = useNavigate();

  const userIcon = new L.Icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Verificar campos vacíos
      if (!user || !pass) {
        setError("Usuario y contraseña son requeridos");
        setIsLoading(false);
        return;
      }

      // Obtener ubicación
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000, // 10 segundos de timeout
          enableHighAccuracy: true,
        });
      });

      const { latitude, longitude } = position.coords;
      setLocation({ lat: latitude, lng: longitude });

      // Verificar área permitida
      const inside = isWithinArea(latitude, longitude);
      setIsInArea(inside);

      if (!inside) {
        setError("Estás fuera del área permitida para iniciar sesión.");
        setIsLoading(false);
        return;
      }

      const credentials = {
        username: user.trim(),
        password: pass, // ¡No hagas esto en producción!
      };

      console.log("Credenciales enviadas al backend:", credentials);

      // Intentar autenticación
      const response = await fetch("http://localhost:3001/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          username: user.trim(),
          password: pass,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Error del servidor:", {
          status: response.status,
          statusText: response.statusText,
          data: data,
        });

        throw new Error(
          data.error ||
            data.message ||
            `Error del servidor: ${response.status} ${response.statusText}`
        );
      }

      if (data.success) {
        localStorage.setItem("user", JSON.stringify(data.user));
        // Redirección a Moodle con token
        window.location.href = data.redirect;
      } else {
        setError(data.error || "Usuario o contraseña incorrectos");
      }
    } catch (err) {
      console.error("Error completo durante el login:", err);
      setError(
        err.message.includes("Failed to fetch")
          ? "No se pudo conectar con el servidor. Intente nuevamente."
          : err.message
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Convertir coordenadas [lng, lat] a [lat, lng] para Leaflet
  const leafletPolygon = polygonCoordinates.map((coord) => [
    coord[1],
    coord[0],
  ]);

  return (
    <div
      style={{
        textAlign: "center",
        maxWidth: "400px",
        margin: "0 auto",
        padding: "20px",
        boxShadow: "0 0 10px rgba(0,0,0,0.1)",
        borderRadius: "8px",
      }}
    >
      <h2 style={{ color: "#333", marginBottom: "20px" }}>Inicio de Sesión</h2>

      <form
        onSubmit={handleLogin}
        style={{ display: "flex", flexDirection: "column", gap: "15px" }}
      >
        <input
          placeholder="Usuario"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          style={{
            padding: "10px",
            borderRadius: "4px",
            border: "1px solid #ddd",
            fontSize: "16px",
          }}
        />

        <input
          placeholder="Contraseña"
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          style={{
            padding: "10px",
            borderRadius: "4px",
            border: "1px solid #ddd",
            fontSize: "16px",
          }}
        />

        <button
          type="submit"
          disabled={isLoading}
          style={{
            padding: "12px",
            backgroundColor: isLoading ? "#cccccc" : "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: isLoading ? "not-allowed" : "pointer",
            fontSize: "16px",
            fontWeight: "bold",
          }}
        >
          {isLoading ? "Cargando..." : "Ingresar"}
        </button>
      </form>

      {error && (
        <p
          style={{
            color: "#ff3333",
            marginTop: "15px",
            padding: "10px",
            backgroundColor: "#ffeeee",
            borderRadius: "4px",
          }}
        >
          {error}
        </p>
      )}

      {!isInArea && location && (
        <div style={{ marginTop: "20px" }}>
          <h4 style={{ color: "#ff3333" }}>Ubicación no permitida</h4>
          <div
            style={{
              width: "100%",
              height: "300px",
              marginTop: "15px",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            <MapContainer
              center={[location.lat, location.lng]}
              zoom={17}
              style={{ width: "100%", height: "100%" }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <Polygon
                positions={leafletPolygon}
                color="green"
                fillOpacity={0.3}
              />
              <Marker position={[location.lat, location.lng]} icon={userIcon}>
                <Popup>Tu ubicación actual</Popup>
              </Marker>
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
