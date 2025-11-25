'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import { getDay, format } from 'date-fns';

interface SystemConfig {
  enabled: boolean;
  startHour: number;
  endHour: number;
  allowedDays: number[];
  calendarEmail: string;
}

export default function ReservaForm() {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [horasDisponibles, setHorasDisponibles] = useState<string[]>([]);

  // Cargar configuración al montar el componente
  useEffect(() => {
    fetchConfig();
  }, []);

  // Actualizar horas disponibles cuando cambia la fecha o la configuración
  useEffect(() => {
    if (fecha && config) {
      generateAvailableHours();
    }
  }, [fecha, config]);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/config');
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Error cargando configuración:', error);
    }
  };

  const generateAvailableHours = () => {
    if (!config || !fecha) return;

    const horas: string[] = [];
    // Convertir horas de inicio y fin a minutos totales desde medianoche
    const inicioMinutos = config.startHour * 60;
    const finMinutos = config.endHour * 60;

    // Iterar sumando 30 minutos hasta llegar a la hora fin (incluida)
    for (let minutos = inicioMinutos; minutos <= finMinutos; minutos += 30) {
      const horasNum = Math.floor(minutos / 60);
      const minutosNum = minutos % 60;
      horas.push(`${horasNum.toString().padStart(2, '0')}:${minutosNum.toString().padStart(2, '0')}`);
    }
    setHorasDisponibles(horas);
  };

  const getMinDate = () => {
    return format(new Date(), 'yyyy-MM-dd');
  };

  const isDateAllowed = (dateString: string) => {
    if (!config) return false;
    // Parsear la fecha manualmente para evitar problemas de zona horaria
    // El formato es YYYY-MM-DD
    const [year, month, day] = dateString.split('-').map(Number);
    // Crear fecha a mediodía en hora local para evitar problemas con cambios de día
    // month - 1 porque los meses en JavaScript son 0-indexados
    const date = new Date(year, month - 1, day, 12, 0, 0);
    const dayOfWeek = getDay(date);
    return config.allowedDays.includes(dayOfWeek);
  };

  const handleFechaChange = (newFecha: string) => {
    if (isDateAllowed(newFecha)) {
      setFecha(newFecha);
    } else {
      setMessage({
        type: 'error',
        text: 'El día seleccionado no está disponible. Solo se aceptan reservas de martes a sábado.',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      // Primero verificar disponibilidad
      const disponibilidadResponse = await fetch('/api/turnos/disponibilidad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha, hora }),
      });

      const disponibilidadData = await disponibilidadResponse.json();

      if (!disponibilidadData.disponible) {
        setMessage({
          type: 'error',
          text: 'El horario seleccionado ya está ocupado. Por favor, elija otro.',
        });
        setLoading(false);
        return;
      }

      // Si está disponible, enviar solicitud de turno al admin
      const response = await fetch('/api/turnos/solicitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, apellido, email, fecha, hora }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: '¡Solicitud de turno enviada exitosamente! El administrador recibirá un email y confirmará tu turno. Recibirás un email de confirmación una vez que sea aprobado.',
        });
        // Limpiar formulario
        setNombre('');
        setApellido('');
        setEmail('');
        setFecha('');
        setHora('');
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Error al enviar la solicitud de turno',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Error de conexión. Intente nuevamente.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!config) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!config.enabled) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="warning">
          Las reservas están temporalmente deshabilitadas.
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={3}
      sx={{
        p: 4,
        maxWidth: 600,
        mx: 'auto',
        mt: 4,
      }}
    >
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Reservar Turno
      </Typography>

      {message && (
        <Alert severity={message.type} sx={{ mb: 3 }}>
          {message.text}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <TextField
          label="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          fullWidth
          disabled={loading}
        />

        <TextField
          label="Apellido"
          value={apellido}
          onChange={(e) => setApellido(e.target.value)}
          required
          fullWidth
          disabled={loading}
        />

        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          fullWidth
          disabled={loading}
          helperText="Email donde recibirás la confirmación del turno"
        />

        <TextField
          label="Fecha"
          type="date"
          value={fecha}
          onChange={(e) => handleFechaChange(e.target.value)}
          required
          fullWidth
          inputProps={{ min: getMinDate() }}
          disabled={loading}
          InputLabelProps={{ shrink: true }}
        />

        <FormControl fullWidth required>
          <InputLabel>Hora</InputLabel>
          <Select
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            label="Hora"
            disabled={loading || !fecha}
          >
            {horasDisponibles.map((h) => (
              <MenuItem key={h} value={h}>
                {h}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={loading || !nombre || !apellido || !email || !fecha || !hora}
          sx={{ mt: 2 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Solicitar Turno'}
        </Button>
      </Box>
    </Paper>
  );
}

