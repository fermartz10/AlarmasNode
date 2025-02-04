const axios = require('axios');
const { guardarAlarma, actualizarAlarma, obtenerUltimoDatoSensor, obtenerUsuarioActivo } = require('./dbOperations');
const { enviarCorreo } = require('./correo');

const contadoresAlarmas = {};
const ultimosValoresAlarma = {};
let ultimaHora = null;
const sensorInactividadLimite = (1 * 60 + 30) * 1000; // 1.30 minutos en milisegundos
const sensoresUltimaActividad = {};

// Función para gestionar las alarmas de forma interna pero sin mostrarlas
function gestionarAlarmaInterna(titulo, mensaje, tipo) {
    // Aquí iría la lógica de guardar, actualizar o manejar la alarma,
    // pero no se mostrará en consola ni se enviará una notificación
    console.log(`[INTERNAL] ${tipo} - ${titulo}: ${mensaje}`);
}

function detectarYCerrarAlarmasSensoresInactivos() {
    const ahora = Date.now();
    Object.keys(sensoresUltimaActividad).forEach(ID_Sensor => {
        const tiempoInactivo = ahora - sensoresUltimaActividad[ID_Sensor];
        if (tiempoInactivo > sensorInactividadLimite) {
            cerrarAlarmasExistentes(ID_Sensor);
            delete sensoresUltimaActividad[ID_Sensor];
        }
    });
}

function cerrarAlarmasExistentes(ID_Sensor) {
    const tiposAlarma = ['Maximo', 'Minimo', 'PreAlarmaSuperior', 'PreAlarmaInferior'];
    tiposAlarma.forEach(tipo => {
        if (contadoresAlarmas[ID_Sensor]?.[`ultimoValor${tipo}`] !== null) {
            const ultimoValor = contadoresAlarmas[ID_Sensor][`ultimoValor${tipo}`];
            actualizarAlarma(
                ID_Sensor,
                ultimoValor.Fecha_Inicio,
                ultimoValor.Hora_Inicio,
                ultimoValor.Valor_Inicial,
                contadoresAlarmas[ID_Sensor][tipo],
                tipo
            ).then(() => {
                gestionarAlarmaInterna(`Alarma de tipo ${tipo} cerrada para el sensor ${ID_Sensor}`, "", 'info');
            }).catch(err => {
                console.error(`Error al actualizar la alarma para el sensor ${ID_Sensor}:`, err);
                // Reintentar después de un tiempo si el servidor no está disponible
                setTimeout(() => cerrarAlarmasExistentes(ID_Sensor), 10000); // Espera 10 segundos antes de reintentar
            });
            contadoresAlarmas[ID_Sensor][tipo] = 0;
            contadoresAlarmas[ID_Sensor][`ultimoValor${tipo}`] = null;
        }
    });

    gestionarAlarmaInterna('Sensor Inactivo', `El sensor ${ID_Sensor} ha dejado de enviar datos. Todas las alarmas activas han sido cerradas.`, 'info');
}

function inicializarContadores(ID_Sensor) {
    contadoresAlarmas[ID_Sensor] = {
        Minimo: 0, Maximo: 0, PreAlarmaSuperior: 0, PreAlarmaInferior: 0,
        ultimoValorMinimo: null, ultimoValorMaximo: null,
        ultimoValorPreAlarmaSuperior: null, ultimoValorPreAlarmaInferior: null,
        ultimosValores: []
    };
    ultimosValoresAlarma[ID_Sensor] = {
        Minimo: null, Maximo: null, PreAlarmaSuperior: null,
        PreAlarmaInferior: null
    };
}


function checkAndUpdateAlarm(condition, ID_Sensor, Nombre, Valor_Inicial, Fecha_Inicio, Hora_Inicio, alarmType, message, code, alertType, ID_SubArea) {
    if (condition) {
        contadoresAlarmas[ID_Sensor][alarmType]++;
        const mensajeDetallado = `${message}`;

        const limite = alarmType === 'Maximo' ? 'Máximo'
            : alarmType === 'Minimo' ? 'Mínimo'
                : alarmType === 'PreAlarmaSuperior' ? 'PreAlarmaSuperior'
                    : 'PreAlarmaInferior';

        if (contadoresAlarmas[ID_Sensor][alarmType] === 1) {
            guardarAlarma({
                ID_Sensor,
                Fecha_Inicio,
                Hora_Inicio,
                Valor_Inicial,
                Limite: limite,
                Detalles: mensajeDetallado,
                Status: 'Pendiente',
                Codigo_Alarma: code,
                Contador: contadoresAlarmas[ID_Sensor][alarmType],
                ID_SubArea
            }).then(() => {
                gestionarAlarmaInterna(`Alarma de tipo ${alarmType} guardada correctamente para el sensor ${ID_Sensor}`, "", 'success');

                // Solo envía correos para máximos o mínimos
                // if (alarmType === 'Maximo' || alarmType === 'Minimo') {
                //     enviarCorreo(`Alarma de ${limite} activada para el sensor ${Nombre}`, mensajeDetallado);
                // }
            }).catch(err => {
                console.error(`Error al guardar la alarma para el sensor ${ID_Sensor}:`, err);
            });
        }

        contadoresAlarmas[ID_Sensor][`ultimoValor${alarmType}`] = { Valor_Inicial, Fecha_Inicio, Hora_Inicio, message };
    } else if (contadoresAlarmas[ID_Sensor][`ultimoValor${alarmType}`] !== null) {
        const ultimoValor = contadoresAlarmas[ID_Sensor][`ultimoValor${alarmType}`];
        const { Fecha_Inicio: ultimaFechaInicio, Hora_Inicio: ultimaHoraInicio, Valor_Inicial: ultimoValorInicial, message: ultimoMensaje } = ultimoValor;

        actualizarAlarma(
            ID_Sensor,
            ultimaFechaInicio,
            ultimaHoraInicio,
            ultimoValorInicial,
            contadoresAlarmas[ID_Sensor][alarmType],
            alarmType
        ).then(() => {
            gestionarAlarmaInterna(`Alarma de tipo ${alarmType} cerrada correctamente para el sensor ${ID_Sensor}`, ultimoMensaje, 'info');
        });

        contadoresAlarmas[ID_Sensor][alarmType] = 0;
        contadoresAlarmas[ID_Sensor][`ultimoValor${alarmType}`] = null;
    }
}


