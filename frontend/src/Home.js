// src/Home.js
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon } from 'react-leaflet';
import L from 'leaflet'; // Necesario para trabajar con Leaflet
import 'leaflet/dist/leaflet.css'; // Importar el CSS de Leaflet para los mapas

const Home = () => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Obtener la ubicación actual
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
      },
      (err) => {
        console.error('Error al obtener la ubicación', err);
        setError('No se pudo obtener la ubicación.');
      }
    );
  }, []);

  // Coordenadas del área permitida (polígono)
  const allowedArea = [
    [
      [4.62257642762421, -74.19225918835077],
      [4.619636811071459, -74.19225918835077],
      [4.619636811071459, -74.188251974454],
      [4.62257642762421, -74.188251974454],
      [4.62257642762421, -74.19225918835077]
    ]
  ];

  // Crear un icono personalizado para el marcador
  const markerIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png', // Puedes reemplazar esto con tu propia URL de imagen
    iconSize: [25, 41], // Tamaño del icono
    iconAnchor: [12, 41], // Donde el marcador se "engancha" en el mapa
    popupAnchor: [1, -34], // Ubicación del popup del marcador
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png', // Sombra opcional
    shadowSize: [41, 41], // Tamaño de la sombra
    shadowAnchor: [12, 41], // Donde se coloca la sombra
  });

  return (
    <div style={{ textAlign: 'center' }}>
      <h1>Bienvenido al Home</h1>
      <p>Has iniciado sesión correctamente</p>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* Mapa de la ubicación actual */}
      {location ? (
        <div style={{ width: '100%', height: '400px', margin: '20px 0' }}>
          <MapContainer
            center={[location.lat, location.lng]}
            zoom={15}
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* Usando el icono personalizado */}
            <Marker position={[location.lat, location.lng]} icon={markerIcon}>
              <Popup>
                Tu ubicación actual
              </Popup>
            </Marker>
            <Polygon positions={allowedArea} color="blue" fillOpacity={0.3}>
              <Popup>
                Área permitida para ingresar
              </Popup>
            </Polygon>
          </MapContainer>
        </div>
      ) : (
        <p>Cargando mapa...</p>
      )}
    </div>
  );
};

export default Home;
