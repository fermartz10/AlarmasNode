<?php
include '../../../conexion.php';

$sql = "SELECT 
            Correo 
        FROM UsuariosD
        WHERE NivelUsuario = 2 AND Estado = 1
        ORDER BY Fecha_actualizacion DESC, Hora_actualizacion DESC";

try {
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($data);
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
