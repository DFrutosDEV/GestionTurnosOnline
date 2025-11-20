import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TIMEZONE = 'America/Argentina/Buenos_Aires';

interface CalendarConfig {
  clientEmail: string;
  privateKey: string;
  calendarId: string;
}

/**
 * Convierte una fecha y hora (strings) a un objeto Date interpretándolos
 * como si fueran en la zona horaria de Argentina (UTC-3)
 */
export function createDateInArgentinaTimezone(fecha: string, hora: string): Date {
  // Crear el string de fecha/hora en formato ISO sin zona horaria
  const dateTimeString = `${fecha}T${hora}`;
  
  // Crear un Date interpretando la fecha/hora como si fuera en hora local del servidor
  const localDate = new Date(dateTimeString);
  
  // Argentina está en UTC-3, que significa 180 minutos al oeste de UTC
  // getTimezoneOffset() devuelve minutos positivos para zonas al oeste de UTC
  const argentinaOffsetMinutes = 3 * 60; // 180 minutos (UTC-3)
  
  // Obtener el offset local del servidor en minutos
  const localOffsetMinutes = localDate.getTimezoneOffset();
  
  // Calcular la diferencia: si el servidor está en UTC (offset=0) y queremos Argentina (offset=180),
  // necesitamos sumar 180 minutos al Date para que represente la hora correcta en UTC
  // que corresponde a la hora local de Argentina
  const offsetDiffMinutes = argentinaOffsetMinutes - localOffsetMinutes;
  const adjustedDate = new Date(localDate.getTime() + offsetDiffMinutes * 60 * 1000);
  
  return adjustedDate;
}

/**
 * Formatea un Date a formato ISO string para Google Calendar
 * El Date debe representar la hora correcta en UTC (ajustada para Argentina)
 * Convertimos de vuelta a hora local de Argentina para el formato
 */
function formatDateTimeForGoogleCalendar(date: Date): string {
  // El Date ya está ajustado: internamente representa la hora UTC
  // que corresponde a la hora local de Argentina que queremos.
  // Para formatear, necesitamos restar 3 horas de los valores UTC
  // para obtener la hora local de Argentina.
  const utcYear = date.getUTCFullYear();
  const utcMonth = date.getUTCMonth();
  const utcDay = date.getUTCDate();
  const utcHours = date.getUTCHours();
  const utcMinutes = date.getUTCMinutes();
  const utcSeconds = date.getUTCSeconds();
  
  // Restar 3 horas para obtener hora local de Argentina
  let argentinaHours = utcHours - 3;
  let argentinaDay = utcDay;
  let argentinaMonth = utcMonth;
  let argentinaYear = utcYear;
  
  // Manejar casos donde restar horas cambia el día
  if (argentinaHours < 0) {
    argentinaHours += 24;
    argentinaDay--;
    if (argentinaDay < 1) {
      argentinaMonth--;
      if (argentinaMonth < 0) {
        argentinaMonth = 11;
        argentinaYear--;
      }
      // Obtener el último día del mes anterior
      argentinaDay = new Date(argentinaYear, argentinaMonth + 1, 0).getDate();
    }
  }
  
  const year = String(argentinaYear);
  const month = String(argentinaMonth + 1).padStart(2, '0');
  const day = String(argentinaDay).padStart(2, '0');
  const hours = String(argentinaHours).padStart(2, '0');
  const minutes = String(utcMinutes).padStart(2, '0');
  const seconds = String(utcSeconds).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

/**
 * Obtiene el cliente autenticado de Google Calendar
 */
export function getCalendarClient(config: CalendarConfig) {
  if (!config.clientEmail || !config.privateKey || !config.calendarId) {
    throw new Error('Las credenciales de Google Calendar no están configuradas correctamente. Verifica las variables de entorno GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY y GOOGLE_CALENDAR_ID.');
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

    if (!calendarData || !calendarData.busy) {
      return true;
    }

    // Si hay algún evento ocupando ese horario, no está disponible
    return calendarData.busy.length === 0;
  } catch (error) {
    console.error('Error verificando disponibilidad:', error);
    throw error;
  }
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

    // Formatear las fechas correctamente para Google Calendar
    // Usamos formatDateTimeForGoogleCalendar para evitar problemas de zona horaria
    const startISO = formatDateTimeForGoogleCalendar(startDateTime);
    const endISO = formatDateTimeForGoogleCalendar(endDateTime);

    const event: any = {
      summary: title,
      start: {
        dateTime: startISO,
        timeZone: TIMEZONE,
      },
      end: {
        dateTime: endISO,
        timeZone: TIMEZONE,
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 10 },
        ],
      },
    };

    // Si hay emails, agregarlos en la descripción
    // Nota: Los Service Accounts no pueden enviar invitaciones automáticamente
    // Los emails se envían manualmente a través de nodemailer
    if (attendeeEmails) {
      const emails = Array.isArray(attendeeEmails) ? attendeeEmails : [attendeeEmails];
      event.description = `Emails de contacto:\n${emails.map(e => `- ${e}`).join('\n')}`;
      // No agregamos attendees porque los Service Accounts no pueden enviar invitaciones
      // Los emails de confirmación se envían manualmente
    }

    const response = await calendar.events.insert({
      calendarId: config.calendarId,
      requestBody: event,
      sendUpdates: 'none', // Service Accounts no pueden enviar invitaciones automáticamente
    });

    return response.data.id || '';
  } catch (error) {
    console.error('Error creando evento:', error);
    throw error;
  }
}

