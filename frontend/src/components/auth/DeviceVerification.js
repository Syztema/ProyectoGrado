// src/components/auth/DeviceVerification.js
import React, { useState } from 'react';
import { useDeviceFingerprint } from '../../hooks/useDeviceFingerprint';
import { deviceService } from '../../services/deviceService';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

const DeviceVerification = ({ onVerificationComplete, onVerificationFailed }) => {
  const { fingerprint, deviceInfo, loading: fingerprintLoading } = useDeviceFingerprint();
  const [verificationState, setVerificationState] = useState('idle');
  const [error, setError] = useState('');
  const [requestSent, setRequestSent] = useState(false);

  const handleVerifyDevice = async () => {
    if (!fingerprint) {
      setError('No se pudo generar la huella digital del dispositivo');
      return;
    }

    try {
      setVerificationState('verifying');
      setError('');

      const result = await deviceService.verifyDevice({
        deviceFingerprint: fingerprint,
        deviceInfo
      });

      if (result.authorized) {
        setVerificationState('authorized');
        onVerificationComplete && onVerificationComplete({
          deviceId: result.deviceId,
          fingerprint,
          deviceInfo
        });
      } else if (result.requiresManualApproval) {
        setVerificationState('pending');
      } else {
        setVerificationState('denied');
        onVerificationFailed && onVerificationFailed(result.message || 'Dispositivo no autorizado');
      }
    } catch (err) {
      setError(err.message);
      setVerificationState('error');
      onVerificationFailed && onVerificationFailed(err.message);
    }
  };

  const handleRequestAuthorization = async () => {
    try {
      const justification = prompt('Por favor, proporciona una justificación para autorizar este dispositivo:');
      
      if (!justification) {
        return;
      }

      await deviceService.requestDeviceAuthorization({
        deviceFingerprint: fingerprint,
        deviceInfo,
        justification
      });

      setRequestSent(true);
    } catch (err) {
      setError(`Error enviando solicitud: ${err.message}`);
    }
  };

  if (fingerprintLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <LoadingSpinner message="Generando huella digital del dispositivo..." />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Verificación de Dispositivo
      </h3>

      {error && (
        <ErrorMessage 
          message={error} 
          type="error" 
          dismissible 
          onDismiss={() => setError('')}
          className="mb-4"
        />
      )}

      {verificationState === 'idle' && (
        <div>
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-blue-500 text-xl">🔍</span>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-900">
                  Verificación de Seguridad
                </h4>
                <p className="text-sm text-blue-700 mt-1">
                  Tu dispositivo será verificado para garantizar el acceso autorizado.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-sm text-gray-600 mb-4">
            <div className="flex items-center">
              <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
              ID del dispositivo: <code className="ml-2 bg-gray-100 px-2 py-1 rounded text-xs">{fingerprint}</code>
            </div>
            <div className="flex items-center">
              <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
              Plataforma: {deviceInfo?.platform || 'No disponible'}
            </div>
            <div className="flex items-center">
              <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
              Resolución: {deviceInfo?.screenResolution || 'No disponible'}
            </div>
          </div>

          <button
            onClick={handleVerifyDevice}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            Verificar Dispositivo
          </button>
        </div>
      )}

      {verificationState === 'verifying' && (
        <LoadingSpinner message="Verificando dispositivo con el servidor..." />
      )}

      {verificationState === 'authorized' && (
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-green-500 text-2xl">✅</span>
          </div>
          <h4 className="text-lg font-medium text-green-900 mb-2">
            Dispositivo Autorizado
          </h4>
          <p className="text-green-700 text-sm">
            Tu dispositivo ha sido verificado exitosamente y está autorizado para acceder al sistema.
          </p>
        </div>
      )}

      {verificationState === 'pending' && (
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-yellow-500 text-2xl">⏳</span>
          </div>
          <h4 className="text-lg font-medium text-yellow-900 mb-2">
            Autorización Requerida
          </h4>
          <p className="text-yellow-700 text-sm mb-4">
            Este dispositivo requiere autorización manual de un administrador.
          </p>
          
          {!requestSent ? (
            <button
              onClick={handleRequestAuthorization}
              className="bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors"
            >
              Solicitar Autorización
            </button>
          ) : (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm">
                ✅ Solicitud enviada. Un administrador revisará tu petición pronto.
              </p>
            </div>
          )}
        </div>
      )}

      {verificationState === 'denied' && (
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-red-500 text-2xl">❌</span>
          </div>
          <h4 className="text-lg font-medium text-red-900 mb-2">
            Acceso Denegado
          </h4>
          <p className="text-red-700 text-sm mb-4">
            Este dispositivo no está autorizado para acceder al sistema.
          </p>
          <p className="text-red-600 text-xs">
            Contacta al administrador del sistema si crees que esto es un error.
          </p>
        </div>
      )}
    </div>
  );
};

export default DeviceVerification;