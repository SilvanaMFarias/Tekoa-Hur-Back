/**
 * swagger-autologin.js
 * Se sirve como archivo estático desde /public/
 * Se carga en el Swagger UI via la opción customJs de swagger-ui-express.
 *
 * Al cargar la página:
 * 1. Espera a que el Swagger UI termine de inicializarse (window.ui)
 * 2. Hace POST /api/auth/login con las credenciales del admin
 * 3. Inyecta el token JWT en el sistema de auth del Swagger UI
 * 4. Muestra un banner de confirmación que se cierra solo
 */
(function () {
  "use strict";

  // Credenciales del administrador para auto-login
  var ADMIN_DNI      = "00000001";
  var ADMIN_PASSWORD = "admin123";
  var MAX_INTENTOS   = 20; // máximo 10 segundos de espera (20 × 500ms)
  var intentos       = 0;

  function mostrarBanner(nombre, exito) {
    var banner = document.createElement("div");
    banner.id  = "tekoa-auth-banner";

    var bg     = exito ? "#1B5E20" : "#B71C1C";
    var texto  = exito
      ? "✅ Autenticado automáticamente como <strong>" + nombre + "</strong> · Token JWT configurado"
      : "⚠️ Auto-login falló. Autenticate manualmente con el botón <strong>Authorize</strong>";

    banner.style.cssText = [
      "position:fixed", "top:0", "left:0", "right:0", "z-index:99999",
      "background:" + bg, "color:white", "text-align:center",
      "padding:10px 20px", "font-family:sans-serif", "font-size:14px",
      "display:flex", "align-items:center", "justify-content:center", "gap:12px",
      "box-shadow:0 2px 8px rgba(0,0,0,0.3)"
    ].join(";");

    banner.innerHTML = "<span>" + texto + "</span>" +
      "<button onclick=\"document.getElementById('tekoa-auth-banner').remove()\" " +
      "style=\"background:rgba(255,255,255,0.25);border:none;color:white;" +
      "padding:4px 12px;border-radius:4px;cursor:pointer;font-size:13px\">✕</button>";

    document.body.insertBefore(banner, document.body.firstChild);

    // Auto-cerrar después de 5 segundos
    setTimeout(function () {
      var b = document.getElementById("tekoa-auth-banner");
      if (b) b.remove();
    }, 5000);
  }

  function intentarAutoLogin() {
    intentos++;

    // Esperar a que SwaggerUI esté listo
    if (typeof window.ui === "undefined" || typeof window.ui.authActions === "undefined") {
      if (intentos < MAX_INTENTOS) {
        setTimeout(intentarAutoLogin, 500);
      } else {
        console.warn("[Tekoá-Hur] SwaggerUI no se inicializó a tiempo. Auto-login cancelado.");
      }
      return;
    }

    // Hacer login con el admin
    fetch("/api/auth/login", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ dni: ADMIN_DNI, password: ADMIN_PASSWORD }),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data.token) {
          console.warn("[Tekoá-Hur] Login falló:", data.message);
          mostrarBanner("", false);
          return;
        }

        // Inyectar el token en SwaggerUI
        window.ui.authActions.authorize({
          bearerAuth: {
            name:   "bearerAuth",
            schema: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
            value:  data.token,
          },
        });

        mostrarBanner(data.usuario && data.usuario.nombre ? data.usuario.nombre : "Administrador", true);
        console.info("[Tekoá-Hur] Auto-login exitoso. Usuario:", data.usuario && data.usuario.nombre);
      })
      .catch(function (err) {
        console.warn("[Tekoá-Hur] Error en auto-login:", err.message);
        mostrarBanner("", false);
      });
  }

  // Iniciar el proceso cuando el DOM esté listo
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(intentarAutoLogin, 800);
    });
  } else {
    setTimeout(intentarAutoLogin, 800);
  }
})();
