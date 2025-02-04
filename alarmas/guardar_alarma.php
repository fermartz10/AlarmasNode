<?php
// Incluir el archivo de conexión
include '../../../conexion.php';

// Obtener los datos enviados por la petición POST
$ID_Sensor = $_POST['ID_Sensor'];
$Fecha_Inicio = $_POST['Fecha_Inicio'];
$Hora_Inicio = $_POST['Hora_Inicio'];
$Valor_Inicial = $_POST['Valor_Inicial'];
$Limite = $_POST['Limite'];
$Detalles = $_POST['Detalles'];
$Status = $_POST['Status'];
$Contador = $_POST['Contador'];
$Codigo_Alarma = $_POST['Codigo_Alarma'];
$ID_SubArea = isset($_POST['ID_SubArea']) ? $_POST['ID_SubArea'] : null; // Obtener ID_SubArea, puede ser nulo

try {
    $conn->beginTransaction(); // Iniciar transacción

    // Consulta SQL para verificar si ya existe un registro con los mismos valores utilizando bloqueos
    $checkSql = "SELECT TOP 1 ID_Alarma, Fecha_Final, Hora_Final, Valor_Final, Limite 
                 FROM Alarmas WITH (UPDLOCK, HOLDLOCK)
                 WHERE ID_Sensor = :ID_Sensor 
                 ORDER BY ID_Alarma DESC";
    $checkStmt = $conn->prepare($checkSql);
    $checkStmt->bindParam(':ID_Sensor', $ID_Sensor);
    $checkStmt->execute();
    $existingAlarm = $checkStmt->fetch(PDO::FETCH_ASSOC);

    $insertAlarm = true;
    $message = '';

    if (!$existingAlarm) {
        // Caso 1: No hay alarmas para este sensor, guardar una nueva
        $insertAlarm = true;
    } elseif ($existingAlarm['Fecha_Final'] && $existingAlarm['Hora_Final'] && $existingAlarm['Valor_Final']) {
        // Caso 4: Hay una alarma cerrada del mismo tipo para ese sensor, se guarda la nueva alarma
        $insertAlarm = true;
    } elseif ($existingAlarm['Limite'] == $Limite) {
        if ($existingAlarm['Fecha_Final'] === null || $existingAlarm['Hora_Final'] === null || $existingAlarm['Valor_Final'] === null) {
            // Caso 3: La alarma es del mismo tipo y tiene campos nulos, no se guarda la nueva alarma
            $insertAlarm = false;
            $message = 'Ya existe una alarma abierta del mismo tipo para este sensor';
        } else {
            // La alarma es del mismo tipo pero está cerrada, se puede insertar una nueva
            $insertAlarm = true;
        }
    } elseif (
        $existingAlarm['Fecha_Inicio'] == $Fecha_Inicio &&
        $existingAlarm['Hora_Inicio'] == $Hora_Inicio &&
        $existingAlarm['Valor_Inicial'] == $Valor_Inicial
    ) {
        // Caso 2: La nueva alarma es igual a la anterior, no se guarda
        $insertAlarm = false;
        $message = 'Ya existe una alarma con los mismos valores para este sensor';
    } else {
        // Cualquier otro caso, se inserta la nueva alarma
        $insertAlarm = true;
    }

    if ($insertAlarm) {
        $sql = "INSERT INTO Alarmas (ID_Sensor, Fecha_Inicio, Hora_Inicio, Valor_Inicial, Limite, Detalles, Status, Codigo_Alarma, Contador, SubArea)
                VALUES (:ID_Sensor, :Fecha_Inicio, :Hora_Inicio, :Valor_Inicial, :Limite, :Detalles, :Status, :Codigo_Alarma, :Contador, :ID_SubArea)";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':ID_Sensor', $ID_Sensor);
        $stmt->bindParam(':Fecha_Inicio', $Fecha_Inicio);
        $stmt->bindParam(':Hora_Inicio', $Hora_Inicio);
        $stmt->bindParam(':Valor_Inicial', $Valor_Inicial);
        $stmt->bindParam(':Limite', $Limite);
        $stmt->bindParam(':Detalles', $Detalles);
        $stmt->bindParam(':Status', $Status);
        $stmt->bindParam(':Codigo_Alarma', $Codigo_Alarma);
        $stmt->bindParam(':Contador', $Contador);
        $stmt->bindParam(':ID_SubArea', $ID_SubArea); // Agregar ID_SubArea como SubArea
        $stmt->execute();

        $conn->commit(); // Confirmar transacción
        echo json_encode(['status' => 'success', 'message' => 'Alarma guardada correctamente']);
    } else {
        $conn->rollBack(); // Deshacer transacción
        echo json_encode(['status' => 'warning', 'message' => $message]);
    }
} catch (PDOException $e) {
    $conn->rollBack(); // Deshacer transacción en caso de error
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
