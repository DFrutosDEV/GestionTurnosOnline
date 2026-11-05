import { google } from 'googleapis';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TIMEZONE = 'America/Argentina/Buenos_Aires';

interface CalendarConfig {
  clientEmail: string;
  privateKey: string;
  calendarId: string;
}

/**
 * Convierte una fecha y hora (strings) a un objeto Date en UTC
 * interpretándolos como hora de Argentina (UTC-3)
 */
export function createDateInArgentinaTimezone(fecha: string, hora: string): Date {
  // Crear string de fecha/hora en formato ISO sin zona horaria
  const dateTimeString = `${fecha}T${hora}:00`;
  // Crear Date (será interpretado como hora local del servidor, pero lo trataremos como AR)
  const localDate = new Date(dateTimeString);
  // fromZonedTime interpreta el Date como si fuera en la zona horaria especificada
  // y lo convierte a UTC
  return fromZonedTime(localDate, TIMEZONE);
}

/**
 * Obtiene el día de la semana (0=Domingo, 1=Lunes, ..., 6=Sábado)
 * desde un string de fecha en formato YYYY-MM-DD, considerando la zona horaria de Argentina
 */
export function getDayOfWeekInArgentina(fecha: string): number {
  const dateTimeString = `${fecha}T12:00:00`;
  const localDate = new Date(dateTimeString);
  const dateInUTC = fromZonedTime(localDate, TIMEZONE);
  return dateInUTC.getUTCDay();
}

/**
 * Obtiene el cliente autenticado de Google Calendar
 */
export function getCalendarClient(config: CalendarConfig) {
  if (!config.clientEmail || !config.privateKey || !config.calendarId) {
    throw new Error('Las credenciales de Google Calendar no están configuradas correctamente.');
  }

  const auth = new google.auth.JWT({
    email: config.clientEmail,
    key: config.privateKey.replace(/\\n/g, '\n'),
    scopes: SCOPES,
  });

  return google.calendar({ version: 'v3', auth });
}

/**
 * Verifica si un horario está disponible
 */
export async function checkAvailability(
  config: CalendarConfig,
  startDateTime: Date,
  endDateTime: Date
): Promise<boolean> {
  try {
    const calendar = getCalendarClient(config);

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startDateTime.toISOString(),
        timeMax: endDateTime.toISOString(),
        items: [{ id: config.calendarId }],
      },
    });

    const calendarData = response.data.calendars?.[config.calendarId];
    return !calendarData?.busy || calendarData.busy.length === 0;
  } catch (error) {
    console.error('Error verificando disponibilidad:', error);
    throw error;
  }
}

export interface BusyPeriod {
  start: Date;
  end: Date;
}

/**
 * Obtiene los intervalos ocupados de un día completo (Argentina)
 */
export async function getBusyPeriodsForDay(
  config: CalendarConfig,
  fecha: string
): Promise<BusyPeriod[]> {
  const dayStart = createDateInArgentinaTimezone(fecha, '00:00');
  const dayEnd = createDateInArgentinaTimezone(fecha, '23:59');
  // Incluir el último minuto completo
  dayEnd.setUTCSeconds(59, 999);

  const calendar = getCalendarClient(config);

  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: dayStart.toISOString(),
      timeMax: dayEnd.toISOString(),
      items: [{ id: config.calendarId }],
    },
  });

  const busy = response.data.calendars?.[config.calendarId]?.busy || [];

  return busy
    .filter((slot): slot is { start: string; end: string } => Boolean(slot.start && slot.end))
    .map((slot) => ({
      start: new Date(slot.start),
      end: new Date(slot.end),
    }));
}

function rangesOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return startA < endB && startB < endA;
}

/**
 * Genera slots de 30 minutos y filtra los que se solapan con busy
 */
export function filterAvailableSlots(
  fecha: string,
  startHour: number,
  endHour: number,
  busyPeriods: BusyPeriod[],
  slotMinutes = 30
): { disponibles: string[]; ocupados: string[] } {
  const disponibles: string[] = [];
  const ocupados: string[] = [];
  const inicioMinutos = startHour * 60;
  const finMinutos = endHour * 60;

  for (let minutos = inicioMinutos; minutos <= finMinutos; minutos += slotMinutes) {
    const horasNum = Math.floor(minutos / 60);
    const minutosNum = minutos % 60;
    const hora = `${horasNum.toString().padStart(2, '0')}:${minutosNum.toString().padStart(2, '0')}`;
    const slotStart = createDateInArgentinaTimezone(fecha, hora);
    const slotEnd = new Date(slotStart.getTime() + slotMinutes * 60 * 1000);

    const isBusy = busyPeriods.some((busy) =>
      rangesOverlap(slotStart, slotEnd, busy.start, busy.end)
    );

    if (isBusy) {
      ocupados.push(hora);
    } else {
      disponibles.push(hora);
    }
  }

  return { disponibles, ocupados };
}

/**
 * Crea un evento en Google Calendar
 */
export async function createCalendarEvent(
  config: CalendarConfig,
  title: string,
  startDateTime: Date,
  endDateTime: Date,
  attendeeEmails?: string | string[]
): Promise<string> {
  try {
    const calendar = getCalendarClient(config);

    // Convertir de UTC a hora de Argentina para el formato
    const startArgentina = toZonedTime(startDateTime, TIMEZONE);
    const endArgentina = toZonedTime(endDateTime, TIMEZONE);

    // Formatear como ISO string sin zona horaria
    const formatDateTime = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    };

    const event: any = {
      summary: title,
      start: {
        dateTime: formatDateTime(startArgentina),
        timeZone: TIMEZONE,
      },
      end: {
        dateTime: formatDateTime(endArgentina),
        timeZone: TIMEZONE,
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 10 },
        ],
      },
    };

    if (attendeeEmails) {
      const emails = Array.isArray(attendeeEmails) ? attendeeEmails : [attendeeEmails];
      event.description = `Emails de contacto:\n${emails.map(e => `- ${e}`).join('\n')}`;
    }

    const response = await calendar.events.insert({
      calendarId: config.calendarId,
      requestBody: event,
      sendUpdates: 'none',
    });

    return response.data.id || '';
  } catch (error) {
    console.error('Error creando evento:', error);
    throw error;
  }
}