// function procesarUltimoDatoSensor(datos) {
//     const sensoresActivos = new Set(datos.map(d => d.ID_Sensor));

//     datos.forEach(row => {
//         const { ID_Sensor, Nombre, Valor, Minimo, Maximo, Fecha, Hora, ID_SubArea } = row;
//         const Valor_Inicial = parseFloat(Valor);
//         const MinimoFloat = parseFloat(Minimo);
//         const MaximoFloat = parseFloat(Maximo);

//         const PreAlarmaSuperior = parseFloat((MinimoFloat + (MaximoFloat - MinimoFloat) * 0.80).toFixed(2));
//         const PreAlarmaInferior = parseFloat((MinimoFloat + (MaximoFloat - MinimoFloat) * 0.20).toFixed(2));

//         if (!contadoresAlarmas[ID_Sensor]) {
//             inicializarContadores(ID_Sensor);
//         }

//         sensoresUltimaActividad[ID_Sensor] = Date.now();
//         contadoresAlarmas[ID_Sensor].ultimosValores.push({ Valor_Inicial, Fecha, Hora });
//         if (contadoresAlarmas[ID_Sensor].ultimosValores.length > 5) {
//             contadoresAlarmas[ID_Sensor].ultimosValores.shift();
//         }

//         checkAndUpdateAlarm(Valor_Inicial >= MaximoFloat, ID_Sensor, Nombre, Valor_Inicial, Fecha, Hora, 'Maximo', `El valor del sensor "${Nombre}" (ID: ${ID_Sensor}) es ${Valor_Inicial}, que es mayor o igual al máximo permitido ${MaximoFloat}`, 1, 'error', ID_SubArea);
//         checkAndUpdateAlarm(Valor_Inicial <= MinimoFloat, ID_Sensor, Nombre, Valor_Inicial, Fecha, Hora, 'Minimo', `El valor del sensor "${Nombre}" (ID: ${ID_Sensor}) es ${Valor_Inicial}, que es menor o igual al mínimo permitido ${MinimoFloat}`, 6, 'error', ID_SubArea);
//         checkAndUpdateAlarm(Valor_Inicial >= PreAlarmaSuperior && Valor_Inicial < MaximoFloat, ID_Sensor, Nombre, Valor_Inicial, Fecha, Hora, 'PreAlarmaSuperior', `El valor del sensor "${Nombre}" (ID: ${ID_Sensor}) es ${Valor_Inicial}, que excede el pre-límite superior ${PreAlarmaSuperior}`, 2, 'warning', ID_SubArea);
//         checkAndUpdateAlarm(Valor_Inicial <= PreAlarmaInferior && Valor_Inicial > MinimoFloat, ID_Sensor, Nombre, Valor_Inicial, Fecha, Hora, 'PreAlarmaInferior', `El valor del sensor "${Nombre}" (ID: ${ID_Sensor}) es ${Valor_Inicial}, que está por debajo del pre-límite inferior ${PreAlarmaInferior}`, 5, 'warning', ID_SubArea);
//     });

//     detectarYCerrarAlarmasSensoresInactivos();
// }

// Lista para almacenar mensajes pendientes
let mensajesPendientes = [];
let temporizador = null;

