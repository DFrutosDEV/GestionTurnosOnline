/**
 * Configuración por defecto del sistema
 */
export interface SystemConfig {
  enabled: boolean;
  startHour: number;
  endHour: number;
  allowedDays: number[]; // 0=Domingo, 1=Lunes, 2=Martes, ..., 6=Sábado
  calendarEmail: string;
  /** Días mínimos de anticipación (0 = se puede reservar el mismo día) */
  minAdvanceDays: number;
  /** Días máximos hacia adelante para reservar */
  maxAdvanceDays: number;
  /** Mensaje del toast al confirmar/solicitar un turno */
  reservaSuccessMessage: string;
}

export const DEFAULT_RESERVA_SUCCESS_MESSAGE =
  '¡Solicitud de turno enviada exitosamente! Quedate atento a tu correo para la confirmación del turno.';

export const DEFAULT_CONFIG: SystemConfig = {
  enabled: true,
  startHour: 10,
  endHour: 20,
  allowedDays: [2, 3, 4, 5, 6], // Martes a Sábado
  calendarEmail: process.env.DEFAULT_CALENDAR_EMAIL || '',
  minAdvanceDays: 0,
  maxAdvanceDays: 30,
  reservaSuccessMessage: DEFAULT_RESERVA_SUCCESS_MESSAGE,
};

// En producción, esto debería estar en una base de datos o localStorage
// Por ahora usamos una variable en memoria
let currentConfig: SystemConfig = { ...DEFAULT_CONFIG };

function readNumberFromStorage(key: string): number | null {
  const value = localStorage.getItem(key);
  if (value === null || value === '') return null;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function getConfig(): SystemConfig {
  // Intentar leer de localStorage solo si estamos en el cliente (navegador)
  // En el servidor, usar currentConfig que se actualiza con updateConfig()
  if (typeof window !== 'undefined') {
    const startHour = localStorage.getItem('startHour');
    const endHour = localStorage.getItem('endHour');
    const allowedDaysStr = localStorage.getItem('allowedDays');
    const minAdvanceDays = readNumberFromStorage('minAdvanceDays');
    const maxAdvanceDays = readNumberFromStorage('maxAdvanceDays');
    const reservaSuccessMessage = localStorage.getItem('reservaSuccessMessage');

    const config = { ...currentConfig };

    if (startHour && endHour) {
      config.startHour = parseInt(startHour);
      config.endHour = parseInt(endHour);
    }

    if (allowedDaysStr) {
      try {
        config.allowedDays = JSON.parse(allowedDaysStr);
      } catch (e) {
        console.error('Error parsing allowedDays from localStorage:', e);
      }
    }

    if (minAdvanceDays !== null) {
      config.minAdvanceDays = minAdvanceDays;
    }

    if (maxAdvanceDays !== null) {
      config.maxAdvanceDays = maxAdvanceDays;
    }

    if (reservaSuccessMessage !== null && reservaSuccessMessage.trim() !== '') {
      config.reservaSuccessMessage = reservaSuccessMessage;
    }

    return config;
  }
  // Si no hay valores en localStorage o estamos en el servidor, usar currentConfig
  // Si currentConfig no ha sido actualizado, usará los valores de DEFAULT_CONFIG
  return { ...currentConfig };
}

export function updateConfig(newConfig: Partial<SystemConfig>): SystemConfig {
  const nextMessage =
    newConfig.reservaSuccessMessage !== undefined
      ? newConfig.reservaSuccessMessage.trim() || DEFAULT_RESERVA_SUCCESS_MESSAGE
      : currentConfig.reservaSuccessMessage;

  currentConfig = {
    ...currentConfig,
    ...newConfig,
    minAdvanceDays:
      newConfig.minAdvanceDays !== undefined
        ? Math.max(0, newConfig.minAdvanceDays)
        : currentConfig.minAdvanceDays,
    maxAdvanceDays:
      newConfig.maxAdvanceDays !== undefined
        ? Math.max(1, newConfig.maxAdvanceDays)
        : currentConfig.maxAdvanceDays,
    reservaSuccessMessage: nextMessage,
  };
  return { ...currentConfig };
}

/** Rango de fechas reservables según la config (día local a mediodía). */
export function getBookingDateBounds(config: SystemConfig, now = new Date()) {
  const minDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + config.minAdvanceDays, 12, 0, 0);
  const maxDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + config.maxAdvanceDays, 12, 0, 0);
  return { minDate, maxDate };
}

export function isDateWithinBookingWindow(date: Date, config: SystemConfig, now = new Date()): boolean {
  const { minDate, maxDate } = getBookingDateBounds(config, now);
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  return day >= minDate && day <= maxDate;
}
