import nodemailer from "nodemailer"
import config from '../config/env.js';


const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: false, // true for 465, false for other ports
  auth: {
    user: config.email.user,
    pass: config.email.password,
  },
});

export const sendMail = async ({ to, subject, body }) => {
  try {
    const info = await transporter.sendMail({
      from: config.email.from,
      to: config.env === 'development' ? config.email.test_mail : to,
      subject: subject,
      html: body,
    });

    console.log("Message sent:", info.messageId, to);
  } catch (error) {
    console.log("Error in sending mail", error.message);
  }
};