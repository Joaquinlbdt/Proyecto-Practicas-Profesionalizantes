// =====================================================================
//  ADOPCIONES MIAU - script.js
//  Todo el sitio guarda sus datos en el navegador (localStorage).
//  Claves que usamos:
//    'mascotas'         -> lista de mascotas
//    'solicitudes'      -> lista de solicitudes de adopción
//    'usuarios'         -> usuarios registrados
//    'usuarioLogueado'  -> usuario con la sesión iniciada
// =====================================================================


// ---------------------------------------------------------------------
// 1. DATOS INICIALES
// ---------------------------------------------------------------------

// Si algún día cambiás los datos de ejemplo, subí este número y las
// mascotas se reinician con la nueva lista.
const VERSION_DATOS = '2';

const mascotasIniciales = [
    { id: 1, nombre: "Caniche", especie: "Perro", edadysexo: "6 meses - hembra", tamano: "Pequeño",
      descripcion: "Cariñosa y muy juguetona. Se lleva bien con niños y con otros perros.",
      vacunado: true, castrado: false, estado: "Disponible",
      publicadoPor: "refugio", publicadoPorNombre: "Adopciones MIAU",
      img: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?q=80&w=400" },
    { id: 2, nombre: "Jack Russell Terrier", especie: "Perro", edadysexo: "8 meses - macho", tamano: "Pequeño",
      descripcion: "Muy enérgico. Necesita espacio para correr y jugar todos los días.",
      vacunado: true, castrado: false, estado: "Disponible",
      publicadoPor: "refugio", publicadoPorNombre: "Adopciones MIAU",
      img: "https://images.unsplash.com/photo-1517849845537-4d257902454a?q=80&w=400" },
    { id: 3, nombre: "Gato blanco", especie: "Gato", edadysexo: "1 año - hembra", tamano: "Pequeño",
      descripcion: "Tranquila y mimosa. Ideal para vivir en departamento.",
      vacunado: true, castrado: true, estado: "Disponible",
      publicadoPor: "refugio", publicadoPorNombre: "Adopciones MIAU",
      img: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=400" },
    { id: 4, nombre: "Gato", especie: "Gato", edadysexo: "10 meses - macho", tamano: "Pequeño",
      descripcion: "Curioso y aventurero. Le encanta trepar y jugar con pelotitas.",
      vacunado: true, castrado: false, estado: "Disponible",
      publicadoPor: "refugio", publicadoPorNombre: "Adopciones MIAU",
      img: "https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?q=80&w=400" },
    { id: 5, nombre: "Pequinés", especie: "Perro", edadysexo: "5 meses - hembra", tamano: "Pequeño",
      descripcion: "Dulce y compañera. Le gusta estar en brazos y pasear tranquila.",
      vacunado: true, castrado: false, estado: "Disponible",
      publicadoPor: "refugio", publicadoPorNombre: "Adopciones MIAU",
      img: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=400" },
    { id: 6, nombre: "Pug", especie: "Perro", edadysexo: "1 año - macho", tamano: "Pequeño",
      descripcion: "Simpático y dormilón. Ama la comida y las siestas al sol.",
      vacunado: true, castrado: true, estado: "Disponible",
      publicadoPor: "refugio", publicadoPorNombre: "Adopciones MIAU",
      img: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=400" }
];


// ---------------------------------------------------------------------
// 2. FUNCIONES AUXILIARES (las usan todas las páginas)
// ---------------------------------------------------------------------

// Lee algo de localStorage. Si no existe, devuelve el valor "porDefecto".
function leer(clave, porDefecto) {
    try {
        const valor = JSON.parse(localStorage.getItem(clave));
        return valor === null ? porDefecto : valor;
    } catch (error) {
        return porDefecto;
    }
}

// Guarda algo en localStorage. Devuelve true si salió bien.
function guardar(clave, valor) {
    try {
        localStorage.setItem(clave, JSON.stringify(valor));
        return true;
    } catch (error) {
        alert('No se pudo guardar: el navegador se quedó sin espacio. Probá con una foto más chica.');
        return false;
    }
}

// Protege el sitio: convierte caracteres peligrosos (< > " ') en texto inofensivo.
// Usala SIEMPRE que metas texto escrito por un usuario dentro de un innerHTML.
function escaparHTML(texto) {
    return String(texto ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Devuelve el usuario con sesión iniciada (o null si no hay nadie).
function obtenerUsuario() {
    return leer('usuarioLogueado', null);
}

// Nombre del archivo actual, por ejemplo "perfil.html".
function paginaActual() {
    return window.location.pathname.split('/').pop() || 'index.html';
}

// Si no hay sesión, avisa y manda a login (y después de loguearse vuelve a esta página).
// Devuelve true si el usuario SÍ está logueado.
function exigirLogin(mensaje) {
    if (obtenerUsuario()) return true;
    alert(mensaje);
    sessionStorage.setItem('volverA', paginaActual() + window.location.search);
    window.location.href = 'login.html';
    return false;
}

function formatearFecha(fechaISO) {
    return new Date(fechaISO).toLocaleDateString('es-AR');
}

// ¿Este usuario ya tiene una solicitud activa para esta mascota?
function yaSolicito(solicitudes, mascotaId, email) {
    return solicitudes.some(s =>
        s.mascotaId === mascotaId &&
        s.solicitanteEmail === email &&
        (s.estado === 'Pendiente' || s.estado === 'Aceptada')
    );
}

// Achica la foto que subió el usuario y la convierte a texto (base64)
// para poder guardarla en localStorage, que tiene poco espacio.
function comprimirImagen(archivo, anchoMaximo = 800) {
    return new Promise((resolve, reject) => {
        const lector = new FileReader();
        lector.onerror = () => reject(new Error('No se pudo leer el archivo.'));
        lector.onload = () => {
            const imagen = new Image();
            imagen.onerror = () => reject(new Error('El archivo no es una imagen válida.'));
            imagen.onload = () => {
                const escala = Math.min(1, anchoMaximo / imagen.width);
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(imagen.width * escala);
                canvas.height = Math.round(imagen.height * escala);
                canvas.getContext('2d').drawImage(imagen, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            imagen.src = lector.result;
        };
        lector.readAsDataURL(archivo);
    });
}


// ---------------------------------------------------------------------
// 3. ARRANQUE: se ejecuta cuando la página termina de cargar
//    Cada función "iniciar..." revisa si la página actual la necesita.
//    Si no, no hace nada.
// ---------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    prepararDatos();
    actualizarCabeceraUsuario();
    agregarEnlacesNav();
    activarBuscador();

    iniciarCatalogo();   // index.html
    iniciarDetalle();    // mascota.html
    iniciarPublicar();   // publicar.html
    iniciarPerfil();     // perfil.html
    iniciarRegistro();   // registro.html
    iniciarLogin();      // login.html
});

function prepararDatos() {
    if (localStorage.getItem('versionDatos') !== VERSION_DATOS) {
        guardar('mascotas', mascotasIniciales);
        localStorage.setItem('versionDatos', VERSION_DATOS);
    }
    if (!localStorage.getItem('usuarios')) guardar('usuarios', []);
    if (!localStorage.getItem('solicitudes')) guardar('solicitudes', []);
}


// ---------------------------------------------------------------------
// 4. CABECERA Y MENÚ (en todas las páginas)
// ---------------------------------------------------------------------

// Si hay sesión iniciada, cambia los botones por "Hola, nombre" y "Cerrar sesión".
function actualizarCabeceraUsuario() {
    const usuario = obtenerUsuario();
    const headerRight = document.querySelector('.header-right');
    if (!usuario || !headerRight) return;

    headerRight.innerHTML = '';

    const saludo = document.createElement('a');
    saludo.href = 'perfil.html';
    saludo.className = 'saludo-usuario';
    saludo.textContent = '👋 Hola, ' + usuario.username;   // textContent es seguro

    const botonSalir = document.createElement('button');
    botonSalir.className = 'btn btn-secondary';
    botonSalir.textContent = 'Cerrar sesión';
    botonSalir.addEventListener('click', () => {
        localStorage.removeItem('usuarioLogueado');
        alert('Has cerrado sesión.');
        window.location.href = 'index.html';
    });

    headerRight.appendChild(saludo);
    headerRight.appendChild(botonSalir);
}

// Agrega "Publicar mascota" (y "Mi perfil" si hay sesión) al menú de TODAS las páginas.
function agregarEnlacesNav() {
    const nav = document.querySelector('.nav-links');
    if (!nav) return;

    const enlaces = [{ href: 'publicar.html', texto: 'Publicar mascota' }];
    if (obtenerUsuario()) enlaces.push({ href: 'perfil.html', texto: 'Mi perfil' });

    enlaces.forEach(enlace => {
        const a = document.createElement('a');
        a.href = enlace.href;
        a.className = 'nav-item';
        a.textContent = enlace.texto;
        if (paginaActual() === enlace.href) a.classList.add('active');
        nav.appendChild(a);
    });
}

// En las páginas que NO son el catálogo, el buscador te lleva al catálogo con tu búsqueda.
function activarBuscador() {
    const input = document.querySelector('.search-box input');
    const boton = document.querySelector('.search-btn');
    if (!input || document.querySelector('.pets-grid')) return;

    const buscar = () => {
        const texto = input.value.trim();
        window.location.href = 'index.html' + (texto ? '?buscar=' + encodeURIComponent(texto) : '');
    };
    boton.addEventListener('click', buscar);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') buscar(); });
}


// ---------------------------------------------------------------------
// 5. CATÁLOGO (index.html)
// ---------------------------------------------------------------------
function iniciarCatalogo() {
    const grid = document.querySelector('.pets-grid');
    if (!grid) return;

    const mascotas = leer('mascotas', []);
    const input = document.querySelector('.search-box input');
    const boton = document.querySelector('.search-btn');

    function dibujar(lista) {
        grid.innerHTML = '';

        if (lista.length === 0) {
            grid.innerHTML = '<p class="sin-resultados">No se encontraron mascotas que coincidan.</p>';
            return;
        }

        lista.forEach(pet => {
            const adoptada = pet.estado === 'Adoptada';

            // Cada tarjeta es un enlace a mascota.html?id=NUMERO
            const tarjeta = document.createElement('a');
            tarjeta.href = 'mascota.html?id=' + pet.id;
            tarjeta.className = 'pet-card' + (adoptada ? ' adoptada' : '');
            tarjeta.innerHTML = `
                <img src="${escaparHTML(pet.img)}" alt="${escaparHTML(pet.nombre)}">
                <h3>${escaparHTML(pet.nombre)}</h3>
                <p>${escaparHTML(pet.edadysexo)}</p>
                <span class="etiqueta ${adoptada ? 'etiqueta-adoptada' : 'etiqueta-disponible'}">
                    ${adoptada ? 'Adoptada' : 'Disponible'}
                </span>
                <span class="btn-ver">Ver más</span>
            `;
            grid.appendChild(tarjeta);
        });
    }

    function filtrar() {
        const termino = input.value.toLowerCase().trim();
        const filtradas = mascotas.filter(m =>
            m.nombre.toLowerCase().includes(termino) ||
            m.edadysexo.toLowerCase().includes(termino) ||
            (m.especie || '').toLowerCase().includes(termino)
        );
        dibujar(filtradas);
    }

    // Si venimos de otra página con una búsqueda (?buscar=...), la aplicamos
    const busquedaInicial = new URLSearchParams(window.location.search).get('buscar');
    if (busquedaInicial && input) input.value = busquedaInicial;

    if (input) {
        input.addEventListener('input', filtrar);
        if (boton) boton.addEventListener('click', filtrar);
        filtrar();
    } else {
        dibujar(mascotas);
    }
}


// ---------------------------------------------------------------------
// 6. DETALLE DE UNA MASCOTA + SOLICITAR ADOPCIÓN (mascota.html)
// ---------------------------------------------------------------------
function iniciarDetalle() {
    const contenedor = document.getElementById('detalle-mascota');
    if (!contenedor) return;

    // Leemos el número de la mascota desde la dirección: mascota.html?id=3
    const id = Number(new URLSearchParams(window.location.search).get('id'));
    const mascota = leer('mascotas', []).find(m => m.id === id);

    if (!mascota) {
        contenedor.innerHTML = '<p class="sin-resultados">No encontramos esta mascota. <a href="index.html">Volver al catálogo</a></p>';
        return;
    }

    const usuario = obtenerUsuario();
    const solicitudes = leer('solicitudes', []);
    const adoptada = mascota.estado === 'Adoptada';
    const esMia = usuario && mascota.publicadoPor === usuario.email;
    const yaSolicitada = usuario && yaSolicito(solicitudes, mascota.id, usuario.email);

    // Decidimos qué dice el botón y si se puede apretar
    let textoBoton = '🐾 Solicitar adopción';
    let deshabilitado = false;
    if (adoptada) {
        textoBoton = 'Esta mascota ya fue adoptada';
        deshabilitado = true;
    } else if (esMia) {
        textoBoton = 'Es una mascota que publicaste vos';
        deshabilitado = true;
    } else if (yaSolicitada) {
        textoBoton = 'Ya enviaste una solicitud';
        deshabilitado = true;
    } else if (!usuario) {
        textoBoton = 'Iniciar sesión para adoptar';
    }

    contenedor.innerHTML = `
        <div class="detalle-card">
            <div class="detalle-foto">
                <img src="${escaparHTML(mascota.img)}" alt="${escaparHTML(mascota.nombre)}">
            </div>
            <div class="detalle-info">
                <h1>${escaparHTML(mascota.nombre)}</h1>
                <span class="etiqueta ${adoptada ? 'etiqueta-adoptada' : 'etiqueta-disponible'}">
                    ${adoptada ? 'Adoptada' : 'Disponible'}
                </span>

                <ul class="detalle-datos">
                    <li><strong>Especie:</strong> ${escaparHTML(mascota.especie || 'No indicada')}</li>
                    <li><strong>Edad y sexo:</strong> ${escaparHTML(mascota.edadysexo)}</li>
                    <li><strong>Tamaño:</strong> ${escaparHTML(mascota.tamano || 'No indicado')}</li>
                    <li><strong>Vacunas al día:</strong> ${mascota.vacunado ? 'Sí' : 'No'}</li>
                    <li><strong>Castrado/a:</strong> ${mascota.castrado ? 'Sí' : 'No'}</li>
                </ul>

                <h3>Sobre ${escaparHTML(mascota.nombre)}</h3>
                <p>${escaparHTML(mascota.descripcion || 'Sin descripción.')}</p>
                <p class="publicado-por">Publicada por: <strong>${escaparHTML(mascota.publicadoPorNombre || 'Adopciones MIAU')}</strong></p>

                <button id="btn-solicitar" class="btn-adoptar" ${deshabilitado ? 'disabled' : ''}>${textoBoton}</button>
                ${yaSolicitada ? '<p class="publicado-por"><a href="perfil.html">Ver el estado de mi solicitud</a></p>' : ''}
            </div>
        </div>
    `;

    const botonSolicitar = document.getElementById('btn-solicitar');
    const seccionForm = document.getElementById('seccion-solicitud');
    const formSolicitud = document.getElementById('form-solicitud');

    // Al tocar el botón: si no hay sesión, a login; si hay, mostramos el formulario
    botonSolicitar.addEventListener('click', () => {
        if (!exigirLogin('Tenés que iniciar sesión para solicitar una adopción.')) return;
        seccionForm.hidden = false;
        seccionForm.scrollIntoView({ behavior: 'smooth' });
    });

    // Al enviar el formulario: guardamos la solicitud
    formSolicitud.addEventListener('submit', (e) => {
        e.preventDefault();

        const usuarioActual = obtenerUsuario();
        if (!usuarioActual) {
            exigirLogin('Tenés que iniciar sesión para solicitar una adopción.');
            return;
        }

        const todas = leer('solicitudes', []);
        if (yaSolicito(todas, mascota.id, usuarioActual.email)) {
            alert('Ya enviaste una solicitud para esta mascota.');
            return;
        }

        todas.push({
            id: Date.now(),
            mascotaId: mascota.id,
            mascotaNombre: mascota.nombre,
            solicitanteEmail: usuarioActual.email,
            solicitanteNombre: usuarioActual.username,
            telefono: document.getElementById('telefono').value.trim(),
            mensaje: document.getElementById('mensaje').value.trim(),
            fecha: new Date().toISOString(),
            estado: 'Pendiente'
        });

        if (guardar('solicitudes', todas)) {
            alert('¡Solicitud enviada! Podés ver su estado en tu perfil. 🐾');
            window.location.href = 'perfil.html';
        }
    });
}


// ---------------------------------------------------------------------
// 7. PUBLICAR UNA MASCOTA (publicar.html)
//    La foto se puede subir como archivo O pegar como URL.
// ---------------------------------------------------------------------
function iniciarPublicar() {
    const form = document.getElementById('form-publicar');
    if (!form) return;

    if (!exigirLogin('Tenés que iniciar sesión para publicar una mascota.')) return;
    const usuario = obtenerUsuario();

    const inputArchivo = document.getElementById('img-archivo');
    const inputUrl = document.getElementById('img-url');
    const vistaPrevia = document.getElementById('vista-previa');
    const botonPublicar = document.getElementById('btn-publicar');

    function mostrarVistaPrevia(src) {
        vistaPrevia.src = src;
        vistaPrevia.hidden = false;
    }
    // Si el enlace no carga una imagen, ocultamos la vista previa
    vistaPrevia.addEventListener('error', () => { vistaPrevia.hidden = true; });

    inputArchivo.addEventListener('change', () => {
        const archivo = inputArchivo.files[0];
        if (archivo) mostrarVistaPrevia(URL.createObjectURL(archivo));
    });
    inputUrl.addEventListener('input', () => {
        const url = inputUrl.value.trim();
        if (/^https?:\/\//i.test(url)) mostrarVistaPrevia(url);
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // --- Paso 1: conseguir la imagen (archivo o URL) ---
        const archivo = inputArchivo.files[0];
        const url = inputUrl.value.trim();
        let imagen = '';

        botonPublicar.disabled = true;   // evita que se envíe dos veces

        if (archivo) {
            if (!archivo.type.startsWith('image/')) {
                alert('El archivo tiene que ser una imagen (JPG, PNG, etc.).');
                botonPublicar.disabled = false;
                return;
            }
            if (archivo.size > 5 * 1024 * 1024) {
                alert('La foto pesa más de 5 MB. Elegí una más liviana.');
                botonPublicar.disabled = false;
                return;
            }
            try {
                imagen = await comprimirImagen(archivo);
            } catch (error) {
                alert(error.message);
                botonPublicar.disabled = false;
                return;
            }
        } else if (url) {
            if (!/^https?:\/\//i.test(url)) {
                alert('El enlace debe empezar con http:// o https://');
                botonPublicar.disabled = false;
                return;
            }
            imagen = url;
        } else {
            alert('Agregá una foto: subí un archivo o pegá un enlace.');
            botonPublicar.disabled = false;
            return;
        }

        // --- Paso 2: armar la mascota y guardarla ---
        const mascotas = leer('mascotas', []);
        const nuevoId = mascotas.reduce((mayor, m) => Math.max(mayor, m.id), 0) + 1;
        const edad = document.getElementById('edad').value.trim();
        const sexo = document.getElementById('sexo').value;

        mascotas.push({
            id: nuevoId,
            nombre: document.getElementById('nombre').value.trim(),
            especie: document.getElementById('especie').value,
            edadysexo: edad + ' - ' + sexo,
            tamano: document.getElementById('tamano').value,
            descripcion: document.getElementById('descripcion').value.trim(),
            vacunado: document.getElementById('vacunado').checked,
            castrado: document.getElementById('castrado').checked,
            estado: 'Disponible',
            publicadoPor: usuario.email,
            publicadoPorNombre: usuario.username,
            img: imagen
        });

        if (guardar('mascotas', mascotas)) {
            alert('¡Mascota publicada con éxito! 🐶');
            window.location.href = 'mascota.html?id=' + nuevoId;
        } else {
            botonPublicar.disabled = false;
        }
    });
}


// ---------------------------------------------------------------------
// 8. PERFIL (perfil.html)
//    - Mis solicitudes (las que yo envié)
//    - Solicitudes recibidas (las que le hicieron a mis mascotas)
//    - Mis mascotas publicadas
// ---------------------------------------------------------------------
function iniciarPerfil() {
    const perfil = document.getElementById('perfil');
    if (!perfil) return;

    if (!exigirLogin('Tenés que iniciar sesión para ver tu perfil.')) return;
    const usuario = obtenerUsuario();

    document.getElementById('perfil-nombre').textContent = usuario.username;
    document.getElementById('perfil-email').textContent = usuario.email;

    const masNuevoPrimero = (a, b) => b.id - a.id;

    // Pone una lista de tarjetas dentro de un contenedor (o un mensaje si está vacía)
    function pintar(idContenedor, tarjetas, mensajeVacio) {
        document.getElementById(idContenedor).innerHTML =
            tarjetas.length ? tarjetas.join('') : `<p class="vacio">${mensajeVacio}</p>`;
    }

    // Tarjeta de una solicitud que YO envié
    function tarjetaEnviada(s, mascotas) {
        const m = mascotas.find(x => x.id === s.mascotaId);
        const foto = m
            ? `<img src="${escaparHTML(m.img)}" alt="${escaparHTML(s.mascotaNombre)}">`
            : '<div class="sin-foto">🐾</div>';
        const verMascota = m ? `<a class="btn-mini btn-link" href="mascota.html?id=${m.id}">Ver mascota</a>` : '';
        const cancelar = s.estado === 'Pendiente'
            ? `<button class="btn-mini btn-peligro" data-accion="cancelar" data-id="${s.id}">Cancelar solicitud</button>`
            : '';
        let aviso = '';
        if (s.estado === 'Aceptada') {
            aviso = `<p>🎉 ¡Aceptaron tu solicitud!${m ? ' Contacto: ' + escaparHTML(m.publicadoPor) : ''}</p>`;
        } else if (s.estado === 'Pendiente') {
            aviso = '<p>Esperando respuesta de quien publicó la mascota.</p>';
        }

        return `
            <div class="item-perfil">
                ${foto}
                <div class="item-info">
                    <h4>${escaparHTML(s.mascotaNombre)}</h4>
                    <p>Enviada el ${formatearFecha(s.fecha)}</p>
                    ${aviso}
                    <span class="estado estado-${s.estado.toLowerCase()}">${s.estado}</span>
                </div>
                <div class="item-acciones">${verMascota}${cancelar}</div>
            </div>`;
    }

    // Tarjeta de una solicitud que le hicieron a una de MIS mascotas
    function tarjetaRecibida(s) {
        const botones = s.estado === 'Pendiente'
            ? `<button class="btn-mini btn-ok" data-accion="aceptar" data-id="${s.id}">Aceptar</button>
               <button class="btn-mini btn-peligro" data-accion="rechazar" data-id="${s.id}">Rechazar</button>`
            : '';
        return `
            <div class="item-perfil">
                <div class="item-info">
                    <h4>${escaparHTML(s.solicitanteNombre)} quiere adoptar a ${escaparHTML(s.mascotaNombre)}</h4>
                    <p>📧 ${escaparHTML(s.solicitanteEmail)} · 📞 ${escaparHTML(s.telefono)}</p>
                    <p class="mensaje-solicitud">"${escaparHTML(s.mensaje)}"</p>
                    <p>Recibida el ${formatearFecha(s.fecha)}</p>
                    <span class="estado estado-${s.estado.toLowerCase()}">${s.estado}</span>
                </div>
                <div class="item-acciones">${botones}</div>
            </div>`;
    }

    // Tarjeta de una mascota que YO publiqué
    function tarjetaPublicada(m) {
        const adoptada = m.estado === 'Adoptada';
        return `
            <div class="item-perfil">
                <img src="${escaparHTML(m.img)}" alt="${escaparHTML(m.nombre)}">
                <div class="item-info">
                    <h4>${escaparHTML(m.nombre)}</h4>
                    <p>${escaparHTML(m.edadysexo)}</p>
                    <span class="etiqueta ${adoptada ? 'etiqueta-adoptada' : 'etiqueta-disponible'}">${adoptada ? 'Adoptada' : 'Disponible'}</span>
                </div>
                <div class="item-acciones">
                    <a class="btn-mini btn-link" href="mascota.html?id=${m.id}">Ver</a>
                    <button class="btn-mini btn-peligro" data-accion="eliminar" data-id="${m.id}">Eliminar</button>
                </div>
            </div>`;
    }

    // Dibuja las tres secciones con los datos actuales
    function dibujar() {
        const mascotas = leer('mascotas', []);
        const solicitudes = leer('solicitudes', []);

        const misMascotas = mascotas.filter(m => m.publicadoPor === usuario.email);
        const idsMisMascotas = misMascotas.map(m => m.id);

        const enviadas = solicitudes.filter(s => s.solicitanteEmail === usuario.email).sort(masNuevoPrimero);
        const recibidas = solicitudes.filter(s => idsMisMascotas.includes(s.mascotaId)).sort(masNuevoPrimero);

        pintar('mis-solicitudes',
            enviadas.map(s => tarjetaEnviada(s, mascotas)),
            'Todavía no enviaste solicitudes. <a href="index.html">Mirá las mascotas disponibles</a>.');

        pintar('solicitudes-recibidas',
            recibidas.map(tarjetaRecibida),
            'Todavía no recibiste solicitudes por tus mascotas.');

        pintar('mis-publicaciones',
            misMascotas.map(tarjetaPublicada),
            'No publicaste ninguna mascota. <a href="publicar.html">Publicá la primera</a>.');
    }

    // Un solo "oyente de clics" para todos los botones del perfil.
    // Cada botón dice qué hace con data-accion y sobre qué con data-id.
    perfil.addEventListener('click', (e) => {
        const boton = e.target.closest('button[data-accion]');
        if (!boton) return;

        const accion = boton.dataset.accion;
        const id = Number(boton.dataset.id);
        const mascotas = leer('mascotas', []);
        const solicitudes = leer('solicitudes', []);

        if (accion === 'cancelar') {
            // Solo puedo cancelar MIS solicitudes que sigan pendientes
            const s = solicitudes.find(x => x.id === id && x.solicitanteEmail === usuario.email && x.estado === 'Pendiente');
            if (!s) return;
            if (!confirm('¿Querés cancelar esta solicitud?')) return;
            s.estado = 'Cancelada';
            guardar('solicitudes', solicitudes);
        }

        if (accion === 'aceptar' || accion === 'rechazar') {
            // Solo puedo responder solicitudes pendientes de MIS mascotas
            const s = solicitudes.find(x => x.id === id && x.estado === 'Pendiente');
            const mascota = s && mascotas.find(m => m.id === s.mascotaId && m.publicadoPor === usuario.email);
            if (!mascota) return;

            if (accion === 'aceptar') {
                if (!confirm(`¿Aceptar la adopción de ${mascota.nombre}? Se rechazarán las demás solicitudes.`)) return;
                s.estado = 'Aceptada';
                mascota.estado = 'Adoptada';
                solicitudes.forEach(otra => {
                    if (otra.mascotaId === mascota.id && otra.id !== s.id && otra.estado === 'Pendiente') {
                        otra.estado = 'Rechazada';
                    }
                });
                guardar('mascotas', mascotas);
            } else {
                s.estado = 'Rechazada';
            }
            guardar('solicitudes', solicitudes);
        }

        if (accion === 'eliminar') {
            const mascota = mascotas.find(m => m.id === id && m.publicadoPor === usuario.email);
            if (!mascota) return;
            if (!confirm(`¿Eliminar a ${mascota.nombre}? Esta acción no se puede deshacer.`)) return;
            guardar('mascotas', mascotas.filter(m => m.id !== id));
            solicitudes.forEach(s => {
                if (s.mascotaId === id && s.estado === 'Pendiente') s.estado = 'Cancelada';
            });
            guardar('solicitudes', solicitudes);
        }

        dibujar();   // volvemos a pintar para ver los cambios
    });

    dibujar();
}


// ---------------------------------------------------------------------
// 9. REGISTRO DE USUARIOS (registro.html)
// ---------------------------------------------------------------------
function iniciarRegistro() {
    const form = document.querySelector('body.auth-body form');
    if (!form || !document.title.includes('Registro')) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const inputs = form.querySelectorAll('input');
        const username = inputs[0].value.trim();
        const email = inputs[1].value.trim().toLowerCase();   // siempre en minúsculas
        const password = inputs[2].value;

        if (password.length < 6) {
            alert('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        const usuarios = leer('usuarios', []);
        if (usuarios.some(u => u.email.toLowerCase() === email)) {
            alert('¡Ese correo electrónico ya está registrado!');
            return;
        }

        usuarios.push({ username, email, password });
        if (guardar('usuarios', usuarios)) {
            alert('¡Registro exitoso! Ahora puedes iniciar sesión.');
            window.location.href = 'login.html';
        }
    });
}


// ---------------------------------------------------------------------
// 10. INICIO DE SESIÓN (login.html)
// ---------------------------------------------------------------------
function iniciarLogin() {
    const form = document.querySelector('body.auth-body form');
    if (!form || !document.title.includes('Iniciar Sesión')) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const inputs = form.querySelectorAll('input');
        const email = inputs[0].value.trim().toLowerCase();
        const password = inputs[1].value;

        const usuarios = leer('usuarios', []);
        const usuario = usuarios.find(u => u.email.toLowerCase() === email && u.password === password);

        if (!usuario) {
            alert('Correo o contraseña incorrectos.');
            return;
        }

        // Guardamos la sesión SIN la contraseña
        guardar('usuarioLogueado', { username: usuario.username, email: email });
        alert(`¡Bienvenido de nuevo, ${usuario.username}! 🐾`);

        // Si venía de otra página (por ejemplo "Solicitar adopción"), lo devolvemos ahí
        const destino = sessionStorage.getItem('volverA');
        sessionStorage.removeItem('volverA');
        const destinoValido = destino && /^[\w-]+\.html(\?[\w=&%.-]*)?$/.test(destino);
        window.location.href = destinoValido ? destino : 'index.html';
    });
}