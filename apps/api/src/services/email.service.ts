import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/env';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailResult {
  success: boolean;
  simulated: boolean;
  messageId?: string;
  recipient: string;
  error?: string;
}

export interface BookEmailDetails {
  title: string;
  isbn?: string;
  authors?: string[];
  categories?: string[];
  shelfLocation?: string;
  edition?: string;
  publicationYear?: number;
  description?: string;
  coverImageUrl?: string;
  totalCopies?: number;
  availableCopies?: number;
}

export interface AvailabilityEmailDetails {
  title: string;
  shelfLocation?: string;
  accessionNumber?: string;
  availableCopies?: number;
  expiresAt?: string;
  isReservationPickup?: boolean;
}

export interface NotificationEmailPayload {
  to: string;
  recipientName: string;
  type: 'BORROWING' | 'LOAN' | 'RESERVATION' | 'ACCOUNT' | 'SYSTEM' | 'NEW_BOOK' | 'BOOK_AVAILABLE';
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  bookDetails?: BookEmailDetails;
  availabilityDetails?: AvailabilityEmailDetails;
}

let transporter: Transporter | null = null;

export const getTransporter = (): Transporter | null => {
  if (transporter) return transporter;

  if (config.smtp.isConfigured) {
    try {
      transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.password,
        },
        tls: {
          rejectUnauthorized: false, // Prevents failure with internal/university certs
        },
      });
      console.log(`[EMAIL SERVICE] Initialized SMTP Transport for host: ${config.smtp.host}:${config.smtp.port}`);
    } catch (err: any) {
      console.error('[EMAIL SERVICE] Failed to initialize SMTP Transport:', err.message);
      transporter = null;
    }
  }

  return transporter;
};

export const verifySmtpConnection = async (): Promise<{ verified: boolean; message: string }> => {
  const mailer = getTransporter();
  if (!mailer) {
    return {
      verified: false,
      message: 'SMTP is unconfigured (running in simulated / development mode).',
    };
  }

  try {
    await mailer.verify();
    return { verified: true, message: 'SMTP server connection verified successfully.' };
  } catch (err: any) {
    return { verified: false, message: `SMTP verification failed: ${err.message}` };
  }
};

/**
 * Builds responsive, branded HTML email for LIBNEXA notifications
 */
