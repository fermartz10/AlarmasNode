<?php
// get_latest_data
// Incluir el archivo de conexión
include '../../../conexion.php';

// Consulta SQL optimizada para obtener el último registro de cada sensor en SQL Server
$sql = "WITH RankedSensorData AS (
    SELECT 
        ds.ID_Dato, ds.ID_Sensor, ds.Fecha, ds.Hora, 
        ds.Valor, s.Nombre, s.Minimo, s.Maximo, s.Alarma, 
        s.Modificacion, s.Fecha_modificacion,
        sas.ID_SubArea,
        ROW_NUMBER() OVER (PARTITION BY ds.ID_Sensor ORDER BY ds.Fecha DESC, ds.Hora DESC) AS RowNum
    FROM DatosDeSensores ds
    INNER JOIN Sensores s ON ds.ID_Sensor = s.ID_Sensor
    INNER JOIN Sensores_Areas_SubAreas sas ON s.ID_Sensor = sas.ID_Sensor
    WHERE s.Alarma = 1
        AND s.Tipo NOT IN ('bool', 'desconocido')
        AND s.Minimo IS NOT NULL 
        AND s.Maximo IS NOT NULL
        -- Aseguramos que el máximo siempre sea mayor que el mínimo
        AND s.Maximo > s.Minimo
        AND s.Modificacion IS NOT NULL 
        AND s.Fecha_modificacion IS NOT NULL
        AND DATEDIFF(MINUTE, TRY_CONVERT(DATETIME, CONCAT(ds.Fecha, ' ', ds.Hora)), GETDATE()) <= 1
)
SELECT 
    ID_Dato, ID_Sensor, Fecha, Hora, Valor, Nombre, Minimo, 
    Maximo, Alarma, Modificacion, Fecha_modificacion, ID_SubArea
FROM RankedSensorData
WHERE RowNum = 1
ORDER BY ID_Sensor;";

try {
    // Preparar la consulta
    $stmt = $conn->prepare($sql);

    // Ejecutar la consulta
    $stmt->execute();

    // Obtener todos los resultados como un array asociativo
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Devolver los datos como JSON
    echo json_encode($data);
} catch (PDOException $e) {
    // Manejar errores de PDO
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
