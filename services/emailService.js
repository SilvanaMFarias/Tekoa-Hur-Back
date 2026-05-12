/**
 * Servicio de emails
 * implementar nodemailer
 */

const sendRecoveryEmail = async (
  email,
  token
) => {

  const resetLink =
    `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  console.log("=================================");
  console.log("EMAIL RECUPERACIÓN");
  console.log("DESTINO:", email);
  console.log("LINK:", resetLink);
  console.log("=================================");

  return true;
};

module.exports = {
  sendRecoveryEmail,
};