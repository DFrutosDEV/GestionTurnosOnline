import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

interface CalendarConfig {
  clientEmail: string;
  privateKey: string;
  calendarId: string;
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

    const event: any = {
      summary: title,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'America/Argentina/Buenos_Aires',
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

