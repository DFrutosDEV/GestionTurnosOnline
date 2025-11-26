'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';

interface SystemConfig {
  enabled: boolean;
  startHour: number;
  endHour: number;
  allowedDays: number[];
  calendarEmail: string;
}

export default function AdminPanel() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/config');
      const data = await response.json();

      // Si hay valores en localStorage, usarlos para startHour y endHour
      const startHour = localStorage.getItem('startHour');
      const endHour = localStorage.getItem('endHour');
      if (startHour && endHour) {
        data.startHour = parseInt(startHour);
        data.endHour = parseInt(endHour);
      }

      setConfig(data);
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Error cargando configuración',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        // Guardar startHour y endHour en localStorage
        localStorage.setItem('startHour', config.startHour.toString());
        localStorage.setItem('endHour', config.endHour.toString());

        setMessage({
          type: 'success',
          text: 'Configuración guardada exitosamente',
        });
      } else {
        setMessage({
          type: 'error',
          text: 'Error al guardar la configuración',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Error de conexión',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!config) {
    return <Alert severity="error">Error cargando configuración</Alert>;
  }

  return (
    <Paper
      elevation={3}
      sx={{
        p: 4,
        maxWidth: 800,
        mx: 'auto',
        mt: 4,
      }}
    >
      <Typography variant="h4" component="h1" gutterBottom>
        Panel de Administración
      </Typography>

      {message && (
        <Alert severity={message.type} sx={{ mb: 3 }}>
          {message.text}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Divider />

        <FormControlLabel
          control={
            <Switch
              checked={config.enabled}
              onChange={(e) =>
                setConfig({ ...config, enabled: e.target.checked })
              }
            />
          }
          label="Habilitar reservas de turnos"
        />

        <Divider />

        <TextField
          label="Hora de inicio"
          type="number"
          value={config.startHour}
          onChange={(e) =>
            setConfig({
              ...config,
              startHour: parseInt(e.target.value) || 10,
            })
          }
          inputProps={{ min: 0, max: 23 }}
          helperText="Hora en formato 24hs (0-23)"
        />

        <TextField
          label="Hora de fin"
          type="number"
          value={config.endHour}
          onChange={(e) =>
            setConfig({
              ...config,
              endHour: parseInt(e.target.value) || 20,
            })
          }
          inputProps={{ min: 0, max: 23 }}
          helperText="Hora en formato 24hs (0-23)"
        />

        <Divider />

        {/* <TextField
          label="Email para recibir eventos de Calendar"
          type="email"
          value={config.calendarEmail}
          onChange={(e) =>
            setConfig({ ...config, calendarEmail: e.target.value })
          }
          fullWidth
          helperText="Email donde se enviarán las invitaciones de los turnos reservados"
        /> */}

        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          size="large"
          sx={{ mt: 2 }}
        >
          {saving ? <CircularProgress size={24} /> : 'Guardar Configuración'}
        </Button>
      </Box>
    </Paper>
  );
}

