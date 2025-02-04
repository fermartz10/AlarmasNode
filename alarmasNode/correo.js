const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.titan.email',
  port: 465,
  secure: true,
  auth: {
    user: 'servicio@automatizacionds.com.mx',
    pass: 'servicio.automatizacion.01'
  }
});

async function enviarCorreo(titulo, mensaje, destinatarios) {
    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
          <div style="background-color: #007BFF; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">${titulo}</h1>
          </div>
          <div style="padding: 20px;">
            <p style="font-size: 16px; line-height: 1.6;">${mensaje}</p>
            <p style="font-size: 14px; color: #777; margin-top: 20px;">
              Este es un mensaje automático, por favor no responder directamente a este correo.
            </p>
          </div>
          <div style="background-color: #f8f9fa; color: #777; text-align: center; padding: 10px; font-size: 12px;">
            <p style="margin: 0;">Sistema de Alertas - Automatización DS</p>
            <p style="margin: 0;">© ${new Date().getFullYear()} Todos los derechos reservados.</p>
          </div>
        </div>
      `;
  
      await transporter.sendMail({
        from: '"Alerta Sistema" <servicio@automatizacionds.com.mx>',
        to: destinatarios, // Pasar la lista de correos directamente como un array
        subject: titulo,
        text: mensaje, // Versión de texto plano por si el cliente no soporta HTML
        html: htmlContent, // Versión HTML con formato mejorado
        replyTo: 'no-reply@automatizacionds.com.mx'
      });
      console.log('Correo enviado correctamente');
    } catch (error) {
      console.error('Error al enviar correo:', error);
    }
  }

module.exports = { enviarCorreo };