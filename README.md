# Adopciones MIAU

## Usar con XAMPP

1. Iniciá Apache y MySQL desde el panel de XAMPP.
2. En `http://localhost/phpmyadmin`, importá el archivo `database.sql`.
3. Si tu MySQL tiene otra contraseña, editá los datos de conexión en `conexion.php`.
4. Abrí el proyecto en `http://localhost/Proyecto-Practicas-Profesionalizantes/`.

No abras los archivos HTML directamente desde el explorador: PHP debe ejecutarse mediante Apache. Los formularios y acciones guardan usuarios, mascotas, solicitudes, testimonios y mensajes en MySQL.

XAMPP debe tener habilitada la extensión PHP `pdo_mysql` (normalmente ya viene activada).