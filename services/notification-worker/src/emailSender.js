'use strict';

const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
  // Credentials auto-resolved from env: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
  // In K8s, credentials come from the node IAM role or injected via secret
});

/**
 * Send an HTML email via AWS SES.
 * @param {Object} params
 * @param {string} params.to       - Recipient email address
 * @param {string} params.toName   - Recipient display name
 * @param {string} params.subject  - Email subject
 * @param {string} params.html     - HTML body content
 */
async function sendEmail({ to, toName, subject, html }) {
  const fromEmail = process.env.SES_FROM_EMAIL;
  if (!fromEmail) {
    console.warn('SES_FROM_EMAIL not set, skipping email send');
    return;
  }

  const command = new SendEmailCommand({
    Source: `IT Operations Hub <${fromEmail}>`,
    Destination: {
      ToAddresses: [toName ? `${toName} <${to}>` : to],
    },
    Message: {
      Subject: { Data: subject, Charset: 'UTF-8' },
      Body: {
        Html: { Data: html, Charset: 'UTF-8' },
        Text: {
          Data: subject, // Fallback plain text
          Charset: 'UTF-8',
        },
      },
    },
    // Optional: use a configuration set for tracking opens/clicks
    // ConfigurationSetName: process.env.SES_CONFIG_SET,
  });

  const response = await sesClient.send(command);
  console.log(`✉️  Email sent to ${to} — MessageId: ${response.MessageId}`);
  return response;
}

module.exports = { sendEmail };
