// alarmUtils.js
function alarmaSonora(tipo) {
    let audioFile;
    
    // Seleccionar el archivo de sonido según el tipo de alarma
    switch(tipo) {
        case 'error':
            audioFile = 'js/alarmas/error.mp3';
            break;
        case 'warning':
            audioFile = 'js/alarmas/warning.mp3';
            break;
        case 'info':
            audioFile = 'js/alarmas/info.mp3';
            break;
        default:
            audioFile = 'js/alarmas/error.mp3'; // Sonido por defecto
    }

    const audio = new Audio(audioFile);
    audio.play().catch(e => console.log("Error al reproducir el sonido:", e));
}

function mostrarNotificacion(titulo, mensaje, paginaRedireccion) {
    if (Notification.permission === 'granted') {
        const options = {
            body: mensaje,
            icon: 'js/alarmas/logo.png',
            tag: 'alarmaSensor'
        };
        
        const notification = new Notification(titulo, options);
        
        notification.onclick = function() {
            window.open('../views/gestionAlarmas', '_blank');
        };
    } else {
        console.log("Permiso para notificaciones no concedido.");
    }
}

function mostrarAlerta(titulo, mensaje, tipo) {
    // Generar un ID único para esta alerta
    const alertId = 'alert-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

    // Configurar las opciones de toastr para esta alerta específica
    const options = {
        "closeButton": true,
        "progressBar": true,
        "positionClass": "toast-top-left",
        "timeOut": "30000",  // 30000 milisegundos = 30 segundos
        "extendedTimeOut": "1000",  // 1000 milisegundos de tiempo extendido
        "onclick": function() {
            window.open('../views/gestionAlarmas', '_blank');
        }
    };

    // Usar HTML en el mensaje para mejorar el formato
    const mensajeFormateado = `
        <div id="${alertId}">
            <strong>${titulo}</strong><br>
            <span style="font-size: 14px;">${mensaje}</span><br>
            <span style="font-size: 12px; font-style: italic;">Haz clic para más detalles</span>
        </div>
    `;

    // Mostrar la alerta según el tipo
    switch(tipo) {
        case 'error':
            toastr.error(mensajeFormateado, '', options);
            break;
        case 'warning':
            toastr.warning(mensajeFormateado, '', options);
            break;
        case 'info':
            toastr.info(mensajeFormateado, '', options);
            break;
        default:
            toastr.error(mensajeFormateado, '', options);
    }

    // Llamar a la función de alarma sonora con el tipo de alerta
    alarmaSonora(tipo);
    mostrarNotificacion(titulo, mensaje);
}

// Exportar las funciones
export { alarmaSonora, mostrarNotificacion, mostrarAlerta };
