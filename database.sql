CREATE DATABASE IF NOT EXISTS adopciones_miau
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE adopciones_miau;

CREATE TABLE IF NOT EXISTS usuarios (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL,
    correo VARCHAR(190) NOT NULL UNIQUE,
    telefono VARCHAR(30),
    contrasena VARCHAR(255) NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS mascotas (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT UNSIGNED NULL,
    nombre VARCHAR(40) NOT NULL,
    especie VARCHAR(20) NOT NULL,
    edad VARCHAR(20) NOT NULL,
    sexo VARCHAR(10) NOT NULL,
    tamano VARCHAR(20) NOT NULL,
    descripcion VARCHAR(500) NOT NULL,
    vacunado BOOLEAN NOT NULL DEFAULT FALSE,
    castrado BOOLEAN NOT NULL DEFAULT FALSE,
    estado ENUM('Disponible', 'Adoptada') NOT NULL DEFAULT 'Disponible',
    foto MEDIUMTEXT NOT NULL,
    fecha_publicacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS solicitudes_adopcion (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    mascota_id INT UNSIGNED NULL,
    usuario_id INT UNSIGNED NOT NULL,
    nombre_mascota VARCHAR(40) NOT NULL,
    mensaje TEXT NOT NULL,
    estado ENUM('Pendiente', 'Aceptada', 'Rechazada', 'Cancelada') NOT NULL DEFAULT 'Pendiente',
    fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mascota_id) REFERENCES mascotas(id) ON DELETE SET NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS testimonios (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT UNSIGNED NOT NULL,
    nombre_mascota VARCHAR(40) NOT NULL,
    texto VARCHAR(600) NOT NULL,
    foto MEDIUMTEXT,
    fecha_publicacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO mascotas (nombre, especie, edad, sexo, tamano, descripcion, vacunado, castrado, foto)
SELECT 'Caniche', 'Perro', '6 meses', 'hembra', 'Pequeño',
       'Cariñosa y muy juguetona. Se lleva bien con niños y con otros perros.',
       TRUE, FALSE, 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?q=80&w=400'
WHERE NOT EXISTS (SELECT 1 FROM mascotas WHERE nombre = 'Caniche' AND usuario_id IS NULL);

INSERT INTO mascotas (nombre, especie, edad, sexo, tamano, descripcion, vacunado, castrado, foto)
SELECT 'Jack Russell Terrier', 'Perro', '8 meses', 'macho', 'Pequeño',
       'Muy enérgico. Necesita espacio para correr y jugar todos los días.',
       TRUE, FALSE, 'https://images.unsplash.com/photo-1517849845537-4d257902454a?q=80&w=400'
WHERE NOT EXISTS (SELECT 1 FROM mascotas WHERE nombre = 'Jack Russell Terrier' AND usuario_id IS NULL);

INSERT INTO mascotas (nombre, especie, edad, sexo, tamano, descripcion, vacunado, castrado, foto)
SELECT 'Gato blanco', 'Gato', '1 año', 'hembra', 'Pequeño',
       'Tranquila y mimosa. Ideal para vivir en departamento.',
       TRUE, TRUE, 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=400'
WHERE NOT EXISTS (SELECT 1 FROM mascotas WHERE nombre = 'Gato blanco' AND usuario_id IS NULL);

INSERT INTO mascotas (nombre, especie, edad, sexo, tamano, descripcion, vacunado, castrado, foto)
SELECT 'Gato', 'Gato', '10 meses', 'macho', 'Pequeño',
       'Curioso y aventurero. Le encanta trepar y jugar con pelotitas.',
       TRUE, FALSE, 'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?q=80&w=400'
WHERE NOT EXISTS (SELECT 1 FROM mascotas WHERE nombre = 'Gato' AND usuario_id IS NULL);

INSERT INTO mascotas (nombre, especie, edad, sexo, tamano, descripcion, vacunado, castrado, foto)
SELECT 'Pequinés', 'Perro', '5 meses', 'hembra', 'Pequeño',
       'Dulce y compañera. Le gusta estar en brazos y pasear tranquila.',
       TRUE, FALSE, 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=400'
WHERE NOT EXISTS (SELECT 1 FROM mascotas WHERE nombre = 'Pequinés' AND usuario_id IS NULL);

INSERT INTO mascotas (nombre, especie, edad, sexo, tamano, descripcion, vacunado, castrado, foto)
SELECT 'Pug', 'Perro', '1 año', 'macho', 'Pequeño',
       'Simpático y dormilón. Ama la comida y las siestas al sol.',
       TRUE, TRUE, 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=400'
WHERE NOT EXISTS (SELECT 1 FROM mascotas WHERE nombre = 'Pug' AND usuario_id IS NULL);

CREATE TABLE IF NOT EXISTS mensajes_contacto (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(190) NOT NULL,
    mensaje TEXT NOT NULL,
    fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notificaciones (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT UNSIGNED NOT NULL,
    tipo ENUM('mascota_publicada', 'solicitud_recibida', 'solicitud_aceptada', 'solicitud_rechazada') NOT NULL,
    mensaje VARCHAR(255) NOT NULL,
    mascota_id INT UNSIGNED NULL,
    leida BOOLEAN NOT NULL DEFAULT FALSE,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (mascota_id) REFERENCES mascotas(id) ON DELETE SET NULL,
    INDEX idx_notificaciones_usuario (usuario_id, leida)
) ENGINE=InnoDB;