import { alarmaSonora, mostrarNotificacion, mostrarAlerta } from './alarmUtils.js';
import { guardarAlarma, actualizarAlarma, obtenerUltimoDatoSensor } from './dbOperations.js';

$(document).ready(function () {
    const contadoresAlarmas = {};
    const ultimosValoresAlarma = {};
    let ultimaHora = null;
    const sensorInactividadLimite = (1 * 60 + 30) * 1000; // 1.30 minutos en milisegundos
    const sensoresUltimaActividad = {};

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
                );
                contadoresAlarmas[ID_Sensor][tipo] = 0;
                contadoresAlarmas[ID_Sensor][`ultimoValor${tipo}`] = null;
            }
        });

        mostrarAlerta('Sensor Inactivo', `El sensor ${ID_Sensor} ha dejado de enviar datos. Todas las alarmas activas han sido cerradas.`, 'info');
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
            mostrarAlerta(`Alerta de ${alarmType}`, mensajeDetallado, alertType);
            if (contadoresAlarmas[ID_Sensor][alarmType] === 1) {
                // Solo mostrar alerta cuando la alarma se activa por primera vez
                guardarAlarma(ID_Sensor, Fecha_Inicio, Hora_Inicio, Valor_Inicial, alarmType, message, 'Pendiente', code, contadoresAlarmas[ID_Sensor][alarmType], ID_SubArea);
            }
            contadoresAlarmas[ID_Sensor][`ultimoValor${alarmType}`] = { Valor_Inicial, Fecha_Inicio, Hora_Inicio, message };
        } else if (contadoresAlarmas[ID_Sensor][`ultimoValor${alarmType}`] !== null) {
            // Captura los datos antes de la actualización
            const ultimoValor = contadoresAlarmas[ID_Sensor][`ultimoValor${alarmType}`];
            const { Fecha_Inicio: ultimaFechaInicio, Hora_Inicio: ultimaHoraInicio, Valor_Inicial: ultimoValorInicial, message: ultimoMensaje } = ultimoValor;

            actualizarAlarma(
                ID_Sensor,
                ultimaFechaInicio,
                ultimaHoraInicio,
                ultimoValorInicial,
                contadoresAlarmas[ID_Sensor][alarmType],
                alarmType
            );

            // Mostrar alerta cuando la alarma se desactiva
            const mensajeDetallado = `${ultimoMensaje}`;
            mostrarAlerta(`Alerta de ${alarmType}`, mensajeDetallado, alertType);

            contadoresAlarmas[ID_Sensor][alarmType] = 0;
            contadoresAlarmas[ID_Sensor][`ultimoValor${alarmType}`] = null;
        }
    }

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

            checkAndUpdateAlarm(Valor_Inicial >= MaximoFloat, ID_Sensor, Nombre, Valor_Inicial, Fecha, Hora, 'Maximo', `El valor del sensor "${Nombre}" (ID: ${ID_Sensor}) es ${Valor_Inicial}, que es mayor o igual al máximo permitido ${MaximoFloat}`, 1, 'error', ID_SubArea);
            checkAndUpdateAlarm(Valor_Inicial <= MinimoFloat, ID_Sensor, Nombre, Valor_Inicial, Fecha, Hora, 'Minimo', `El valor del sensor "${Nombre}" (ID: ${ID_Sensor}) es ${Valor_Inicial}, que es menor o igual al mínimo permitido ${MinimoFloat}`, 6, 'error', ID_SubArea);
            checkAndUpdateAlarm(Valor_Inicial >= PreAlarmaSuperior && Valor_Inicial < MaximoFloat, ID_Sensor, Nombre, Valor_Inicial, Fecha, Hora, 'PreAlarmaSuperior', `El valor del sensor "${Nombre}" (ID: ${ID_Sensor}) es ${Valor_Inicial}, que excede el pre-límite superior ${PreAlarmaSuperior}`, 2, 'warning', ID_SubArea);
            checkAndUpdateAlarm(Valor_Inicial <= PreAlarmaInferior && Valor_Inicial > MinimoFloat, ID_Sensor, Nombre, Valor_Inicial, Fecha, Hora, 'PreAlarmaInferior', `El valor del sensor "${Nombre}" (ID: ${ID_Sensor}) es ${Valor_Inicial}, que está por debajo del pre-límite inferior ${PreAlarmaInferior}`, 5, 'warning', ID_SubArea);
        });

        detectarYCerrarAlarmasSensoresInactivos();
    }





    function monitorSensores() {
        obtenerUltimoDatoSensor(function (datos) {
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
        });
    }

    function iniciarMonitoreo() {
        monitorSensores();
        setInterval(monitorSensores, 1000); // Monitoreo cada segundo
    }

    // Gestión de permisos de notificaciones
    if (Notification.permission === 'granted') {
        iniciarMonitoreo();
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                iniciarMonitoreo();
            } else {
                console.warn('No se otorgó permiso para notificaciones. El monitoreo se iniciará sin notificaciones.');
                iniciarMonitoreo();
            }
        });
    } else {
        console.warn('Las notificaciones están bloqueadas. El monitoreo se iniciará sin notificaciones.');
        iniciarMonitoreo();
    }
});