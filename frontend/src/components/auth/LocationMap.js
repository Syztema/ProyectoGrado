// src/components/auth/LocationMap.js
import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { polygonCoordinates } from '../../utils/geoCheck';
import { MAP_CONFIG } from '../../utils/constants';

const LocationMap = ({ location, isInArea, width = '400px', height = '300px' }) => {
  // Crear icono personalizado para el usuario
  const userIcon = useMemo(() => new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png',
    shadowSize: [41, 41],
  }), []);

  // Convertir coordenadas [lng, lat] a [lat, lng] para Leaflet
  const leafletPolygon = useMemo(() => 
    polygonCoordinates.map(coord => [coord[1], coord[0]]), 
    []
  );

  if (!location) {
    return (
      <div 
        style={{ width, height }}
        className="flex items-center justify-center bg-gray-100 border border-gray-300 rounded-lg"
      >
        <p className="text-gray-500">Ubicación no disponible</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-2">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          isInArea 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          <span className={`w-2 h-2 rounded-full mr-2 ${
            isInArea ? 'bg-green-500' : 'bg-red-500'
          }`}></span>
          {isInArea ? 'Ubicación autorizada' : 'Fuera del área permitida'}
        </div>
      </div>
      
      <div style={{ width, height }} className="border border-gray-300 rounded-lg overflow-hidden">
        <MapContainer
          center={[location.lat, location.lng]}
          zoom={MAP_CONFIG.DEFAULT_ZOOM}
          style={{ width: '100%', height: '100%' }}
          zoomControl={true}
          scrollWheelZoom={false}
        >
          <TileLayer
            url={MAP_CONFIG.TILE_LAYER_URL}
            attribution={MAP_CONFIG.TILE_LAYER_ATTRIBUTION}
          />
          
          {/* Polígono del área permitida */}
          <Polygon 
            positions={leafletPolygon} 
            color={isInArea ? "green" : "red"} 
            fillOpacity={0.2}
            weight={2}
          />
          
          {/* Marcador de la ubicación del usuario */}
          <Marker position={[location.lat, location.lng]} icon={userIcon}>
            <Popup>
              <div className="text-center">
                <strong>Tu ubicación</strong><br/>
                <small>
                  Lat: {location.lat.toFixed(6)}<br/>
                  Lng: {location.lng.toFixed(6)}<br/>
                  {location.accuracy && `Precisión: ${Math.round(location.accuracy)}m`}
                </small>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>
      
      {!isInArea && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm font-medium">
            ⚠️ No puedes iniciar sesión desde esta ubicación
          </p>
          <p className="text-red-600 text-xs mt-1">
            Debes estar dentro del área verde marcada en el mapa.
          </p>
        </div>
      )}
    </div>
  );
};

export default LocationMap;