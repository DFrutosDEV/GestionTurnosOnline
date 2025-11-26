/**
 * Configuración por defecto del sistema
 */
export interface SystemConfig {
  enabled: boolean;
  startHour: number;
  endHour: number;
  allowedDays: number[]; // 0=Domingo, 1=Lunes, 2=Martes, ..., 6=Sábado
  calendarEmail: string;
}

export const DEFAULT_CONFIG: SystemConfig = {
  enabled: true,
  startHour: 10,
  endHour: 20,
  allowedDays: [2, 3, 4, 5, 6], // Martes a Sábado
  calendarEmail: process.env.DEFAULT_CALENDAR_EMAIL || '',
};

// En producción, esto debería estar en una base de datos o localStorage
// Por ahora usamos una variable en memoria
let currentConfig: SystemConfig = { ...DEFAULT_CONFIG };

export function getConfig(): SystemConfig {
  // Intentar leer de localStorage solo si estamos en el cliente (navegador)
  // En el servidor, usar currentConfig que se actualiza con updateConfig()
  if (typeof window !== 'undefined') {
    const startHour = localStorage.getItem('startHour');
    const endHour = localStorage.getItem('endHour');
    if (startHour && endHour) {
      const config = { ...currentConfig };
      config.startHour = parseInt(startHour);
      config.endHour = parseInt(endHour);
      return config;
    }
  }
  // Si no hay valores en localStorage o estamos en el servidor, usar currentConfig
  // Si currentConfig no ha sido actualizado, usará los valores de DEFAULT_CONFIG
  return { ...currentConfig };
}

export function updateConfig(newConfig: Partial<SystemConfig>): SystemConfig {
  currentConfig = { ...currentConfig, ...newConfig };
  return { ...currentConfig };
}

