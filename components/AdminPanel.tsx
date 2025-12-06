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
  FormGroup,
  Checkbox,
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

      // Si hay valores en localStorage, usarlos para startHour, endHour y allowedDays
      const startHour = localStorage.getItem('startHour');
      const endHour = localStorage.getItem('endHour');
      const allowedDaysStr = localStorage.getItem('allowedDays');

      if (startHour && endHour) {
        data.startHour = parseInt(startHour);
        data.endHour = parseInt(endHour);
      }

      if (allowedDaysStr) {
        try {
          data.allowedDays = JSON.parse(allowedDaysStr);
        } catch (e) {
          console.error('Error parsing allowedDays from localStorage:', e);
        }
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
        // Guardar startHour, endHour y allowedDays en localStorage
        localStorage.setItem('startHour', config.startHour.toString());
        localStorage.setItem('endHour', config.endHour.toString());
        localStorage.setItem('allowedDays', JSON.stringify(config.allowedDays));

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

        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Días disponibles para reservas
          </Typography>
          <FormGroup>
            {[
              { value: 0, label: 'Domingo' },
              { value: 1, label: 'Lunes' },
              { value: 2, label: 'Martes' },
              { value: 3, label: 'Miércoles' },
              { value: 4, label: 'Jueves' },
              { value: 5, label: 'Viernes' },
              { value: 6, label: 'Sábado' },
            ].map((day) => (
              <FormControlLabel
                key={day.value}
                control={
                  <Checkbox
                    checked={config.allowedDays.includes(day.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setConfig({
                          ...config,
                          allowedDays: [...config.allowedDays, day.value],
                        });
                      } else {
                        setConfig({
                          ...config,
                          allowedDays: config.allowedDays.filter((d) => d !== day.value),
                        });
                      }
                    }}
                  />
                }
                label={day.label}
              />
            ))}
          </FormGroup>
        </Box>

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

