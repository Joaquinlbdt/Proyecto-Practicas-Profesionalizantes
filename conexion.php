<?php
$host = 'localhost';
$baseDatos = 'adopciones_miau';
$usuario = 'root';
$contrasena = '';

try {
    $conexion = new PDO(
        "mysql:host=$host;dbname=$baseDatos;charset=utf8mb4",
        $usuario,
        $contrasena,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );
} catch (PDOException $error) {
    error_log($error->getMessage());
    http_response_code(500);
    exit('No se pudo conectar con MySQL. Revisá XAMPP y conexion.php.');
}
