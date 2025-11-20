import { NextRequest, NextResponse } from 'next/server';
import { checkAvailability, createCalendarEvent, createDateInArgentinaTimezone } from '@/lib/googleCalendar';
import { getConfig } from '@/lib/config';
import { addMinutes } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const { nombre, apellido, fecha, hora } = await request.json();

    // Validar campos requeridos
    if (!nombre || !apellido || !fecha || !hora) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    // Obtener configuración
    const config = getConfig();

    // Verificar si el sistema está habilitado
    if (!config.enabled) {
      return NextResponse.json(
        { error: 'Las reservas están deshabilitadas temporalmente' },
        { status: 400 }
      );
    }

    // Validar día de la semana
    const fechaTurno = new Date(`${fecha}T${hora}`);
    const diaSemana = fechaTurno.getDay();

    if (!config.allowedDays.includes(diaSemana)) {
      return NextResponse.json(
        { error: 'El día seleccionado no está disponible para reservas' },
        { status: 400 }
      );
    }

    // Validar hora
    const horaTurno = parseInt(hora.split(':')[0]);
    if (horaTurno < config.startHour || horaTurno >= config.endHour) {
      return NextResponse.json(
        { error: 'El horario seleccionado está fuera del rango permitido' },
        { status: 400 }
      );
    }

    // Verificar disponibilidad en Google Calendar
    // Crear fechas interpretándolas como hora de Argentina
    const startDateTime = createDateInArgentinaTimezone(fecha, hora);
    const endDateTime = addMinutes(startDateTime, 30); // Turno de 30 minutos

    // Validar que las variables de entorno estén configuradas
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_CALENDAR_ID) {
      return NextResponse.json(
        { error: 'Configuración de Google Calendar no encontrada. Por favor, configura las variables de entorno GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY y GOOGLE_CALENDAR_ID.' },
        { status: 500 }
      );
    }

    const googleConfig = {
      clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_PRIVATE_KEY,
      calendarId: process.env.GOOGLE_CALENDAR_ID,
    };

    const disponible = await checkAvailability(
      googleConfig,
      startDateTime,
      endDateTime
    );

    if (!disponible) {
      return NextResponse.json(
        { error: 'El horario seleccionado no está disponible' },
        { status: 409 }
      );
    }

    // Crear evento en Google Calendar
    const tituloEvento = `Turno - ${nombre} ${apellido}`;
    const eventId = await createCalendarEvent(
      googleConfig,
      tituloEvento,
      startDateTime,
      endDateTime,
      config.calendarEmail || undefined
    );

    return NextResponse.json({
      success: true,
      message: 'Turno reservado exitosamente',
      eventId,
    });
  } catch (error: any) {
    console.error('Error reservando turno:', error);
    return NextResponse.json(
      { error: error.message || 'Error al reservar el turno' },
      { status: 500 }
    );
  }
}

