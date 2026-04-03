// write the email varification template here

export const emailVerificationTemplate = ({ name, verificationLink }) => {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Email Verification</h2>
      <p>Dear ${name},</p>
      <p>Thank you for registering with our service. Please click the link below to verify your email address:</p>
      <a href="${verificationLink}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
      <p>If you did not create this account, please ignore this email.</p>
      <p>Best regards,</p>
      <p>Your Company</p>
    </div>
  `;
};
