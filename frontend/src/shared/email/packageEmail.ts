import { EMAIL_ASSET_BASE_URL } from '../services/sendPackage';

export interface PackageEmailInput {
  educatorName?: string;
  audience: string;
  components: { title: string; type: string; minutes: number }[];
  quizLink?: string;
  quizQuestionCount?: number;
  lessonPlanLink?: string;
  lessonPlanLength?: number;
  lessonPlanLevel?: string;
  feedbackLink: string;
  hadAiReview: boolean;
}

/**
 * Escape HTML special characters for safe insertion into HTML content.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/\"/g, '"')
    .replace(/'/g, '&apos;');
}

/**
 * Helper to build a consistent email button.
 */
function buildButton({ href, label, variant = 'dark' }: { href: string; label: string; variant?: 'dark' | 'outline' }): string {
  const baseStyle = 'display:inline-block;width:220px;box-sizing:border-box;text-align:center;padding:12px 0;font-size:14px;font-weight:bold;border-radius:999px;text-decoration:none;';
  const darkStyle = 'background:#0B1F33;color:#FFFFFF;border:1px solid #0B1F33;';
  const outlineStyle = 'background:#FFFFFF;color:#0B1F33;border:1px solid #0B1F33;';
  const style = variant === 'outline' ? baseStyle + outlineStyle : baseStyle + darkStyle;
  return `<a href="${escapeHtml(href)}" style="${style}">${escapeHtml(label)}</a>`;
}

/**
 * Build a component row table for the email.
 * Shows activity type (Watch, Create, Read, Play) instead of Fixed/Adapted.
 */