export const generateNotificationEmailHtml = (options: {
  recipientName: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  bookDetails?: BookEmailDetails;
  availabilityDetails?: AvailabilityEmailDetails;
}): string => {
  const {
    recipientName,
    type,
    title,
    message,
    actionUrl = config.appBaseUrl,
    actionLabel = 'Open Library Portal',
    bookDetails,
    availabilityDetails,
  } = options;

  const typeColorMap: Record<string, { bg: string; text: string; label: string }> = {
    BORROWING: { bg: '#E0F2FE', text: '#0369A1', label: 'Borrowing Alert' },
    LOAN: { bg: '#FEF3C7', text: '#B45309', label: 'Due Date Reminder' },
    RESERVATION: { bg: '#D1FAE5', text: '#047857', label: 'Reservation Update' },
    ACCOUNT: { bg: '#EDE9FE', text: '#6D28D9', label: 'Account Notification' },
    SYSTEM: { bg: '#F1F5F9', text: '#334155', label: 'System Notice' },
    NEW_BOOK: { bg: '#EDE9FE', text: '#6D28D9', label: 'New Book Arrival' },
    BOOK_AVAILABLE: { bg: '#DCFCE7', text: '#15803D', label: 'Book Available Now' },
  };

  const badge = typeColorMap[type] || typeColorMap.SYSTEM;

  // Optional Rich Book Details Showcase Box
  let bookHtml = '';
  if (bookDetails) {
    const authorsStr = (bookDetails.authors && bookDetails.authors.length > 0)
      ? bookDetails.authors.join(', ')
      : 'Faculty / Academic Authors';
    const categoriesStr = (bookDetails.categories && bookDetails.categories.length > 0)
      ? bookDetails.categories.join(' • ')
      : 'General Academic';

    bookHtml = `
      <div style="background: linear-gradient(135deg, #082B60 0%, #0F3B7A 100%); border-radius: 10px; padding: 22px; color: #FFFFFF; margin: 20px 0; border: 1px solid #1E4E8C; box-shadow: 0 4px 15px rgba(8, 43, 96, 0.15);">
        <div style="font-size: 10px; font-weight: 800; color: #11C4D2; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px;">
          NSUK Central Library Collection
        </div>
        <h3 style="margin: 0 0 6px 0; font-size: 19px; color: #FFFFFF; font-weight: 800; line-height: 1.3;">
          ${bookDetails.title}
        </h3>
        <p style="margin: 0 0 14px 0; font-size: 13px; color: #CBD5E1;">
          by <strong style="color: #FFFFFF;">${authorsStr}</strong>
        </p>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; background-color: rgba(255, 255, 255, 0.08); border-radius: 6px;">
          <tr>
            <td style="padding: 8px 12px; color: #94A3B8; border-bottom: 1px solid rgba(255, 255, 255, 0.1); width: 35%;">Category:</td>
            <td style="padding: 8px 12px; color: #FFFFFF; font-weight: 600; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${categoriesStr}</td>
          </tr>
          ${bookDetails.isbn ? `
          <tr>
            <td style="padding: 8px 12px; color: #94A3B8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">ISBN:</td>
            <td style="padding: 8px 12px; color: #11C4D2; font-family: monospace; font-weight: 600; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${bookDetails.isbn}</td>
          </tr>` : ''}
          ${bookDetails.shelfLocation ? `
          <tr>
            <td style="padding: 8px 12px; color: #94A3B8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">Shelf Location:</td>
            <td style="padding: 8px 12px; color: #FFFFFF; font-weight: 600; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${bookDetails.shelfLocation}</td>
          </tr>` : ''}
          ${bookDetails.publicationYear ? `
          <tr>
            <td style="padding: 8px 12px; color: #94A3B8;">Publication Year:</td>
            <td style="padding: 8px 12px; color: #FFFFFF; font-weight: 600;">${bookDetails.publicationYear}</td>
          </tr>` : ''}
        </table>

        ${bookDetails.description ? `
        <p style="margin: 14px 0 0 0; font-size: 12px; color: #E2E8F0; line-height: 1.6; font-style: italic;">
          "${bookDetails.description.length > 200 ? bookDetails.description.substring(0, 200) + '...' : bookDetails.description}"
        </p>` : ''}
      </div>
    `;
  }

  // Optional Availability Alert Box
  let availabilityHtml = '';
  if (availabilityDetails) {
    const isPickup = availabilityDetails.isReservationPickup;
    availabilityHtml = `
      <div style="background-color: ${isPickup ? '#ECFDF5' : '#F0F9FF'}; border: 1px solid ${isPickup ? '#A7F3D0' : '#BAE6FD'}; border-left: 4px solid ${isPickup ? '#059669' : '#0284C7'}; border-radius: 8px; padding: 18px; margin: 18px 0;">
        <div style="font-size: 14px; font-weight: 800; color: ${isPickup ? '#065F46' : '#0369A1'}; margin-bottom: 8px;">
          ${isPickup ? '&#10003; Reserved Copy Placed on Hold for You' : '&#9733; Physical Copies Now Available on Shelf'}
        </div>
        <p style="margin: 0 0 10px 0; font-size: 13px; color: #1E293B; line-height: 1.5;">
          ${isPickup
            ? `A physical copy of <strong>${availabilityDetails.title}</strong> has been assigned to your reservation queue position.`
            : `Physical copies of <strong>${availabilityDetails.title}</strong> are now available for immediate checkout in the library stacks.`}
        </p>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; background-color: #FFFFFF; border-radius: 6px; border: 1px solid ${isPickup ? '#D1FAE5' : '#E0F2FE'};">
          ${availabilityDetails.accessionNumber ? `
          <tr>
            <td style="padding: 6px 10px; color: #64748B; font-weight: 600; width: 40%;">Accession No.:</td>
            <td style="padding: 6px 10px; color: #0F172A; font-family: monospace; font-weight: 700;">${availabilityDetails.accessionNumber}</td>
          </tr>` : ''}
          ${availabilityDetails.shelfLocation ? `
          <tr>
            <td style="padding: 6px 10px; color: #64748B; font-weight: 600;">Location:</td>
            <td style="padding: 6px 10px; color: #0F172A; font-weight: 700;">${availabilityDetails.shelfLocation}</td>
          </tr>` : ''}
          ${availabilityDetails.expiresAt ? `
          <tr>
            <td style="padding: 6px 10px; color: #DC2626; font-weight: 700;">Collection Deadline:</td>
            <td style="padding: 6px 10px; color: #DC2626; font-weight: 800;">${availabilityDetails.expiresAt}</td>
          </tr>` : ''}
        </table>
      </div>
    `;
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F5F8FC;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #172438;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #F5F8FC;
      padding: 30px 10px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(8, 43, 96, 0.08);
      border: 1px solid #E2E8F0;
    }
    .header {
      background: linear-gradient(135deg, #082B60 0%, #1268B3 60%, #079BA9 100%);
      padding: 32px 28px;
      text-align: left;
    }
    .logo-text {
      color: #FFFFFF;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 1.5px;
      margin: 0;
    }
    .logo-sub {
      color: #11C4D2;
      font-size: 11px;
      letter-spacing: 2px;
      text-transform: uppercase;
      font-weight: 600;
      margin-top: 4px;
    }
    .content {
      padding: 32px 28px;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background-color: ${badge.bg};
      color: ${badge.text};
      margin-bottom: 16px;
    }
    .title {
      font-size: 20px;
      font-weight: 700;
      color: #082B60;
      margin: 0 0 16px 0;
      line-height: 1.3;
    }
    .greeting {
      font-size: 15px;
      font-weight: 600;
      color: #172438;
      margin-bottom: 12px;
    }
    .message-box {
      background-color: #F8FAFC;
      border-left: 4px solid #1268B3;
      padding: 16px 18px;
      border-radius: 6px;
      font-size: 14px;
      line-height: 1.6;
      color: #334155;
      margin: 18px 0 24px 0;
    }
    .cta-container {
      text-align: center;
      margin: 28px 0 16px 0;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #1268B3 0%, #079BA9 100%);
      color: #FFFFFF !important;
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      padding: 12px 28px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(18, 104, 179, 0.25);
    }
    .footer {
      background-color: #F8FAFC;
      border-top: 1px solid #E2E8F0;
      padding: 24px 28px;
      font-size: 12px;
      color: #64748B;
      line-height: 1.5;
      text-align: center;
    }
    .footer-link {
      color: #1268B3;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1 class="logo-text">LIBNEXA</h1>
        <div class="logo-sub">University Library Management System</div>
      </div>
      <div class="content">
        <div class="badge">${badge.label}</div>
        <h2 class="title">${title}</h2>
        <div class="greeting">Hello ${recipientName || 'Library Member'},</div>
        <div class="message-box">
          ${message}
        </div>
        ${bookHtml}
        ${availabilityHtml}
        <p style="font-size: 13px; color: #64748B; line-height: 1.5; margin: 16px 0;">
          You can view real-time availability, submit borrowing requests, or manage your reservations anytime in the portal.
        </p>
        <div class="cta-container">
          <a href="${actionUrl}" class="cta-button" target="_blank">${actionLabel} &rarr;</a>
        </div>
      </div>
      <div class="footer">
        <strong>Nasarawa State University, Keffi — University Library</strong><br>
        This is an automated notification sent to your registered library email address.<br>
        To manage your notification preferences, visit <a href="${actionUrl}" class="footer-link">Notification Settings</a> in your LIBNEXA account.
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
};

/**
 * Core send email function. Dispatches real SMTP email if configured,
 * otherwise logs structured simulated output for dev environments.
 */
export const sendEmail = async (options: SendEmailOptions): Promise<EmailResult> => {
  const { to, subject, html, text } = options;
  const mailer = getTransporter();

  // If SMTP is NOT configured, simulate delivery gracefully
  if (!mailer || !config.smtp.isConfigured) {
    const timestamp = new Date().toISOString();
    console.log('\n===================================================================');
    console.log(`[EMAIL DISPATCH - SIMULATED / DEV MODE] ${timestamp}`);
    console.log(`To:        ${to}`);
    console.log(`From:      ${config.smtp.from}`);
    console.log(`Subject:   ${subject}`);
    console.log(`Preview:   ${(text || html).replace(/<[^>]*>/g, ' ').substring(0, 160)}...`);
    console.log('===================================================================\n');

    return {
      success: true,
      simulated: true,
      recipient: to,
      messageId: `simulated-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    };
  }

  // Real SMTP Dispatch
  try {
    const info = await mailer.sendMail({
      from: config.smtp.from,
      to,
      subject,
      text: text || html.replace(/<[^>]*>/g, ' '),
      html,
    });

    console.log(`[EMAIL DISPATCH - LIVE SENT] To: ${to} | Subject: "${subject}" | MessageId: ${info.messageId}`);

    return {
      success: true,
      simulated: false,
      recipient: to,
      messageId: info.messageId,
    };
  } catch (err: any) {
    console.error(`[EMAIL DISPATCH FAILED] Error sending to ${to}:`, err.message);
    return {
      success: false,
      simulated: false,
      recipient: to,
      error: err.message,
    };
  }
};

/**
 * Convenience helper to send branded notification emails
 */
export const sendNotificationEmail = async (payload: NotificationEmailPayload): Promise<EmailResult> => {
  const html = generateNotificationEmailHtml({
    recipientName: payload.recipientName,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    actionUrl: payload.actionUrl,
    actionLabel: payload.actionLabel,
    bookDetails: payload.bookDetails,
    availabilityDetails: payload.availabilityDetails,
  });

  const plainText = `LIBNEXA - University Library Notification\n\n${payload.title}\n\nHello ${payload.recipientName || 'Member'},\n\n${payload.message}\n\nAccess portal: ${payload.actionUrl || config.appBaseUrl}\n\nNasarawa State University, Keffi`;

  return sendEmail({
    to: payload.to,
    subject: `[LIBNEXA] ${payload.title}`,
    html,
    text: plainText,
  });
};

/**
 * Convenience helper to send new book arrival announcements
 */
export const sendNewBookEmail = async (options: {
  to: string;
  recipientName: string;
  book: BookEmailDetails;
  actionUrl?: string;
}): Promise<EmailResult> => {
  return sendNotificationEmail({
    to: options.to,
    recipientName: options.recipientName,
    type: 'NEW_BOOK',
    title: `New Arrival: "${options.book.title}" Added to Library`,
    message: `We are pleased to announce that "${options.book.title}" has been newly accessioned into the NSUK University Library collection. It is now open for browsing, reserving, and borrowing.`,
    bookDetails: options.book,
    actionUrl: options.actionUrl,
    actionLabel: 'View in Catalogue & Borrow',
  });
};

/**
 * Convenience helper to send book available alerts
 */
export const sendBookAvailableEmail = async (options: {
  to: string;
  recipientName: string;
  details: AvailabilityEmailDetails;
  actionUrl?: string;
}): Promise<EmailResult> => {
  const isPickup = options.details.isReservationPickup;
  const title = isPickup
    ? `Available for Pickup: "${options.details.title}"`
    : `Book Now Available: "${options.details.title}"`;
  const message = isPickup
    ? `Your reserved copy of "${options.details.title}" is now ready and placed on the reservation hold shelf. Please collect it before ${options.details.expiresAt || 'the collection deadline'}.`
    : `Good news! "${options.details.title}" now has physical copies available on shelf for borrowing at the University Library.`;

  return sendNotificationEmail({
    to: options.to,
    recipientName: options.recipientName,
    type: 'BOOK_AVAILABLE',
    title,
    message,
    availabilityDetails: options.details,
    actionUrl: options.actionUrl,
    actionLabel: isPickup ? 'View My Reservations' : 'Request Borrow Now',
  });
};
