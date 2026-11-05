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
import { DEFAULT_RESERVA_SUCCESS_MESSAGE, type SystemConfig } from '@/lib/config';
import Toast, { type ToastState } from '@/components/Toast';

export default function AdminPanel() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/config');
      const data = await response.json();

      const startHour = localStorage.getItem('startHour');
      const endHour = localStorage.getItem('endHour');
      const allowedDaysStr = localStorage.getItem('allowedDays');
      const minAdvanceDays = localStorage.getItem('minAdvanceDays');
      const maxAdvanceDays = localStorage.getItem('maxAdvanceDays');
      const reservaSuccessMessage = localStorage.getItem('reservaSuccessMessage');

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

      if (minAdvanceDays !== null) {
        data.minAdvanceDays = parseInt(minAdvanceDays);
      }

      if (maxAdvanceDays !== null) {
        data.maxAdvanceDays = parseInt(maxAdvanceDays);
      }

      if (reservaSuccessMessage !== null && reservaSuccessMessage.trim() !== '') {
        data.reservaSuccessMessage = reservaSuccessMessage;
      }

      setConfig({
        ...data,
        minAdvanceDays: data.minAdvanceDays ?? 0,
        maxAdvanceDays: data.maxAdvanceDays ?? 30,
        reservaSuccessMessage:
          data.reservaSuccessMessage?.trim() || DEFAULT_RESERVA_SUCCESS_MESSAGE,
      });
    } catch (error) {
      setToast({
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

    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        localStorage.setItem('startHour', config.startHour.toString());
        localStorage.setItem('endHour', config.endHour.toString());
        localStorage.setItem('allowedDays', JSON.stringify(config.allowedDays));
        localStorage.setItem('minAdvanceDays', config.minAdvanceDays.toString());
        localStorage.setItem('maxAdvanceDays', config.maxAdvanceDays.toString());
        localStorage.setItem(
          'reservaSuccessMessage',
          config.reservaSuccessMessage.trim() || DEFAULT_RESERVA_SUCCESS_MESSAGE
        );

        setToast({
          type: 'success',
          text: 'Configuración guardada exitosamente',
        });
      } else {
        setToast({
          type: 'error',
          text: 'Error al guardar la configuración',
        });
      }
    } catch (error) {
      setToast({
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

        <Typography variant="subtitle1">
          Validaciones de fecha
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: -2 }}>
          Controlan qué días aparecen habilitados en el calendario de reservas.
        </Typography>

        <TextField
          label="Anticipación mínima (días)"
          type="number"
          value={config.minAdvanceDays}
          onChange={(e) =>
            setConfig({
              ...config,
              minAdvanceDays: Math.max(0, parseInt(e.target.value) || 0),
            })
          }
          inputProps={{ min: 0, max: 365 }}
          helperText="0 = se puede reservar el mismo día. 1 = recién desde mañana, etc."
        />

        <TextField
          label="Anticipación máxima (días)"
          type="number"
          value={config.maxAdvanceDays}
          onChange={(e) =>
            setConfig({
              ...config,
              maxAdvanceDays: Math.max(1, parseInt(e.target.value) || 1),
            })
          }
          inputProps={{ min: 1, max: 365 }}
          helperText="Hasta cuántos días hacia adelante se puede elegir una fecha."
        />

        <Divider />

        <Typography variant="subtitle1">
          Mensaje de confirmación
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: -2 }}>
          Texto del toast cuando un cliente solicita un turno con éxito.
        </Typography>

        <TextField
          label="Mensaje del toast de confirmación"
          value={config.reservaSuccessMessage}
          onChange={(e) =>
            setConfig({
              ...config,
              reservaSuccessMessage: e.target.value,
            })
          }
          fullWidth
          multiline
          minRows={3}
          helperText="Si lo dejás vacío al guardar, se restaura el mensaje por defecto."
        />

        <Divider />

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

      <Toast toast={toast} onClose={() => setToast(null)} />
    </Paper>
  );
}
