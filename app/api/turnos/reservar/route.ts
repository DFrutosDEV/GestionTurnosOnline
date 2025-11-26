import { NextRequest, NextResponse } from 'next/server';
import { checkAvailability, createCalendarEvent, createDateInArgentinaTimezone, getDayOfWeekInArgentina } from '@/lib/googleCalendar';
import { getConfig } from '@/lib/config';
import { addMinutes } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const { nombre, apellido, fecha, hora } = await request.json();

    if (!nombre || !apellido || !fecha || !hora) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    const config = getConfig();

    if (!config.enabled) {
      return NextResponse.json(
        { error: 'Las reservas están deshabilitadas temporalmente' },
        { status: 400 }
      );
    }

    const diaSemana = getDayOfWeekInArgentina(fecha);
    if (!config.allowedDays.includes(diaSemana)) {
      return NextResponse.json(
        { error: 'El día seleccionado no está disponible para reservas' },
        { status: 400 }
      );
    }

    const horaTurno = parseInt(hora.split(':')[0]);
    if (horaTurno < config.startHour || horaTurno > config.endHour) {
      return NextResponse.json(
        { error: 'El horario seleccionado no está disponible para reservas' },
        { status: 400 }
      );
    }

    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_CALENDAR_ID) {
      return NextResponse.json(
        { error: 'Configuración de Google Calendar no encontrada' },
        { status: 500 }
      );
    }

    const startDateTime = createDateInArgentinaTimezone(fecha, hora);
    const endDateTime = addMinutes(startDateTime, 30);

    const googleConfig = {
      clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_PRIVATE_KEY,
      calendarId: process.env.GOOGLE_CALENDAR_ID,
    };

    const disponible = await checkAvailability(googleConfig, startDateTime, endDateTime);
    if (!disponible) {
      return NextResponse.json(
        { error: 'El horario seleccionado no está disponible' },
        { status: 409 }
      );
    }

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

