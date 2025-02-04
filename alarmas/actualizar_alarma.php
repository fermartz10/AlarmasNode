<?php
// Incluir el archivo de conexión
include '../../../conexion.php';

// Obtener los datos enviados por la petición POST
$ID_Sensor = $_POST['ID_Sensor'];
$Valor_Inicial = $_POST['Valor_Inicial'];
$Contador = $_POST['Contador'];
$Tipo_Limite = isset($_POST['Tipo_Limite']) ? $_POST['Tipo_Limite'] : null;

// Consulta SQL para obtener el último registro con los campos vacíos y Contador igual a 1 para el ID_Sensor dado
$sqlVerificar = "SELECT TOP 1 Fecha_Final, Hora_Final, Valor_Final, Contador
                 FROM Alarmas
                 WHERE ID_Sensor = :ID_Sensor AND (Fecha_Final IS NULL AND Hora_Final IS NULL AND Valor_Final IS NULL) AND Contador = 1";

if ($Tipo_Limite !== null) {
    $sqlVerificar .= " AND Limite = :Tipo_Limite";
}

$sqlVerificar .= " ORDER BY ID_Alarma DESC";

try {
    // Preparar la consulta de verificación
    $stmtVerificar = $conn->prepare($sqlVerificar);

    // Asignar los valores de los parámetros
    $stmtVerificar->bindParam(':ID_Sensor', $ID_Sensor);
    if ($Tipo_Limite !== null) {
        $stmtVerificar->bindParam(':Tipo_Limite', $Tipo_Limite);
    }

    // Ejecutar la consulta de verificación
    $stmtVerificar->execute();

    // Obtener el resultado de la consulta de verificación
    $resultado = $stmtVerificar->fetch(PDO::FETCH_ASSOC);

    // Verificar si se encontró un registro
    if ($resultado) {
        // Consulta SQL para actualizar los datos en la tabla Alarmas
        $sql = "UPDATE Alarmas
                SET Fecha_Final = CURRENT_TIMESTAMP, Hora_Final = CURRENT_TIMESTAMP, Valor_Final = :Valor_Inicial, Contador = 0
                WHERE ID_Alarma = (
                    SELECT TOP 1 ID_Alarma
                    FROM Alarmas
                    WHERE ID_Sensor = :ID_Sensor AND (Fecha_Final IS NULL AND Hora_Final IS NULL AND Valor_Final IS NULL) AND Contador = 1";

        if ($Tipo_Limite !== null) {
            $sql .= " AND Limite = :Tipo_Limite";
        }

        $sql .= " ORDER BY ID_Alarma DESC
                )";

        try {
            // Preparar la consulta de actualización
            $stmt = $conn->prepare($sql);

            // Asignar los valores a los parámetros de la consulta
            $stmt->bindParam(':ID_Sensor', $ID_Sensor);
            $stmt->bindParam(':Valor_Inicial', $Valor_Inicial);
            if ($Tipo_Limite !== null) {
                $stmt->bindParam(':Tipo_Limite', $Tipo_Limite);
            }

            // Ejecutar la consulta de actualización
            $stmt->execute();

            // Devolver una respuesta exitosa
            echo json_encode(['status' => 'success', 'message' => 'Alarma actualizada correctamente con contador en cero']);
        } catch (PDOException $e) {
            // Manejar errores de PDO
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    } else {
        // Devolver una respuesta indicando que no se encontró un registro que cumpliera las condiciones
        echo json_encode(['status' => 'error', 'message' => 'No se encontró un registro que cumpliera las condiciones']);
    }
} catch (PDOException $e) {
    // Manejar errores de PDO
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
