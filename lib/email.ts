import nodemailer from 'nodemailer';

/**
 * Crea un transporter de nodemailer
 * Si no hay configuración, usa Gmail con OAuth2 o configuración por defecto
 */
function createTransporter() {
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

  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

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
      text: text || html.replace(/<[^>]*>/g, ''),
      html,
    });

    console.log(`Email enviado exitosamente a ${to}`);
  } catch (error) {
    console.error('Error enviando email:', error);
    throw new Error('Error al enviar el email');
  }
}

function formatFechaLarga(fecha: string): string {
  const [year, month, day] = fecha.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0).toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface DetailRow {
  label: string;
  value: string;
}

interface MinimalEmailOptions {
  title: string;
  subtitle: string;
  rows: DetailRow[];
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote: string;
}

/**
 * Layout Minimal compartido (header navy MiTurnoVirtual + acento coral + botón negro)
 */
function renderMinimalEmail({
  title,
  subtitle,
  rows,
  ctaLabel,
  ctaUrl,
  footerNote,
}: MinimalEmailOptions): string {
  const rowsHtml = rows
    .map(
      (row, index) => `
      <tr>
        <td style="padding: 14px 0; border-bottom: ${index === rows.length - 1 ? '0' : '1px solid #e6e2db'};">
          <div style="font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #8a8680; font-family: Arial, Helvetica, sans-serif; margin-bottom: 4px;">
            ${escapeHtml(row.label)}
          </div>
          <div style="font-size: 16px; color: #0b1c2c; font-family: Arial, Helvetica, sans-serif; font-weight: 700;">
            ${escapeHtml(row.value)}
          </div>
        </td>
      </tr>`
    )
    .join('');

  const ctaHtml =
    ctaLabel && ctaUrl
      ? `
        <tr>
          <td style="padding: 28px 0 8px 0;" align="center">
            <a href="${ctaUrl}"
               style="display: inline-block; background-color: #111111; color: #ffffff !important; text-decoration: none; font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 700; padding: 14px 28px; border-radius: 4px;">
              ${escapeHtml(ctaLabel)}
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0 0 0; font-size: 12px; color: #8a8680; font-family: Arial, Helvetica, sans-serif; word-break: break-all;">
            Si el botón no funciona, copiá este enlace:<br>
            <a href="${ctaUrl}" style="color: #c45c3a;">${escapeHtml(ctaUrl)}</a>
          </td>
        </tr>`
      : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #eae6df;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #eae6df; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px; background-color: #f3f1ee;">
          <tr>
            <td style="background-color: #0b1c2c; padding: 22px 28px;">
              <div style="font-family: Arial, Helvetica, sans-serif; font-size: 22px; font-weight: 800; letter-spacing: -0.03em; color: #ffffff;">
                MiTurnoVirtual
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 28px 8px 28px;">
              <div style="width: 40px; height: 3px; background-color: #c45c3a; margin-bottom: 14px;"></div>
              <div style="font-family: Arial, Helvetica, sans-serif; font-size: 26px; font-weight: 800; color: #0b1c2c; letter-spacing: -0.02em; line-height: 1.2;">
                ${escapeHtml(title)}
              </div>
              <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #8a8680; margin-top: 10px; line-height: 1.5;">
                ${escapeHtml(subtitle)}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 28px 8px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                ${rowsHtml}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 28px 28px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                ${ctaHtml}
                <tr>
                  <td style="padding-top: 24px; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #8a8680; line-height: 1.5;">
                    ${escapeHtml(footerNote)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Email de solicitud de turno para el barbero/admin
 */
export function generateSolicitudEmailHTML(
  nombre: string,
  apellido: string,
  telefono: string,
  email: string,
  fecha: string,
  hora: string,
  confirmUrl: string
): string {
  return renderMinimalEmail({
    title: 'Nueva solicitud de turno',
    subtitle: 'Revisá los datos del cliente y confirmá el turno cuando puedas.',
    rows: [
      { label: 'Cliente', value: `${nombre} ${apellido}` },
      { label: 'Teléfono', value: telefono },
      { label: 'Email', value: email },
      { label: 'Fecha', value: formatFechaLarga(fecha) },
      { label: 'Hora', value: `${hora} hs` },
    ],
    ctaLabel: 'Confirmar turno',
    ctaUrl: confirmUrl,
    footerNote:
      'Este es un email automático de MiTurnoVirtual. Si el botón no responde, usá el enlace de abajo.',
  });
}

/**
 * Email de confirmación de turno (cliente o admin)
 */
export function generateConfirmacionEmailHTML(
  nombre: string,
  apellido: string,
  fecha: string,
  hora: string,
  esAdmin: boolean = false,
  telefono?: string
): string {
  const rows: DetailRow[] = [
    { label: 'Cliente', value: `${nombre} ${apellido}` },
  ];

  if (telefono) {
    rows.push({ label: 'Teléfono', value: telefono });
  }

  rows.push(
    { label: 'Fecha', value: formatFechaLarga(fecha) },
    { label: 'Hora', value: `${hora} hs` }
  );

  return renderMinimalEmail({
    title: 'Turno confirmado',
    subtitle: esAdmin
      ? 'El turno quedó confirmado y se agregó al calendario.'
      : 'Gracias por reservar con nosotros. Te esperamos.',
    rows,
    footerNote: esAdmin
      ? 'Este es un email automático de MiTurnoVirtual. El evento ya está en Google Calendar.'
      : 'Si necesitás modificar o cancelar tu turno, avisá con anticipación. Este es un email automático, no respondas a este mensaje.',
  });
}
