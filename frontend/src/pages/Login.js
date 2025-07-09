// src/pages/Login.js - Versión con CSS puro
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { authService } from "../services/authService";
import { useAuthContext } from "../context/AuthContext"; // 🎯 AÑADIR: Usar contexto
import { useGeolocation } from "../hooks/useGeolocation";
import LocationMap from "../components/auth/LocationMap";
import "../styles/Login.css"; // Importar los estilos CSS

const Login = () => {
  const navigate = useNavigate();

  // 🎯 CAMBIO: Usar TANTO el hook como el contexto
  const { login, loading, error, authStep, clearError, setError } = useAuth();
  const { login: contextLogin, isAuthenticated } = useAuthContext();

  const {
    location,
    getCurrentPosition,
    error: locationError,
  } = useGeolocation();
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);

  const [showLocationDetails, setShowLocationDetails] = useState(false);
  const [isInArea, setIsInArea] = useState(true);
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });

  // 🎯 CRÍTICO: Redirigir si ya está autenticado
  useEffect(() => {
    console.log("🔍 Login - Estado de autenticación:", {
      isAuthenticated,
      loading,
    });

    if (isAuthenticated && !loading) {
      console.log("✅ Usuario ya autenticado, redirigiendo a home...");
      navigate("/home", { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  // Verificar ubicación cuando se obtiene
  useEffect(() => {
    if (location) {
      const checkLocation = async () => {
        try {
          const result = await authService.checkGeofence(
            location.lat,
            location.lng
          );
          console.log("🔍 Resultado inicial de geocerca:", result);
          setIsInArea(result.isInside);

          if (!result.isInside) {
            setError("No estás dentro de un área permitida");
          }
        } catch (error) {
          console.error("Error inicial verificando ubicación:", error);
          setIsInArea(false);
          setError("Error verificando ubicación");
        }
      };

      checkLocation();
    }
  }, [location]);

  // Limpiar errores cuando el usuario empiece a escribir
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (credentials.username && credentials.password && !loading) {
      try {
        clearError();
        console.log("🚀 Iniciando proceso de login...");

        // 1. Ejecutar login del hook useAuth
        const result = await login(credentials);
        console.log("📊 Resultado del login:", result);

        if (result.success && result.user) {
          // 2. 🎯 CRÍTICO: Actualizar contexto también
          console.log("✅ Actualizando contexto con usuario:", result.user);
          contextLogin(result.user);

          // 3. Forzar redirección
          console.log("🔄 Forzando redirección a /home...");
          navigate("/home", { replace: true });
        }
      } catch (err) {
        console.error("❌ Error en login:", err);
        // El error ya está manejado por useAuth
      }
    }
  };

  const handleInputChange = (field) => (e) => {
    setCredentials((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const handleCheckLocation = async () => {
    try {
      setIsCheckingLocation(true);
      setError(null);

      const position = await getCurrentPosition();
      const result = await authService.checkGeofence(
        position.lat,
        position.lng
      );

      setIsInArea(result.isInside);
      setShowLocationDetails(true);

      if (!result.isInside) {
        setError("No estás dentro de un área permitida");
      }
    } catch (err) {
      console.error("Error verificando ubicación:", err);
      setError("Error al verificar tu ubicación");
      setIsInArea(false);
    } finally {
      setIsCheckingLocation(false);
    }
  };

  const getStepMessages = () => ({
    location: "Verificando ubicación...",
    device: "Verificando dispositivo...",
    credentials: "Autenticando credenciales...",
    success: "Acceso autorizado",
  });

  const stepMessages = getStepMessages();

  // 🎯 AÑADIR: Mostrar estado de loading durante redirección
  if (isAuthenticated && loading) {
    return (
      <div className="login-container">
        <div style={{ textAlign: "center" }}>
          <div className="spinner"></div>
          <p>Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-wrapper">
        {/* Header */}
        <div className="login-header" style={{ gridColumn: "1 / -1" }}>
          <h1 className="login-title">Sistema de Acceso Seguro</h1>
          <p className="login-subtitle">
            Autenticación con verificación de ubicación y dispositivo
          </p>
        </div>

        {/* Formulario de login */}
        <div>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Iniciar Sesión</h2>
            </div>

            {loading && (
              <div className="alert alert-info">
                <div className="loading-container">
                  <div className="spinner"></div>
                  <div className="loading-text">
                    {stepMessages[authStep] || "Procesando..."}
                  </div>
                </div>
              </div>
            )}

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="username" className="form-label">
                  Usuario
                </label>
                <input
                  id="username"
                  type="text"
                  value={credentials.username}
                  onChange={handleInputChange("username")}
                  placeholder="usuario@empresa.com"
                  disabled={loading}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  value={credentials.password}
                  onChange={handleInputChange("password")}
                  placeholder="••••••••"
                  disabled={loading}
                  className="form-input"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={
                  !credentials.username || !credentials.password || loading
                }
                className="btn btn-primary"
              >
                {loading ? "Verificando..." : "Ingresar"}
              </button>
            </form>           

            {!location && !loading && (
              <div className="text-center mt-4">
                <button
                  onClick={handleCheckLocation}
                  className="btn-link"
                  disabled={isCheckingLocation}
                >
                  {isCheckingLocation ? (
                    <>
                      <span className="spinner-border spinner-border-sm mr-2"></span>
                      Verificando...
                    </>
                  ) : (
                    "Verificar mi ubicación"
                  )}
                </button>
              </div>
            )}

            <div className="text-center mt-4">
              <p className="text-sm text-gray-500">
                Al iniciar sesión, tu ubicación y dispositivo serán verificados
                por seguridad.
              </p>
            </div>

            {/* 🎯 AÑADIR: Debug info en desarrollo */}
            {process.env.NODE_ENV === "development" && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "8px",
                  background: "#f0f0f0",
                  fontSize: "12px",
                }}
              >
                <strong>Debug:</strong>
                <br />
                isAuthenticated: {isAuthenticated ? "true" : "false"}
                <br />
                loading: {loading ? "true" : "false"}
                <br />
                authStep: {authStep}
                <br />
                {/* Debug: user info available in context */}
              </div>
            )}
          </div>
        </div>

        {/* Información de ubicación y proceso */}
        <div>
          {showLocationDetails && location ? (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Verificación de Ubicación</h3>
              </div>

              <div className="location-map-container">
                <div
                  className={`location-status ${
                    isInArea ? "location-authorized" : "location-denied"
                  }`}
                >
                  <span
                    className={`status-dot ${
                      isInArea ? "status-dot-green" : "status-dot-red"
                    }`}
                  ></span>
                  {isInArea
                    ? "Ubicación autorizada"
                    : "Fuera del área permitida"}
                </div>

                <LocationMap
                  location={location}
                  isInArea={isInArea}
                  width="100%"
                  height="300px"
                />
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Proceso de Autenticación</h3>
              </div>

              <div className="auth-steps">
                <div className="auth-step">
                  <div
                    className={`step-number ${
                      authStep === "location"
                        ? "step-active"
                        : ["device", "credentials", "success"].includes(
                            authStep
                          )
                        ? "step-completed"
                        : "step-inactive"
                    }`}
                  >
                    1
                  </div>
                  <div className="step-content">
                    <div className="step-title">Verificación de Ubicación</div>
                    <div className="step-description">
                      Confirmar que estás en una zona permitida
                    </div>
                  </div>
                </div>

                <div className="auth-step">
                  <div
                    className={`step-number ${
                      authStep === "device"
                        ? "step-active"
                        : ["credentials", "success"].includes(authStep)
                        ? "step-completed"
                        : "step-inactive"
                    }`}
                  >
                    2
                  </div>
                  <div className="step-content">
                    <div className="step-title">
                      Verificación de Dispositivo
                    </div>
                    <div className="step-description">
                      Validar que el dispositivo está autorizado
                    </div>
                  </div>
                </div>

                <div className="auth-step">
                  <div
                    className={`step-number ${
                      authStep === "credentials"
                        ? "step-active"
                        : authStep === "success"
                        ? "step-completed"
                        : "step-inactive"
                    }`}
                  >
                    3
                  </div>
                  <div className="step-content">
                    <div className="step-title">
                      Autenticación de Credenciales
                    </div>
                    <div className="step-description">
                      Verificar usuario y contraseña con Active Directory
                    </div>
                  </div>
                </div>

                <div className="auth-step">
                  <div
                    className={`step-number ${
                      authStep === "success"
                        ? "step-completed"
                        : "step-inactive"
                    }`}
                  >
                    ✓
                  </div>
                  <div className="step-content">
                    <div className="step-title">Acceso Autorizado</div>
                    <div className="step-description">
                      Bienvenido al sistema
                    </div>
                  </div>
                </div>
              </div>

              {loading && (
                <div
                  style={{
                    marginTop: "24px",
                    paddingTop: "16px",
                    borderTop: "1px solid #e5e7eb",
                  }}
                >
                  <div className="loading-container">
                    <div className="spinner"></div>
                    <div className="loading-text">
                      Procesando autenticación...
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Información adicional */}
        <div className="info-footer" style={{ gridColumn: "1 / -1" }}>
          <div className="info-card">
            <p className="info-text">
              <span className="info-highlight">Seguridad Multi-Factor:</span>{" "}
              Este sistema utiliza verificación de ubicación, identificación de
              dispositivo y autenticación de Active Directory para garantizar el
              acceso autorizado.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
