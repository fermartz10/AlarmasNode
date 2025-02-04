// dbOperations.js
function guardarAlarma(ID_Sensor, Fecha_Inicio, Hora_Inicio, Valor_Inicial, Limite, Detalles, Status, Codigo_Alarma, Contador, ID_SubArea) {
    $.ajax({
        url: 'js/alarmas/guardar_alarma.php',
        method: 'POST',
        data: { ID_Sensor, Fecha_Inicio, Hora_Inicio, Valor_Inicial, Limite, Detalles, Status, Codigo_Alarma, Contador, ID_SubArea},
        //success: data => console.log("Alarma guardada:", data),
        //error: (jqXHR, textStatus, errorThrown) => console.error("Error al guardar la alarma:", textStatus, errorThrown)
    });
}

function actualizarAlarma(ID_Sensor, Fecha_Inicio, Hora_Inicio, Valor_Inicial, Contador, Tipo_Limite) {
    $.ajax({
        url: 'js/alarmas/actualizar_alarma.php',
        method: 'POST',
        data: { ID_Sensor, Fecha_Inicio, Hora_Inicio, Valor_Inicial, Contador, Tipo_Limite },
        //success: data => console.log("Alarma actualizada:", data),
        //error: (jqXHR, textStatus, errorThrown) => console.error("Error al actualizar la alarma:", textStatus, errorThrown)
    });
}

function obtenerUltimoDatoSensor(callback) {
    $.ajax({
        url: 'js/alarmas/get_latest_data.php',
        method: 'GET',
        dataType: 'json',
        success: data => {
            //console.log("Último dato de sensor obtenido:", data);
            callback(data);
        },
        error: (jqXHR, textStatus, errorThrown) => console.error("Error al obtener el último dato del sensor:", textStatus, errorThrown)
    });
}

// Exportar las funciones
export { guardarAlarma, actualizarAlarma, obtenerUltimoDatoSensor };