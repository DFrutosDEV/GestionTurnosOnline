import nodemailer from 'nodemailer';

interface EmailConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  auth?: {
    user: string;
    pass: string;
  };
}

/**
 * Crea un transporter de nodemailer
 * Si no hay configuración, usa Gmail con OAuth2 o configuración por defecto
 */
function createTransporter() {
  // Si hay configuración SMTP personalizada, úsala
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Si hay Gmail App Password configurado
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  // Si no hay configuración, lanzar error claro
  throw new Error(
    'Configuración de email no encontrada. Por favor, configura una de las siguientes opciones:\n' +
    '1. Gmail: GMAIL_USER y GMAIL_APP_PASSWORD\n' +
    '2. SMTP: SMTP_HOST, SMTP_USER y SMTP_PASS\n' +
    'Ver el archivo .env.example para más detalles.'
  );
}

/**
 * Envía un email
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<void> {
  try {
    const transporter = createTransporter();

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.GMAIL_USER || 'noreply@turnos.com',
      to,
      subject,
      text: text || html.replace(/<[^>]*>/g, ''), // Convertir HTML a texto si no se proporciona
      html,
    });

    console.log(`Email enviado exitosamente a ${to}`);
  } catch (error) {
    console.error('Error enviando email:', error);
    throw new Error('Error al enviar el email');
  }
}

/**
 * Genera el HTML del email de solicitud de turno para el admin
 */
export function generateSolicitudEmailHTML(
  nombre: string,
  apellido: string,
  email: string,
  fecha: string,
  hora: string,
  confirmUrl: string
): string {
  const fechaFormateada = new Date(`${fecha}T${hora}`).toLocaleString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #1976d2;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 5px 5px 0 0;
        }
        .content {
          background-color: #f9f9f9;
          padding: 20px;
          border: 1px solid #ddd;
        }
        .info {
          background-color: white;
          padding: 15px;
          margin: 10px 0;
          border-left: 4px solid #1976d2;
        }
        .button {
          display: inline-block;
          background-color: #1976d2;
          color: white !important;
          padding: 12px 30px;
          text-decoration: none !important;
          border-radius: 5px;
          margin: 20px 0;
          font-weight: bold;
        }
        a.button {
          color: white !important;
          text-decoration: none !important;
        }
        a.button:link,
        a.button:visited,
        a.button:hover,
        a.button:active {
          color: white !important;
          text-decoration: none !important;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          color: #666;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Nueva Solicitud de Turno</h1>
      </div>
      <div class="content">
        <p>Has recibido una nueva solicitud de turno:</p>
        
        <div class="info">
          <strong>Cliente:</strong> ${nombre} ${apellido}<br>
          <strong>Email:</strong> ${email}<br>
          <strong>Fecha y Hora:</strong> ${fechaFormateada}
        </div>

        <div style="text-align: center;">
          <a href="${confirmUrl}" class="button" style="background-color: #1976d2; color: white !important; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: bold; display: inline-block;">Confirmar Turno</a>
        </div>

        <p style="font-size: 12px; color: #666;">
          O copia y pega este enlace en tu navegador:<br>
          <a href="${confirmUrl}">${confirmUrl}</a>
        </p>
      </div>
      <div class="footer">
        <p>Este es un email automático del sistema de gestión de turnos.</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Genera el HTML del email de confirmación de turno
 */
export function generateConfirmacionEmailHTML(
  nombre: string,
  apellido: string,
  fecha: string,
  hora: string,
  esAdmin: boolean = false
): string {
  const fechaFormateada = new Date(`${fecha}T${hora}`).toLocaleString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const destinatario = esAdmin ? 'Administrador' : `${nombre} ${apellido}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #4caf50;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 5px 5px 0 0;
        }
        .content {
          background-color: #f9f9f9;
          padding: 20px;
          border: 1px solid #ddd;
        }
        .info {
          background-color: white;
          padding: 15px;
          margin: 10px 0;
          border-left: 4px solid #4caf50;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          color: #666;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>✅ Turno Confirmado</h1>
      </div>
      <div class="content">
        <p>Hola ${destinatario},</p>
        
        <p>Tu turno ha sido confirmado exitosamente:</p>
        
        <div class="info">
          <strong>Cliente:</strong> ${nombre} ${apellido}<br>
          <strong>Fecha y Hora:</strong> ${fechaFormateada}
        </div>

        <p>El evento ha sido agregado a tu calendario. Recibirás una invitación de Google Calendar.</p>
      </div>
      <div class="footer">
        <p>Este es un email automático del sistema de gestión de turnos.</p>
      </div>
    </body>
    </html>
  `;
}

