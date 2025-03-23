import nodemailer from 'nodemailer';

import { MailOptions } from '../types/types';

export const sendEmail = async (options: MailOptions) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GOOGLE_APP_EMAILID,
      pass: process.env.GOOGLE_APP_PASSWORD,
    },
  });

  const mailOptions = {
    from: 'TradeBlitz <hello@tradeblitz.com>',
    to: options.to,
    subject: options.subject,
    html: options.emailBody,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('Error sending email:', err);
  }
};
