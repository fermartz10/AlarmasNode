const axios = require('axios');

async function guardarAlarma({ ID_Sensor, Fecha_Inicio, Hora_Inicio, Valor_Inicial, Limite, Detalles, Status, Codigo_Alarma, Contador, ID_SubArea }) {
    if (!ID_Sensor) {
        throw new Error("ID_Sensor es requerido y no puede ser null o undefined");
    }

    try {
        const response = await axios.post('http://localhost/monitoreo/views/js/alarmas/guardar_alarma.php', {
            ID_Sensor,
            Fecha_Inicio,
            Hora_Inicio,
            Valor_Inicial,
            Limite,
            Detalles,
            Status,
            Codigo_Alarma,
            Contador,
            ID_SubArea
        });
        console.log("Alarma guardada:", response.data);
        return response.data;
    } catch (error) {
        console.error("Error al guardar la alarma:", error.response ? error.response.data : error.message);
        throw error;
    }
}


async function actualizarAlarma(ID_Sensor, Fecha_Inicio, Hora_Inicio, Valor_Inicial, Contador, alarmType) {
    try {
        const formData = new FormData();
        formData.append('ID_Sensor', ID_Sensor);
        formData.append('Fecha_Inicio', Fecha_Inicio);
        formData.append('Hora_Inicio', Hora_Inicio);
        formData.append('Valor_Inicial', Valor_Inicial);
        formData.append('Contador', Contador);
        
        //Determinar el tipo de límite basado en alarmType
        let tipoLimite = 
            alarmType === 'Maximo' ? 'Máximo' :
            alarmType === 'Minimo' ? 'Mínimo' :
            alarmType === 'PreAlarmaSuperior' ? 'PreAlarmaSuperior' :
            'PreAlarmaInferior';
        formData.append('TipoLimite', tipoLimite);

        const response = await axios.post('http://localhost/monitoreo/views/js/alarmas/actualizar_alarma.php', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        console.log("Datos enviados:", Object.fromEntries(formData));
        console.log("Respuesta del servidor:", response.data);
        return response.data;
    } catch (error) {
        console.error("Error al actualizar la alarma:", error);
        throw error;
    }
}

async function obtenerUltimoDatoSensor() {
    try {
        const response = await axios.get('http://localhost/monitoreo/views/js/alarmas/get_latest_data.php');
        console.log("Último dato de sensor obtenido:", response.data);
        return response.data;
    } catch (error) {
        console.error("Error al obtener el último dato del sensor:", error);
    }
}

async function obtenerUsuarioActivo() { 
    try {
      const response = await axios.get('http://localhost/monitoreo/views/js/alarmas/get_active_user.php');
      const usuariosActivos = Array.isArray(response.data) ? response.data : [];
      
      // Extrae solo los correos
      const correos = usuariosActivos.map(usuario => usuario.Correo).filter(Boolean);
      console.log("Correos activos obtenidos:", correos);
      
      return correos;
    } catch (error) {
      console.error("Error al obtener el usuario activo:", error);
      return [];
    }
  }
  

module.exports = { guardarAlarma, actualizarAlarma, obtenerUltimoDatoSensor, obtenerUsuarioActivo };
