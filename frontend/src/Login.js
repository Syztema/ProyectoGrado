// src/Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isWithinArea, polygonCoordinates } from './utils/geoCheck';
import { MapContainer, TileLayer, Polygon, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const Login = () => {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [location, setLocation] = useState(null);
  const [isInArea, setIsInArea] = useState(true);
  const navigate = useNavigate();

  /*const userIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/61/61168.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    shadowSize: [41, 41],
  });*/
  const userIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });

  const handleLogin = async () => {
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      setLocation({ lat: latitude, lng: longitude });

      const inside = isWithinArea(latitude, longitude);
      setIsInArea(inside);

      if (!inside) {
        setError('Estás fuera del área permitida para iniciar sesión.');
        return;
      }

      // Aquí se conecta al backend en Node.js (server.js)
      const res = await fetch("http://localhost:3001/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user, password: pass }),
      });

      const data = await res.json();

      if (data.success) {
        navigate("/home");
      } else {
        setError("Usuario o contraseña incorrectos");
      }
    }, (err) => {
      console.error("No se pudo obtener la ubicación", err);
      setError("No se pudo obtener tu ubicación.");
    });
  };

  // Convertir coordenadas [lng, lat] a [lat, lng] para Leaflet
  const leafletPolygon = polygonCoordinates.map(coord => [coord[1], coord[0]]);

  return (
    <div style={{ textAlign: 'center' }}>
      <h2>Login</h2>
      <input
        placeholder="Usuario"
        value={user}
        onChange={e => setUser(e.target.value)}
      /><br/>
      <input
        placeholder="Contraseña"
        type="password"
        value={pass}
        onChange={e => setPass(e.target.value)}
      /><br/>
      <button onClick={handleLogin}>Ingresar</button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {!isInArea && location && (
        <div>
          <div style={{ width: '300px', height: '200px', margin: '20px auto' }}>
            <MapContainer
              center={[location.lat, location.lng]}
              zoom={17}
              style={{ width: '100%', height: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Polygon positions={leafletPolygon} color="green" fillOpacity={0.3} />
              <Marker position={[location.lat, location.lng]} icon={userIcon}>
                <Popup>Tu ubicación</Popup>
              </Marker>
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
