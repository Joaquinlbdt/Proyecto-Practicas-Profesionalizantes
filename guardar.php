<?php
require __DIR__ . '/conexion.php';
session_start();
header('Content-Type: application/json; charset=utf-8');

function responder($datos, $codigo = 200)
{
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

function datosEntrada()
{
    $datos = json_decode(file_get_contents('php://input'), true);
    if (!is_array($datos)) {
        responder(['error' => 'Los datos enviados no son válidos.'], 400);
    }
    return $datos;
}

function usuarioSesion($conexion)
{
    if (empty($_SESSION['usuario_id'])) {
        return null;
    }
    $consulta = $conexion->prepare('SELECT id, nombre, correo, telefono FROM usuarios WHERE id = ?');
    $consulta->execute([$_SESSION['usuario_id']]);
    $usuario = $consulta->fetch();
    return $usuario ? [
        'id' => (int) $usuario['id'],
        'username' => $usuario['nombre'],
        'email' => $usuario['correo'],
        'telefono' => $usuario['telefono']
    ] : null;
}

function requiereSesion($conexion)
{
    $usuario = usuarioSesion($conexion);
    if (!$usuario) {
        responder(['error' => 'Iniciá sesión para continuar.'], 401);
    }
    return $usuario;
}

function campo($datos, $nombre, $maximo)
{
    $valor = trim(isset($datos[$nombre]) ? (string) $datos[$nombre] : '');
    if ($valor === '' || strlen($valor) > $maximo) {
        responder(['error' => "Revisá el campo $nombre."], 422);
    }
    return $valor;
}

function mascotaJSON($fila)
{
    return [
        'id' => (int) $fila['id'],
        'nombre' => $fila['nombre'],
        'especie' => $fila['especie'],
        'edadysexo' => $fila['edad'] . ' - ' . $fila['sexo'],
        'tamano' => $fila['tamano'],
        'descripcion' => $fila['descripcion'],
        'vacunado' => (bool) $fila['vacunado'],
        'castrado' => (bool) $fila['castrado'],
        'estado' => $fila['estado'],
        'publicadoPorId' => $fila['usuario_id'] === null ? null : (int) $fila['usuario_id'],
        'publicadoPorNombre' => $fila['nombre_publicador'] ?: 'Adopciones MIAU',
        'img' => $fila['foto']
    ];
}

$accion = isset($_GET['accion']) ? $_GET['accion'] : '';
$metodo = $_SERVER['REQUEST_METHOD'];

try {
    if ($accion === 'sesion' && $metodo === 'GET') {
        responder(['usuario' => usuarioSesion($conexion)]);
    }

    if ($accion === 'registro' && $metodo === 'POST') {
        $datos = datosEntrada();
        $nombre = campo($datos, 'username', 80);
        $correo = strtolower(campo($datos, 'email', 190));
        $telefono = campo($datos, 'telefono', 30);
        $clave = isset($datos['password']) ? $datos['password'] : '';
        if (!filter_var($correo, FILTER_VALIDATE_EMAIL) || !preg_match('/^[\d\s+()-]{8,20}$/', $telefono) || strlen($clave) < 6) {
            responder(['error' => 'Revisá el correo, el teléfono y la contraseña (mínimo 6 caracteres).'], 422);
        }
        try {
            $consulta = $conexion->prepare('INSERT INTO usuarios (nombre, correo, telefono, contrasena) VALUES (?, ?, ?, ?)');
            $consulta->execute([$nombre, $correo, $telefono, password_hash($clave, PASSWORD_DEFAULT)]);
        } catch (PDOException $error) {
            if ($error->getCode() === '23000') {
                responder(['error' => 'Ese correo ya está registrado.'], 409);
            }
            throw $error;
        }
        responder(['mensaje' => 'Registro guardado.'], 201);
    }

    if ($accion === 'login' && $metodo === 'POST') {
        $datos = datosEntrada();
        $consulta = $conexion->prepare('SELECT id, contrasena FROM usuarios WHERE correo = ?');
        $consulta->execute([strtolower(trim($datos['email']))]);
        $fila = $consulta->fetch();
        if (!$fila || !password_verify($datos['password'], $fila['contrasena'])) {
            responder(['error' => 'Correo o contraseña incorrectos.'], 401);
        }
        session_regenerate_id(true);
        $_SESSION['usuario_id'] = (int) $fila['id'];
        responder(['usuario' => usuarioSesion($conexion)]);
    }

    if ($accion === 'salir' && $metodo === 'POST') {
        $_SESSION = [];
        session_destroy();
        responder(['mensaje' => 'Sesión cerrada.']);
    }

    if ($accion === 'mascotas' && $metodo === 'GET') {
        if (!empty($_GET['id'])) {
            $consulta = $conexion->prepare(
                'SELECT m.*, u.nombre AS nombre_publicador FROM mascotas m LEFT JOIN usuarios u ON u.id = m.usuario_id WHERE m.id = ?'
            );
            $consulta->execute([(int) $_GET['id']]);
            $fila = $consulta->fetch();
            responder(['mascota' => $fila ? mascotaJSON($fila) : null]);
        }
        $filas = $conexion->query(
            'SELECT m.*, u.nombre AS nombre_publicador FROM mascotas m LEFT JOIN usuarios u ON u.id = m.usuario_id ORDER BY m.id DESC'
        )->fetchAll();
        responder(['mascotas' => array_map('mascotaJSON', $filas)]);
    }

    if ($accion === 'mascotas' && $metodo === 'POST') {
        $usuario = requiereSesion($conexion);
        if (empty($usuario['telefono'])) {
            responder(['error' => 'Completá un teléfono en tu perfil antes de publicar.'], 422);
        }
        $datos = datosEntrada();
        $nombre = campo($datos, 'nombre', 40);
        $especie = campo($datos, 'especie', 20);
        $edad = campo($datos, 'edad', 20);
        $sexo = campo($datos, 'sexo', 10);
        $tamano = campo($datos, 'tamano', 20);
        $descripcion = campo($datos, 'descripcion', 500);
        $foto = campo($datos, 'foto', 1000000);
        $consulta = $conexion->prepare(
            'INSERT INTO mascotas (usuario_id, nombre, especie, edad, sexo, tamano, descripcion, vacunado, castrado, foto)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $consulta->execute([
            $usuario['id'], $nombre, $especie, $edad, $sexo, $tamano, $descripcion,
            !empty($datos['vacunado']) ? 1 : 0, !empty($datos['castrado']) ? 1 : 0, $foto
        ]);
        responder(['id' => (int) $conexion->lastInsertId()], 201);
    }

    if ($accion === 'solicitudes' && $metodo === 'GET') {
        $usuario = requiereSesion($conexion);
        $tieneNombreMascota = (bool) $conexion
            ->query("SHOW COLUMNS FROM solicitudes_adopcion LIKE 'nombre_mascota'")
            ->fetch();
        $nombreMascota = $tieneNombreMascota
            ? 'COALESCE(s.nombre_mascota, m.nombre)'
            : 'm.nombre';
        $consulta = $conexion->prepare(
            "SELECT s.id, s.mascota_id, s.usuario_id, $nombreMascota AS nombre_mascota,
                    s.mensaje, s.estado, s.fecha_solicitud,
                    m.usuario_id AS publicador_id, u1.correo AS correo_solicitante,
                    u1.telefono AS telefono_solicitante, u2.correo AS correo_publicador,
                    u2.telefono AS telefono_publicador, u1.nombre AS nombre_usuario
             FROM solicitudes_adopcion s
             LEFT JOIN mascotas m ON m.id = s.mascota_id
             JOIN usuarios u1 ON u1.id = s.usuario_id
             LEFT JOIN usuarios u2 ON u2.id = m.usuario_id
             WHERE s.usuario_id = ? OR m.usuario_id = ?
             ORDER BY s.fecha_solicitud DESC"
        );
        $consulta->execute([$usuario['id'], $usuario['id']]);
        $solicitudes = [];
        foreach ($consulta->fetchAll() as $fila) {
            $aceptada = $fila['estado'] === 'Aceptada';
            $solicitudes[] = [
                'id' => (int) $fila['id'],
                'mascotaId' => (int) $fila['mascota_id'],
                'mascotaNombre' => $fila['nombre_mascota'],
                'solicitanteId' => (int) $fila['usuario_id'],
                'solicitanteNombre' => $fila['nombre_usuario'],
                'solicitanteEmail' => $aceptada ? $fila['correo_solicitante'] : '',
                'solicitanteTelefono' => $aceptada ? $fila['telefono_solicitante'] : '',
                'publicadorId' => $fila['publicador_id'] === null ? null : (int) $fila['publicador_id'],
                'publicadorEmail' => $aceptada ? $fila['correo_publicador'] : '',
                'publicadorTelefono' => $aceptada ? $fila['telefono_publicador'] : '',
                'mensaje' => $fila['mensaje'],
                'fecha' => $fila['fecha_solicitud'],
                'estado' => $fila['estado']
            ];
        }
        responder(['solicitudes' => $solicitudes]);
    }

    if ($accion === 'solicitudes' && $metodo === 'POST') {
        $usuario = requiereSesion($conexion);
        if (empty($usuario['telefono'])) {
            responder(['error' => 'Completá un teléfono en tu perfil antes de solicitar una adopción.'], 422);
        }
        $datos = datosEntrada();
        $mascotaId = (int) $datos['mascotaId'];
        $mensaje = campo($datos, 'mensaje', 2000);
        $consulta = $conexion->prepare(
            "SELECT m.nombre, m.usuario_id FROM mascotas m WHERE m.id = ? AND m.estado = 'Disponible'"
        );
        $consulta->execute([$mascotaId]);
        $mascota = $consulta->fetch();
        if (!$mascota || (int) $mascota['usuario_id'] === $usuario['id']) {
            responder(['error' => 'La mascota no está disponible para solicitud.'], 409);
        }
        $consulta = $conexion->prepare(
            "SELECT id FROM solicitudes_adopcion WHERE mascota_id = ? AND usuario_id = ? AND estado IN ('Pendiente', 'Aceptada')"
        );
        $consulta->execute([$mascotaId, $usuario['id']]);
        if ($consulta->fetch()) {
            responder(['error' => 'Ya enviaste una solicitud para esta mascota.'], 409);
        }
        $tieneNombreMascota = (bool) $conexion
            ->query("SHOW COLUMNS FROM solicitudes_adopcion LIKE 'nombre_mascota'")
            ->fetch();
        if ($tieneNombreMascota) {
            $consulta = $conexion->prepare(
                'INSERT INTO solicitudes_adopcion (mascota_id, usuario_id, nombre_mascota, mensaje) VALUES (?, ?, ?, ?)'
            );
            $consulta->execute([$mascotaId, $usuario['id'], $mascota['nombre'], $mensaje]);
        } else {
            $consulta = $conexion->prepare(
                'INSERT INTO solicitudes_adopcion (mascota_id, usuario_id, mensaje) VALUES (?, ?, ?)'
            );
            $consulta->execute([$mascotaId, $usuario['id'], $mensaje]);
        }
        responder(['mensaje' => 'Solicitud guardada.'], 201);
    }

    if ($accion === 'accion-solicitud' && $metodo === 'POST') {
        $usuario = requiereSesion($conexion);
        $datos = datosEntrada();
        $id = (int) $datos['id'];
        $operacion = $datos['operacion'];
        $consulta = $conexion->prepare('SELECT * FROM solicitudes_adopcion WHERE id = ?');
        $consulta->execute([$id]);
        $solicitud = $consulta->fetch();
        if (!$solicitud || $solicitud['estado'] !== 'Pendiente') {
            responder(['error' => 'La solicitud ya no está pendiente.'], 409);
        }

        if ($operacion === 'cancelar' && (int) $solicitud['usuario_id'] === $usuario['id']) {
            $conexion->prepare("UPDATE solicitudes_adopcion SET estado = 'Cancelada' WHERE id = ?")->execute([$id]);
        } elseif (in_array($operacion, ['aceptar', 'rechazar'], true)) {
            $consulta = $conexion->prepare('SELECT usuario_id FROM mascotas WHERE id = ?');
            $consulta->execute([$solicitud['mascota_id']]);
            if ((int) $consulta->fetchColumn() !== $usuario['id']) {
                responder(['error' => 'No tenés permiso para responder esta solicitud.'], 403);
            }
            if ($operacion === 'aceptar') {
                $conexion->beginTransaction();
                $conexion->prepare("UPDATE mascotas SET estado = 'Adoptada' WHERE id = ?")->execute([$solicitud['mascota_id']]);
                $conexion->prepare("UPDATE solicitudes_adopcion SET estado = 'Rechazada' WHERE mascota_id = ? AND estado = 'Pendiente'")->execute([$solicitud['mascota_id']]);
                $conexion->prepare("UPDATE solicitudes_adopcion SET estado = 'Aceptada' WHERE id = ?")->execute([$id]);
                $conexion->commit();
            } else {
                $conexion->prepare("UPDATE solicitudes_adopcion SET estado = 'Rechazada' WHERE id = ?")->execute([$id]);
            }
        } else {
            responder(['error' => 'No tenés permiso para esta acción.'], 403);
        }
        responder(['mensaje' => 'Solicitud actualizada.']);
    }

    if ($accion === 'eliminar-mascota' && $metodo === 'POST') {
        $usuario = requiereSesion($conexion);
        $datos = datosEntrada();
        $id = (int) $datos['id'];
        $consulta = $conexion->prepare('SELECT id FROM mascotas WHERE id = ? AND usuario_id = ?');
        $consulta->execute([$id, $usuario['id']]);
        if (!$consulta->fetch()) {
            responder(['error' => 'No se encontró la mascota o no tenés permiso para eliminarla.'], 404);
        }
        $conexion->beginTransaction();
        $conexion->prepare("UPDATE solicitudes_adopcion SET estado = 'Cancelada' WHERE mascota_id = ? AND estado = 'Pendiente'")
            ->execute([$id]);
        $consulta = $conexion->prepare('DELETE FROM mascotas WHERE id = ? AND usuario_id = ?');
        $consulta->execute([$id, $usuario['id']]);
        $conexion->commit();
        responder(['mensaje' => 'Mascota eliminada.']);
    }

    if ($accion === 'perfil' && $metodo === 'POST') {
        $usuario = requiereSesion($conexion);
        $datos = datosEntrada();
        $nombre = campo($datos, 'username', 80);
        $telefono = campo($datos, 'telefono', 30);
        if (!preg_match('/^[\d\s+()-]{8,20}$/', $telefono)) {
            responder(['error' => 'Ingresá un teléfono válido.'], 422);
        }
        if (!empty($datos['passwordNueva'])) {
            $consulta = $conexion->prepare('SELECT contrasena FROM usuarios WHERE id = ?');
            $consulta->execute([$usuario['id']]);
            if (!password_verify($datos['passwordActual'], $consulta->fetchColumn()) || strlen($datos['passwordNueva']) < 6) {
                responder(['error' => 'Verificá la contraseña actual y que la nueva tenga al menos 6 caracteres.'], 422);
            }
            $consulta = $conexion->prepare('UPDATE usuarios SET nombre = ?, telefono = ?, contrasena = ? WHERE id = ?');
            $consulta->execute([$nombre, $telefono, password_hash($datos['passwordNueva'], PASSWORD_DEFAULT), $usuario['id']]);
        } else {
            $conexion->prepare('UPDATE usuarios SET nombre = ?, telefono = ? WHERE id = ?')->execute([$nombre, $telefono, $usuario['id']]);
        }
        responder(['usuario' => usuarioSesion($conexion)]);
    }

    if ($accion === 'testimonios' && $metodo === 'GET') {
        $usuario = usuarioSesion($conexion);
        $filas = $conexion->query(
            'SELECT t.*, u.nombre AS autor FROM testimonios t JOIN usuarios u ON u.id = t.usuario_id ORDER BY t.id DESC'
        )->fetchAll();
        $testimonios = [];
        foreach ($filas as $fila) {
            $testimonios[] = [
                'id' => (int) $fila['id'],
                'mascotaNombre' => $fila['nombre_mascota'],
                'texto' => $fila['texto'],
                'img' => $fila['foto'],
                'autorNombre' => $fila['autor'],
                'fecha' => $fila['fecha_publicacion'],
                'esAutor' => $usuario && (int) $fila['usuario_id'] === $usuario['id']
            ];
        }
        responder(['testimonios' => $testimonios]);
    }

    if ($accion === 'testimonios' && $metodo === 'POST') {
        $usuario = requiereSesion($conexion);
        $datos = datosEntrada();
        $consulta = $conexion->prepare('INSERT INTO testimonios (usuario_id, nombre_mascota, texto, foto) VALUES (?, ?, ?, ?)');
        $consulta->execute([
            $usuario['id'],
            campo($datos, 'mascotaNombre', 40),
            campo($datos, 'texto', 600),
            !empty($datos['foto']) ? $datos['foto'] : null
        ]);
        responder(['mensaje' => 'Testimonio guardado.'], 201);
    }

    if ($accion === 'eliminar-testimonio' && $metodo === 'POST') {
        $usuario = requiereSesion($conexion);
        $datos = datosEntrada();
        $consulta = $conexion->prepare('DELETE FROM testimonios WHERE id = ? AND usuario_id = ?');
        $consulta->execute([(int) $datos['id'], $usuario['id']]);
        if (!$consulta->rowCount()) {
            responder(['error' => 'No se encontró el testimonio o no tenés permiso para eliminarlo.'], 404);
        }
        responder(['mensaje' => 'Testimonio eliminado.']);
    }

    if ($accion === 'contacto' && $metodo === 'POST') {
        $datos = datosEntrada();
        $nombre = campo($datos, 'nombre', 100);
        $correo = campo($datos, 'correo', 190);
        $mensaje = campo($datos, 'mensaje', 2000);
        if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
            responder(['error' => 'Ingresá un correo válido.'], 422);
        }
        $conexion->prepare('INSERT INTO mensajes_contacto (nombre, correo, mensaje) VALUES (?, ?, ?)')->execute([$nombre, $correo, $mensaje]);
        responder(['mensaje' => 'Mensaje guardado.'], 201);
    }

    responder(['error' => 'Acción desconocida.'], 404);
} catch (Throwable $error) {
    if ($conexion->inTransaction()) {
        $conexion->rollBack();
    }
    error_log($error->getMessage());
    responder(['error' => 'Error al guardar los datos. Revisá que MySQL esté iniciado y que hayas importado database.sql.'], 500);
}
