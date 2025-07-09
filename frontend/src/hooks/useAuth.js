// src/hooks/useAuth.js
import { useState, useCallback } from "react";
import { authService } from "../services/authService";
import { deviceService } from "../services/deviceService";
import { useGeolocation } from "./useGeolocation";
import { useDeviceFingerprint } from "./useDeviceFingerprint";

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [authStep, setAuthStep] = useState("idle"); // idle, location, device, credentials, success

  const { getCurrentPosition } = useGeolocation();
  const { fingerprint, deviceInfo, generateFingerprint } =
    useDeviceFingerprint();

  const login = useCallback(
    async (credentials) => {
      try {
        setLoading(true);
        setError(null);
        setAuthStep("location");

        // 1. Verificar ubicación
        console.log("🗺️ Verificando ubicación...");
        const location = await getCurrentPosition();

        // Verificación estricta con manejo de errores
        const geofenceResult = await authService.checkGeofence(
          location.lat,
          location.lng
        );

        if (!geofenceResult.success) {
          throw new Error(`Error de verificación: ${geofenceResult.error}`);
        }

        if (!geofenceResult.isInside) {
          throw new Error(
            geofenceResult.geofences.length > 0
              ? "Ubicación fuera de las áreas permitidas"
              : "No hay geocercas configuradas. Acceso denegado."
          );
        }

        // Solo continuar si todo está bien
        setAuthStep("device");

        // 2. Generar y verificar dispositivo
        console.log("🔍 Verificando dispositivo...");
        const { fingerprint: deviceFingerprint, deviceInfo: deviceData } =
          await generateFingerprint();

        const deviceVerification = await deviceService.verifyDevice({
          deviceFingerprint,
          deviceInfo: deviceData,
          location,
        });

        if (!deviceVerification.authorized) {
          if (deviceVerification.requiresManualApproval) {
            throw new Error(
              "Este dispositivo requiere autorización manual. " +
                "Contacta al administrador del sistema. " +
                `Código de dispositivo: ${deviceFingerprint.substring(0, 8)}...`
            );
          }
          throw new Error("Dispositivo no autorizado para acceder al sistema.");
        }

        setAuthStep("credentials");

        // 3. Autenticar credenciales con backend y obtener roles
        console.log("🔐 Verificando credenciales...");
        const authResult = await authService.login({
          ...credentials,
          deviceFingerprint,
          location,
          deviceId: deviceVerification.deviceId,
        });

        console.log("🔍 Respuesta completa del login:", authResult); // Nuevo log

        if (!authResult.success) {
          throw new Error(authResult.error || "Credenciales inválidas");
        }

        // Determinar redirección antes de actualizar estado
        const shouldRedirectToMoodle = authResult.user.roles.some((r) =>
          [4, 5].includes(r.roleid)
        );

        // Verificar redirección
        // if (!authResult.redirectTo) {
        //   console.warn("⚠️ No se recibió redirectTo, determinando desde roles");
        //   authResult.redirectTo = authResult.user?.roles?.some((r) =>
        //     [4, 5].includes(r.roleid)
        //   )
        //     ? "moodle"
        //     : "home";
        // }

        setUser(authResult.user);
        setAuthStep("success");

        // 🎯 CRÍTICO: Actualizar estado local Y contexto
        console.log(
          "✅ Actualizando estado de autenticación...",
          authResult.user
        );
        setLoading(false);

        return {
          success: true,
          user: authResult.user,
          //redirectTo: authResult.redirectTo,
          shouldRedirectToMoodle,
          deviceId: deviceVerification.deviceId,
        };
      } catch (err) {
        console.error("❌ Error en useAuth.login:", err);
        setError(err.message);
        setLoading(false);
        setAuthStep("idle");
        throw err;
      }
    },
    [getCurrentPosition, generateFingerprint]
  );

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      await authService.logout();
      setUser(null);
      setError(null);
      setAuthStep("idle");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 🎯 AÑADIR: Estado computado más claro
  const isAuthenticated = !!user;

  console.log("🔍 useAuth state:", {
    user,
    isAuthenticated,
    loading,
    authStep,
  });

  return {
    user,
    loading,
    error,
    setError,
    authStep,
    login,
    logout,
    clearError,
    isAuthenticated,
  };
};
