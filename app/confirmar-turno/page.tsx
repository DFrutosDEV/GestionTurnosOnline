'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import { useRouter } from 'next/navigation';

function ConfirmarTurnoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const hasProcessed = useRef(false); // Flag para evitar ejecuciones múltiples

  useEffect(() => {
    // Prevenir ejecuciones múltiples
    if (hasProcessed.current) {
      return;
    }

    const confirmarTurno = async () => {
      // Marcar como procesado inmediatamente
      hasProcessed.current = true;

      try {
        const encryptedData = searchParams.get('data');

        if (!encryptedData) {
          setMessage({
            type: 'error',
            text: 'Datos de confirmación no válidos. Por favor, use el enlace del email.',
          });
          setLoading(false);
          return;
        }

        // Llamar al endpoint de confirmación
        const response = await fetch('/api/turnos/confirmar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: encryptedData }),
        });

        const result = await response.json();

        if (response.ok) {
          setMessage({
            type: 'success',
            text: result.message || 'Turno confirmado exitosamente. Se han enviado emails de confirmación al cliente y al administrador.',
          });
        } else {
          setMessage({
            type: 'error',
            text: result.error || 'Error al confirmar el turno',
          });
        }
      } catch (error) {
        console.error('Error confirmando turno:', error);
        setMessage({
          type: 'error',
          text: 'Error de conexión. Intente nuevamente.',
        });
      } finally {
        setLoading(false);
      }
    };

    confirmarTurno();
  }, [searchParams]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        backgroundColor: '#f5f5f5',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          maxWidth: 600,
          width: '100%',
          textAlign: 'center',
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom>
          Confirmación de Turno
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mt: 4 }}>
            <CircularProgress />
            <Typography>Procesando confirmación...</Typography>
          </Box>
        ) : (
          <>
            {message && (
              <Alert
                severity={message.type}
                sx={{ mb: 3, mt: 2 }}
              >
                {message.text}
              </Alert>
            )}

            <Button
              variant="contained"
              onClick={() => router.push('/')}
              sx={{ mt: 2 }}
            >
              Volver al Inicio
            </Button>
          </>
        )}
      </Paper>
    </Box>
  );
}

export default function ConfirmarTurnoPage() {
  return (
    <Suspense
      fallback={
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
            backgroundColor: '#f5f5f5',
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              maxWidth: 600,
              width: '100%',
              textAlign: 'center',
            }}
          >
            <CircularProgress />
            <Typography sx={{ mt: 2 }}>Cargando...</Typography>
          </Paper>
        </Box>
      }
    >
      <ConfirmarTurnoContent />
    </Suspense>
  );
}