function procesarUltimoDatoSensor(datos) {
    const sensoresActivos = new Set(datos.map(d => d.ID_Sensor));

    datos.forEach(row => {
        const { ID_Sensor, Nombre, Valor, Minimo, Maximo, Fecha, Hora, ID_SubArea } = row;
        const Valor_Inicial = parseFloat(Valor);
        const MinimoFloat = parseFloat(Minimo);
        const MaximoFloat = parseFloat(Maximo);

        const PreAlarmaSuperior = parseFloat((MinimoFloat + (MaximoFloat - MinimoFloat) * 0.80).toFixed(2));
        const PreAlarmaInferior = parseFloat((MinimoFloat + (MaximoFloat - MinimoFloat) * 0.20).toFixed(2));

        if (!contadoresAlarmas[ID_Sensor]) {
            inicializarContadores(ID_Sensor);
        }

        sensoresUltimaActividad[ID_Sensor] = Date.now();
        contadoresAlarmas[ID_Sensor].ultimosValores.push({ Valor_Inicial, Fecha, Hora });
        if (contadoresAlarmas[ID_Sensor].ultimosValores.length > 5) {
            contadoresAlarmas[ID_Sensor].ultimosValores.shift();
        }

        // Verificar si el valor es exactamente igual al máximo o al mínimo
        if (Valor_Inicial === MaximoFloat) {
            const mensaje = `El valor del sensor "${Nombre}" (ID: ${ID_Sensor}) es exactamente igual al máximo permitido ${MaximoFloat}. Fecha: ${Fecha} ${Hora}.`;
            agregarMensajeAPendientes(mensaje);
        }
        if (Valor_Inicial === MinimoFloat) {
            const mensaje = `El valor del sensor "${Nombre}" (ID: ${ID_Sensor}) es exactamente igual al mínimo permitido ${MinimoFloat}. Fecha: ${Fecha} ${Hora}.`;
            agregarMensajeAPendientes(mensaje);
        }

        checkAndUpdateAlarm(Valor_Inicial >= MaximoFloat, ID_Sensor, Nombre, Valor_Inicial, Fecha, Hora, 'Maximo', `El valor del sensor "${Nombre}" (ID: ${ID_Sensor}) es ${Valor_Inicial}, que es mayor o igual al máximo permitido ${MaximoFloat}`, 1, 'error', ID_SubArea);
        checkAndUpdateAlarm(Valor_Inicial <= MinimoFloat, ID_Sensor, Nombre, Valor_Inicial, Fecha, Hora, 'Minimo', `El valor del sensor "${Nombre}" (ID: ${ID_Sensor}) es ${Valor_Inicial}, que es menor o igual al mínimo permitido ${MinimoFloat}`, 6, 'error', ID_SubArea);
        checkAndUpdateAlarm(Valor_Inicial >= PreAlarmaSuperior && Valor_Inicial < MaximoFloat, ID_Sensor, Nombre, Valor_Inicial, Fecha, Hora, 'PreAlarmaSuperior', `El valor del sensor "${Nombre}" (ID: ${ID_Sensor}) es ${Valor_Inicial}, que excede el pre-límite superior ${PreAlarmaSuperior}`, 2, 'warning', ID_SubArea);
        checkAndUpdateAlarm(Valor_Inicial <= PreAlarmaInferior && Valor_Inicial > MinimoFloat, ID_Sensor, Nombre, Valor_Inicial, Fecha, Hora, 'PreAlarmaInferior', `El valor del sensor "${Nombre}" (ID: ${ID_Sensor}) es ${Valor_Inicial}, que está por debajo del pre-límite inferior ${PreAlarmaInferior}`, 5, 'warning', ID_SubArea);
    });

    detectarYCerrarAlarmasSensoresInactivos();
}

function agregarMensajeAPendientes(mensaje) {
    // Agregar el mensaje a la lista de pendientes
    mensajesPendientes.push(mensaje);

    // Si no hay un temporizador activo, iniciar uno
    if (!temporizador) {
        temporizador = setTimeout(() => {
            enviarCorreoAgrupado();
            temporizador = null; // Reiniciar el temporizador
        }, 15000); // 15 segundos
    }
}

async function enviarCorreoAgrupado() {
    if (mensajesPendientes.length === 0) return; // Si no hay mensajes, no hacer nada

    // Obtener los correos de los usuarios activos
    const correos = await obtenerUsuarioActivo();

    if (correos.length === 0) {
        console.log("No hay usuarios activos para enviar el correo.");
        return;
    }

    // Crear un título y un mensaje agrupado
    const titulo = `Alertas de Sensores (${mensajesPendientes.length} eventos)`;
    const mensajeAgrupado = mensajesPendientes.join('<br><br>'); // Unir mensajes con saltos de línea

    // Enviar el correo a los destinatarios obtenidos
    enviarCorreo(titulo, mensajeAgrupado, correos);

    // Vaciar la lista de mensajes pendientes
    mensajesPendientes = [];
}

function monitorSensores() {
    obtenerUltimoDatoSensor().then(datos => {
        if (datos && datos.length > 0) {
            const nuevoRegistro = datos[0];
            if (nuevoRegistro.Hora !== ultimaHora) {
                ultimaHora = nuevoRegistro.Hora;
                procesarUltimoDatoSensor(datos);
            } else {
                detectarYCerrarAlarmasSensoresInactivos();
            }
        } else {
            detectarYCerrarAlarmasSensoresInactivos();
        }
    }).catch(error => {
        console.error("Error en monitorSensores:", error);
        detectarYCerrarAlarmasSensoresInactivos();
    });
}

function iniciarMonitoreo() {
    monitorSensores();
    setInterval(monitorSensores, 1000); // Monitoreo cada segundo
}

// Iniciar monitoreo sin notificaciones visibles
iniciarMonitoreo();
