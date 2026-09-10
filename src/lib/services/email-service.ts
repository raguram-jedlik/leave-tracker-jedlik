// ============================================================================
// Email Notification Service — using Resend
// ============================================================================

import { Resend } from 'resend';
import { LeaveRequest, RegionalHolidayRequest } from '@/lib/types';
import { formatDateRange } from '@/lib/date-utils';

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY not configured. Email notifications are disabled.');
    return null;
  }
  return new Resend(apiKey);
}

function getFromEmail(): string {
  return process.env.NOTIFICATION_FROM_EMAIL || 'onboarding@resend.dev';
}

function getAdminEmail(): string {
  return process.env.ADMIN_EMAIL || '';
}

function getApproverEmail(): string {
  return process.env.APPROVER_EMAIL || '';
}

function getAppUrl(): string {
  return process.env.NEXTAUTH_URL || 'http://localhost:3000';
}

/**
 * Send email safely — never throws.
 * Returns true on success, false on failure.
 */
async function sendEmailSafe(
  to: string[],
  subject: string,
  html: string
): Promise<boolean> {
  const resend = getResendClient();
  if (!resend) return false;

  const validRecipients = to.filter((email) => email && email.includes('@'));
  if (validRecipients.length === 0) {
    console.warn('No valid email recipients. Skipping email.');
    return false;
  }

  try {
    await resend.emails.send({
      from: getFromEmail(),
      to: validRecipients,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

// --- Email Templates ---

function baseTemplate(title: string, content: string): string {
  const appUrl = getAppUrl();
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Inter', Arial, sans-serif; background-color: #f4f4f5; color: #18181b;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%); padding: 24px 32px; border-radius: 12px 12px 0 0; text-align: center;">
          <img src="${appUrl}/jedlik-logo.jpg" alt="Jedlik" style="max-width: 200px; height: auto; display: block; margin: 0 auto;" />
          <p style="margin: 8px 0 0; font-size: 12px; color: #a1a1aa; letter-spacing: 1px;">EMPLOYEE LEAVE PORTAL</p>
        </div>

        <!-- Content -->
        <div style="background: #ffffff; padding: 32px; border: 1px solid #e4e4e7; border-top: none;">
          <h2 style="margin: 0 0 16px; font-size: 18px; color: #18181b;">${title}</h2>
          ${content}
        </div>

        <!-- Footer -->
        <div style="background: #fafafa; padding: 16px 32px; border-radius: 0 0 12px 12px; border: 1px solid #e4e4e7; border-top: none; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #71717a;">
            This is an automated notification from the Employee Leave Portal.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function detailRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding: 8px 0; color: #71717a; font-size: 14px; width: 140px; vertical-align: top;">${label}</td>
      <td style="padding: 8px 0; font-size: 14px; font-weight: 500;">${value}</td>
    </tr>
  `;
}

function statusBadge(status: string, color: string): string {
  return `<span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background-color: ${color}; color: #ffffff;">${status}</span>`;
}

// --- Notification Functions ---

/**
 * New leave request notification to admin and approver.
 */
export async function sendNewLeaveRequestEmail(
  request: LeaveRequest
): Promise<void> {
  const appUrl = getAppUrl();
  const content = `
    <p style="color: #52525b; margin: 0 0 20px;">A new leave request requires your review.</p>
    <table style="width: 100%; border-collapse: collapse;">
      ${detailRow('Employee', request.employeeName)}
      ${detailRow('Leave Type', request.leaveType)}
      ${detailRow('Start Date', formatDate(request.startDate))}
      ${detailRow('End Date', formatDate(request.endDate))}
      ${detailRow('Days', request.numberOfDays.toString())}
      ${detailRow('Reason', request.reason)}
      ${detailRow('Status', statusBadge('Pending', '#f59e0b'))}
    </table>
    <div style="margin-top: 24px; text-align: center;">
      <a href="${appUrl}/dashboard/approvals" style="display: inline-block; padding: 12px 32px; background-color: #ec1c24; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
        Review Request
      </a>
    </div>
  `;

  await sendEmailSafe(
    [getAdminEmail(), getApproverEmail()],
    `New Leave Request – ${request.employeeName} (${formatDateRange(request.startDate, request.endDate)})`,
    baseTemplate('New Leave Request', content)
  );
}

/**
 * Leave approved notification to employee.
 */
export async function sendLeaveApprovedEmail(
  request: LeaveRequest,
  employeeEmail: string
): Promise<void> {
  const content = `
    <p style="color: #52525b; margin: 0 0 20px;">Your leave request has been <strong style="color: #22c55e;">approved</strong>.</p>
    <table style="width: 100%; border-collapse: collapse;">
      ${detailRow('Leave Type', request.leaveType)}
      ${detailRow('Start Date', formatDate(request.startDate))}
      ${detailRow('End Date', formatDate(request.endDate))}
      ${detailRow('Days', request.numberOfDays.toString())}
      ${detailRow('Approved By', request.reviewedBy)}
      ${request.reviewerComment ? detailRow('Comments', request.reviewerComment) : ''}
      ${detailRow('Status', statusBadge('Approved', '#22c55e'))}
    </table>
  `;

  await sendEmailSafe(
    [employeeEmail],
    `Leave Approved – ${formatDateRange(request.startDate, request.endDate)}`,
    baseTemplate('Leave Request Approved', content)
  );
}

/**
 * Leave rejected notification to employee.
 */
export async function sendLeaveRejectedEmail(
  request: LeaveRequest,
  employeeEmail: string
): Promise<void> {
  const content = `
    <p style="color: #52525b; margin: 0 0 20px;">Your leave request has been <strong style="color: #ef4444;">rejected</strong>.</p>
    <table style="width: 100%; border-collapse: collapse;">
      ${detailRow('Leave Type', request.leaveType)}
      ${detailRow('Start Date', formatDate(request.startDate))}
      ${detailRow('End Date', formatDate(request.endDate))}
      ${detailRow('Days', request.numberOfDays.toString())}
      ${detailRow('Rejected By', request.reviewedBy)}
      ${request.reviewerComment ? detailRow('Reason', request.reviewerComment) : ''}
      ${detailRow('Status', statusBadge('Rejected', '#ef4444'))}
    </table>
  `;

  await sendEmailSafe(
    [employeeEmail],
    `Leave Request Rejected – ${formatDateRange(request.startDate, request.endDate)}`,
    baseTemplate('Leave Request Rejected', content)
  );
}

/**
 * Regional holiday decision notification to employee.
 */
export async function sendRegionalHolidayDecisionEmail(
  request: RegionalHolidayRequest,
  employeeEmail: string
): Promise<void> {
  const statusMap: Record<string, { label: string; color: string }> = {
    APPROVED_PAID: { label: 'Approved (Paid)', color: '#22c55e' },
    APPROVED_UNPAID: { label: 'Approved (Unpaid)', color: '#3b82f6' },
    REJECTED: { label: 'Rejected', color: '#ef4444' },
  };

  const statusInfo = statusMap[request.status] || { label: request.status, color: '#71717a' };

  const content = `
    <p style="color: #52525b; margin: 0 0 20px;">Your regional/religious holiday request has been reviewed.</p>
    <table style="width: 100%; border-collapse: collapse;">
      ${detailRow('Holiday', request.holidayName)}
      ${detailRow('Date', formatDate(request.date))}
      ${detailRow('Decision', statusBadge(statusInfo.label, statusInfo.color))}
      ${detailRow('Reviewed By', request.reviewedBy)}
      ${request.reviewerComment ? detailRow('Comments', request.reviewerComment) : ''}
    </table>
  `;

  await sendEmailSafe(
    [employeeEmail],
    `Regional Holiday Decision – ${request.holidayName}`,
    baseTemplate('Regional Holiday Decision', content)
  );
}

/**
 * New regional holiday request notification to admin/approver.
 */
export async function sendNewRegionalHolidayEmail(
  request: RegionalHolidayRequest
): Promise<void> {
  const appUrl = getAppUrl();
  const content = `
    <p style="color: #52525b; margin: 0 0 20px;">A new regional/religious holiday request requires your review.</p>
    <table style="width: 100%; border-collapse: collapse;">
      ${detailRow('Employee', request.employeeName)}
      ${detailRow('Holiday', request.holidayName)}
      ${detailRow('Date', formatDate(request.date))}
      ${detailRow('Reason', request.reason)}
      ${detailRow('Status', statusBadge('Pending', '#f59e0b'))}
    </table>
    <div style="margin-top: 24px; text-align: center;">
      <a href="${appUrl}/dashboard/regional-holidays" style="display: inline-block; padding: 12px 32px; background-color: #ec1c24; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
        Review Request
      </a>
    </div>
  `;

  await sendEmailSafe(
    [getAdminEmail(), getApproverEmail()],
    `Regional Holiday Request – ${request.employeeName}`,
    baseTemplate('New Regional Holiday Request', content)
  );
}

// --- Helpers ---

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr + 'T00:00:00+05:30');
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
