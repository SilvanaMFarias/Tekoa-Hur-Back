const transporter = require("../config/mailer");

const sendRecoveryEmail = async (
  email,
  resetLink,
  html
) => {

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject:
      "Recuperación de contraseña - Tekoa",
    html,
  });

  return true;
};

module.exports = {
  sendRecoveryEmail,
};