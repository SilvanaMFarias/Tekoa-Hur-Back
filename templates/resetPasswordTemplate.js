const resetPasswordTemplate = (resetLink, nombre = "Usuario") => {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Recuperación de contraseña</h2>

      <p>Hola ${nombre},</p>

      <p>
        Recibimos una solicitud para restablecer tu contraseña.
      </p>

      <a
        href="${resetLink}"
        style="
          display: inline-block;
          background: #4F46E5;
          color: white;
          padding: 12px 20px;
          text-decoration: none;
          border-radius: 8px;
          margin-top: 10px;
        "
      >
        Restablecer contraseña
      </a>

      <p style="margin-top: 20px;">
        Si no solicitaste este cambio, puedes ignorar este email.
      </p>

      <p>
        El enlace expirará en 1 hora.
      </p>
    </div>
  `;
};

module.exports = resetPasswordTemplate;