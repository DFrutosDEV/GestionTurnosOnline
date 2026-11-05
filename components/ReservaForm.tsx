'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { getDay, format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import {
  DEFAULT_RESERVA_SUCCESS_MESSAGE,
  getBookingDateBounds,
  isDateWithinBookingWindow,
  type SystemConfig,
} from '@/lib/config';
import { getPhoneValidationError, normalizePhone, PHONE_MAX_LENGTH } from '@/lib/phone';
import Toast, { type ToastState } from '@/components/Toast';

export default function ReservaForm() {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [telefonoError, setTelefonoError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHoras, setLoadingHoras] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [horasDisponibles, setHorasDisponibles] = useState<string[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    if (!fecha) {
      setHorasDisponibles([]);
      return;
    }

    let cancelled = false;

    const loadHorasDisponibles = async () => {
      setLoadingHoras(true);
      setHora('');
      setHorasDisponibles([]);

      try {
        const response = await fetch('/api/turnos/disponibilidad', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fecha }),
        });
        const data = await response.json();

        if (cancelled) return;

        if (!response.ok) {
          setToast({
            type: 'error',
            text: data.error || 'No se pudieron cargar los horarios disponibles',
          });
          setHorasDisponibles([]);
          return;
        }

        setHorasDisponibles(data.horasDisponibles || []);
        if ((data.horasDisponibles || []).length === 0) {
          setToast({
            type: 'error',
            text: 'No hay horarios disponibles para esa fecha. Probá con otro día.',
          });
        }
      } catch {
        if (!cancelled) {
          setToast({
            type: 'error',
            text: 'Error al consultar disponibilidad del calendario',
          });
          setHorasDisponibles([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingHoras(false);
        }
      }
    };

    loadHorasDisponibles();

    return () => {
      cancelled = true;
    };
  }, [fecha]);

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
        reservaSuccessMessage:
          data.reservaSuccessMessage?.trim() || DEFAULT_RESERVA_SUCCESS_MESSAGE,
      });
    } catch (error) {
      console.error('Error cargando configuración:', error);
    }
  };

  const isCalendarDateAllowed = (date: Date) => {
    if (!config) return false;
    if (!config.allowedDays.includes(getDay(date))) return false;
    return isDateWithinBookingWindow(date, config);
  };

  const handleSelectDate = (date: Date | null) => {
    if (!date || !config) return;

    if (!isCalendarDateAllowed(date)) {
      const diasNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const diasDisponibles = config.allowedDays.map((d) => diasNombres[d]).join(', ') || 'Ninguno configurado';
      setToast({
        type: 'error',
        text: `El día seleccionado no está disponible. Días disponibles: ${diasDisponibles}.`,
      });
      return;
    }

    setFecha(format(date, 'yyyy-MM-dd'));
    setHora('');
    setToast(null);
    setCalendarOpen(false);
  };

  const selectedDateLabel = fecha
    ? format(parse(fecha, 'yyyy-MM-dd', new Date()), "EEEE d 'de' MMMM", { locale: es })
    : null;

  const validateTelefono = (value: string) => {
    const error = getPhoneValidationError(value);
    setTelefonoError(error);
    return error === null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setToast(null);

    if (!validateTelefono(telefono)) {
      return;
    }

    setLoading(true);
    const telefonoNormalizado = normalizePhone(telefono);

    try {
      const disponibilidadResponse = await fetch('/api/turnos/disponibilidad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha, hora }),
      });

      const disponibilidadData = await disponibilidadResponse.json();

      if (!disponibilidadData.disponible) {
        setToast({
          type: 'error',
          text: 'El horario seleccionado ya está ocupado. Por favor, elija otro.',
        });
        setLoading(false);
        return;
      }

      const response = await fetch('/api/turnos/solicitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          apellido,
          telefono: telefonoNormalizado,
          email,
          fecha,
          hora,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setToast({
          type: 'success',
          text:
            config?.reservaSuccessMessage?.trim() ||
            DEFAULT_RESERVA_SUCCESS_MESSAGE,
        });
        setNombre('');
        setApellido('');
        setTelefono('');
        setEmail('');
        setFecha('');
        setHora('');
      } else {
        setToast({
          type: 'error',
          text: data.error || 'Error al enviar la solicitud de turno',
        });
      }
    } catch (error) {
      setToast({
        type: 'error',
        text: 'Error de conexión. Intente nuevamente.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!config) {
    return (
      <Box display="flex" justifyContent="center" width="100%" py={6}>
        <CircularProgress sx={{ color: '#c45c3a' }} />
      </Box>
    );
  }

  if (!config.enabled) {
    return (
      <Box width="100%">
        <Typography
          component="h1"
          sx={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: { xs: '2.15rem', md: '2.6rem' },
            letterSpacing: '-0.03em',
            color: '#0b1c2c',
            mb: 1.25,
          }}
        >
          Reservar turno
        </Typography>
        <Box
          sx={{
            width: 64,
            height: 3.5,
            bgcolor: '#c45c3a',
            mb: 3.5,
          }}
        />
        <Alert severity="warning" sx={{ fontSize: '1rem' }}>
          Las reservas están temporalmente deshabilitadas.
        </Alert>
      </Box>
    );
  }

  const { minDate, maxDate } = getBookingDateBounds(config);
  const selectedDateValue = fecha ? parse(fecha, 'yyyy-MM-dd', new Date()) : null;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Box width="100%">
        <Typography
          component="h1"
          sx={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: { xs: '2.15rem', md: '2.6rem' },
            letterSpacing: '-0.03em',
            color: '#0b1c2c',
            mb: 1.25,
          }}
        >
          Reservar turno
        </Typography>
        <Box
          sx={{
            width: 64,
            height: 3.5,
            bgcolor: '#c45c3a',
            mb: 4,
          }}
        />

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
        >
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
            label="Teléfono"
            type="tel"
            value={telefono}
            onChange={(e) => {
              const value = e.target.value.slice(0, PHONE_MAX_LENGTH);
              setTelefono(value);
              if (telefonoError) {
                setTelefonoError(getPhoneValidationError(value));
              }
            }}
            onBlur={() => validateTelefono(telefono)}
            required
            fullWidth
            disabled={loading}
            error={Boolean(telefonoError)}
            helperText={telefonoError || `Máx. ${PHONE_MAX_LENGTH} caracteres. Ej: 11 2345-6789`}
            placeholder="Ej: 11 2345-6789"
            inputProps={{
              inputMode: 'tel',
              autoComplete: 'tel',
              maxLength: PHONE_MAX_LENGTH,
            }}
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

          <Box>
            <Typography
              variant="body2"
              sx={{ mb: 1, fontWeight: 600, color: 'text.secondary' }}
            >
              Fecha
            </Typography>
            <Button
              type="button"
              variant="outlined"
              fullWidth
              disabled={loading}
              onClick={() => setCalendarOpen(true)}
              startIcon={<CalendarMonthIcon />}
              sx={{
                justifyContent: 'flex-start',
                py: 1.7,
                px: 2,
                fontSize: '1.05rem',
                fontWeight: 600,
                textTransform: 'none',
                borderColor: '#d8d4ce',
                color: selectedDateLabel ? '#0b1c2c' : '#8a8680',
                bgcolor: '#ffffff',
                '&:hover': {
                  borderColor: '#0b1c2c',
                  bgcolor: '#ffffff',
                },
              }}
            >
              {selectedDateLabel
                ? selectedDateLabel.charAt(0).toUpperCase() + selectedDateLabel.slice(1)
                : 'Seleccionar la fecha'}
            </Button>
          </Box>

          {fecha && (
            <Box>
              <FormControl fullWidth required>
                <InputLabel>Hora</InputLabel>
                <Select
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  label="Hora"
                  disabled={loading || loadingHoras || horasDisponibles.length === 0}
                  displayEmpty
                >
                  {horasDisponibles.map((h) => (
                    <MenuItem key={h} value={h}>
                      {h}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {loadingHoras && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <CircularProgress size={16} sx={{ color: '#c45c3a' }} />
                  <Typography variant="caption" color="text.secondary">
                    Buscando espacios libres en el calendario...
                  </Typography>
                </Box>
              )}
              {!loadingHoras && horasDisponibles.length === 0 && (
                <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                  Sin horarios disponibles para esta fecha
                </Typography>
              )}
            </Box>
          )}

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={
              loading ||
              !nombre ||
              !apellido ||
              !telefono ||
              Boolean(telefonoError) ||
              !email ||
              !fecha ||
              !hora
            }
            sx={{
              mt: 1.5,
              py: 1.85,
              fontSize: '1.1rem',
              fontWeight: 700,
            }}
          >
            {loading ? (
              <CircularProgress size={22} sx={{ color: '#ffffff' }} />
            ) : (
              'Solicitar turno'
            )}
          </Button>
        </Box>

        <Dialog
          open={calendarOpen}
          onClose={() => setCalendarOpen(false)}
          maxWidth="xs"
          PaperProps={{
            sx: {
              borderRadius: 2,
              m: 2,
              width: '100%',
              maxWidth: 320,
            },
          }}
        >
          <DialogTitle
            sx={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '1.15rem',
              pr: 6,
              pb: 0.5,
            }}
          >
            Elegí el día
            <IconButton
              aria-label="Cerrar"
              onClick={() => setCalendarOpen(false)}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ px: 1, pb: 1.5, pt: 0.5 }}>
            <DateCalendar
              value={selectedDateValue}
              onChange={handleSelectDate}
              minDate={minDate}
              maxDate={maxDate}
              shouldDisableDate={(date) => !isCalendarDateAllowed(date)}
              sx={{
                width: '100%',
                maxHeight: 300,
                '& .MuiPickersDay-root': {
                  fontSize: '0.9rem',
                },
                '& .MuiPickersCalendarHeader-label': {
                  fontSize: '0.95rem',
                  fontWeight: 700,
                },
              }}
            />
          </DialogContent>
        </Dialog>

        <Toast toast={toast} onClose={() => setToast(null)} />
      </Box>
    </LocalizationProvider>
  );
}
