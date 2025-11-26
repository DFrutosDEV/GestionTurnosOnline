import { NextRequest, NextResponse } from 'next/server';
import { checkAvailability, createDateInArgentinaTimezone } from '@/lib/googleCalendar';
import { addMinutes } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const { fecha, hora } = await request.json();

    if (!fecha || !hora) {
      return NextResponse.json(
        { error: 'Fecha y hora son requeridos' },
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
    return NextResponse.json({ disponible });
  } catch (error: any) {
    console.error('Error verificando disponibilidad:', error);
    return NextResponse.json(
      { error: error.message || 'Error verificando disponibilidad' },
      { status: 500 }
    );
  }
}