function buildComponentRow(component: { title: string; type: string; minutes: number }): string {
  const safeTitle = escapeHtml(component.title);
  const safeType = escapeHtml(component.type);
  const minutes = component.minutes;

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #E3E9ED;">
  <tr>
    <td style="padding:10px 0;font-size:15px;line-height:22px;">${safeTitle}</td>
    <td align="right" style="padding:10px 0;font-size:13px;color:#4A6072;white-space:nowrap;">${safeType} \u00b7 ${minutes} min</td>
  </tr>
</table>`;
}

/**
 * Build the components section.
 */
function buildComponentsSection(components: PackageEmailInput['components']): string {
  return components.map(buildComponentRow).join('\n');
}

/**
 * Build the lesson plan block if link exists.
 */
function buildLessonPlanBlock(input: PackageEmailInput): string {
  if (!input.lessonPlanLink) return '';

  // PDF URL using the email asset base URL
  const pdfUrl = `${EMAIL_ASSET_BASE_URL}/files/seagrass-stories-lesson-plan.pdf`;

  return `
<tr>
  <td style="padding:28px 40px 0 40px;">
    <div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#4A6072;font-weight:bold;margin-bottom:6px;">Before class</div>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:24px;">Your lesson plan is ready. Download it to print or share with co-teachers.</p>
    ${buildButton({ href: escapeHtml(pdfUrl), label: 'Download lesson plan (PDF)', variant: 'dark' })}
    <p style="margin:12px 0 0 0;font-size:13px;line-height:20px;color:#6B7F8E;">Sample lesson plan for the prototype.</p>
  </td>
</tr>`;
}

/**
 * Build the quiz block if link exists.
 */
function buildQuizBlock(input: PackageEmailInput): string {
  if (!input.quizLink) return '';

  const safeLink = escapeHtml(input.quizLink);
  const safeCount = escapeHtml(String(input.quizQuestionCount ?? ''));
  const linkText = safeLink.replace(/^https?:\/\//, '');

  return `
<tr>
  <td style="padding:28px 40px 0 40px;">
    <div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#4A6072;font-weight:bold;margin-bottom:6px;">During class</div>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:24px;">Share this quiz link with your learners. They open it at the start of class and again at the end (${safeCount} questions, about 3 minutes each time).</p>
    ${buildButton({ href: safeLink, label: 'Open learner quiz', variant: 'outline' })}
    <p style="margin:12px 0 0 0;font-size:13px;line-height:20px;color:#6B7F8E;">Or copy the link: <a href="${safeLink}" style="color:#0B6E85;">${linkText}</a></p>
  </td>
</tr>`;
}

/**
 * Main function to build the package email HTML and subject.
 */
export function buildPackageEmail(input: PackageEmailInput): { subject: string; html: string } {
  const subject = 'Your Seagrass Stories package is ready';

  const educatorName = input.educatorName && input.educatorName.trim() ? escapeHtml(input.educatorName.trim()) : 'there';
  const audience = escapeHtml(input.audience);
  const feedbackLink = escapeHtml(input.feedbackLink);
  const hadAiReview = input.hadAiReview;
  const headerImageUrl = `${EMAIL_ASSET_BASE_URL}/email/oceanx-email-header.jpg`;
  const resourcesLink = `${EMAIL_ASSET_BASE_URL}/partner/library`;

  console.log('[buildPackageEmail] header image src:', headerImageUrl);

  const intro = hadAiReview
    ? `Here is everything for your ${audience} session. Each part has been checked by the OceanX Education team.`
    : `Here is everything for your ${audience} session, ready to use.`;

  const componentsRows = buildComponentsSection(input.components);
  const lessonPlanBlock = buildLessonPlanBlock(input);
  const quizBlock = buildQuizBlock(input);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#F3F6F8;">
  <div style="margin:0;padding:0;background:#F3F6F8;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F6F8;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#FFFFFF;border-radius:12px;overflow:hidden;font-family:Helvetica,Arial,sans-serif;color:#1B2A36;">
            <tr>
              <td style="height:6px;background:#90E0EF;font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:16px 40px 0 40px;font-size:11px;color:#8A9AA6;">Prototype demo. Not a real OceanX service.</td>
            </tr>
            <tr>
              <td style="padding:0;line-height:0;font-size:0;">
                <img src="${headerImageUrl}" width="600" alt="OceanX Education" style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;text-decoration:none;background:#0B2A4A;">
              </td>
            </tr>
            <tr>
              <td style="padding:20px 40px 0 40px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#4A6072;font-weight:bold;">OceanX Education</td>
            </tr>
            <tr>
              <td style="padding:8px 40px 0 40px;">
                <h1 style="margin:0 0 12px 0;font-size:24px;line-height:32px;font-weight:normal;color:#0B1F33;">Your Seagrass Stories package is ready</h1>
                <p style="margin:0 0 8px 0;font-size:15px;line-height:24px;">Hi ${educatorName},</p>
                <p style="margin:0;font-size:15px;line-height:24px;">${intro}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 40px 0 40px;">
                <div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#4A6072;font-weight:bold;margin-bottom:10px;">In your package</div>
                ${componentsRows}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 40px 0 40px;">
                <p style="margin:16px 0 0 0;">${buildButton({ href: resourcesLink, label: 'Open your resources', variant: 'dark' })}</p>
              </td>
            </tr>
            ${lessonPlanBlock}
            ${quizBlock}
            <tr>
              <td style="padding:28px 40px 0 40px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3FBFD;border-left:4px solid #90E0EF;border-radius:8px;">
                  <tr>
                    <td style="padding:20px 24px;">
                      <div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#4A6072;font-weight:bold;margin-bottom:6px;">After class</div>
                      <p style="margin:0 0 16px 0;font-size:15px;line-height:24px;">Tell us how the session went. It takes about 3 minutes and helps us improve every future version of Seagrass Stories.</p>
                      <a href="${feedbackLink}" style="color:#0B6E85;text-decoration:underline;font-size:15px;font-weight:bold;">Share your feedback</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 40px 32px 40px;">
                <p style="margin:0 0 16px 0;font-size:15px;line-height:24px;">Thank you for bringing the ocean into your classroom.</p>
                <p style="margin:0;font-size:15px;line-height:24px;">Warm regards,<br>OceanX Education team</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 40px;background:#F7F9FA;border-top:1px solid #E3E9ED;">
                <p style="margin:0;font-size:12px;line-height:18px;color:#6B7F8E;">You received this because you requested a Seagrass Stories package for ${audience} learners. Questions? Reply to this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;

  return { subject, html };
}