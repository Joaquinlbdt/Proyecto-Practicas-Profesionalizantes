// Carga solita los estilos de los filtros y las notificaciones (archivo estilos-nuevos.css),
// así no hace falta pegarlos a mano dentro de style.css.
(function cargarEstilosNuevos() {
    if (!document.head || document.querySelector('link[href="estilos-nuevos.css"]')) return;
    const enlace = document.createElement('link');
    enlace.rel = 'stylesheet';
    enlace.href = 'estilos-nuevos.css';
    document.head.appendChild(enlace);
})();

let usuarioActual = null;

async function guardarEnBase(accion, metodo = 'GET', datos = null, extra = '') {
    const opciones = { method: metodo, credentials: 'same-origin', headers: {} };
    if (datos !== null) {
        opciones.headers['Content-Type'] = 'application/json';
        opciones.body = JSON.stringify(datos);
    }

    let respuesta;
    try {
        respuesta = await fetch(`guardar.php?accion=${encodeURIComponent(accion)}${extra}`, opciones);
    } catch (error) {
        throw new Error('No se pudo conectar con XAMPP. Iniciá Apache y MySQL y abrí el sitio desde localhost.');
    }

    let resultado;
    try {
        resultado = await respuesta.json();
    } catch (error) {
        throw new Error('El servidor no respondió correctamente. Revisá la configuración de PHP en XAMPP.');
    }
    if (!respuesta.ok) throw new Error(resultado.error || 'No se pudieron guardar los datos.');
    return resultado;
}

function mostrarError(error) {
    alert(error instanceof Error ? error.message : 'Ocurrió un error inesperado.');
}

function escaparHTML(texto) {
    return String(texto ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function obtenerUsuario() {
    return usuarioActual;
}

function telefonoValido(telefono) {
    return /^[\d\s+()-]{8,20}$/.test(telefono);
}

function exigirLogin(mensaje) {
    if (obtenerUsuario()) return true;
    alert(mensaje);
    sessionStorage.setItem('volverA', window.location.pathname.split('/').pop() + window.location.search);
    window.location.href = 'login.html';
    return false;
}

function exigirTelefono(mensaje) {
    if (usuarioActual && usuarioActual.telefono) return true;
    alert(mensaje);
    sessionStorage.setItem('volverA', window.location.pathname.split('/').pop() + window.location.search);
    window.location.href = 'perfil.html';
    return false;
}

function formatearFecha(fecha) {
    return new Date(fecha.replace(' ', 'T')).toLocaleDateString('es-AR');
}

function htmlContacto(email, telefono) {
    return `<div class="contacto-box"><p>📧 ${escaparHTML(email || 'no cargado')}</p><p>📞 ${escaparHTML(telefono || 'no cargado')}</p></div>`;
}

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
                const contexto = canvas.getContext('2d');
                if (!contexto) {
                    reject(new Error('No se pudo procesar la imagen.'));
                    return;
                }
                contexto.drawImage(imagen, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            imagen.src = lector.result;
        };
        lector.readAsDataURL(archivo);
    });
}

// Footer: los mini apartados se comportan como acordeón (al abrir uno, se cierran los demás)
document.addEventListener('DOMContentLoaded', () => {
    const minis = document.querySelectorAll('.footer-miau details.mini');
    minis.forEach(d => d.addEventListener('toggle', () => {
        if (d.open) minis.forEach(otro => { if (otro !== d) otro.open = false; });
    }));
});

document.addEventListener('DOMContentLoaded', async () => {
    try {
        usuarioActual = (await guardarEnBase('sesion')).usuario;
        actualizarCabeceraUsuario();
        agregarEnlacesNav();
        activarBuscador();
        await Promise.all([
            iniciarCatalogo(),
            iniciarDetalle(),
            iniciarPublicar(),
            iniciarPerfil(),
            iniciarTestimonios(),
            iniciarRegistro(),
            iniciarLogin(),
            iniciarContacto()
        ]);
    } catch (error) {
        console.error(error);
        mostrarError(error);
    }
});

function actualizarCabeceraUsuario() {
    const usuario = obtenerUsuario();
    const cabecera = document.querySelector('.header-right');
    if (!usuario || !cabecera) return;

    cabecera.innerHTML = '';
    const saludo = document.createElement('a');
    saludo.href = 'perfil.html';
    saludo.className = 'saludo-usuario';
    saludo.textContent = '👋 Hola, ' + usuario.username;

    const salir = document.createElement('button');
    salir.className = 'btn btn-secondary';
    salir.textContent = 'Cerrar sesión';
    salir.addEventListener('click', async () => {
        try {
            await guardarEnBase('salir', 'POST', {});
            window.location.href = 'index.html';
        } catch (error) {
            mostrarError(error);
        }
    });
    // Campana de notificaciones, al lado del saludo
    const campana = crearCampanaNotificaciones();
    cabecera.append(saludo, campana, salir);
    iniciarNotificaciones(campana);
}

// ---------------------------------------------------------------------
// NOTIFICACIONES: campana con contador y panel desplegable
//   - Se actualiza sola cada 15 segundos (mientras la pestaña esté a la vista).
//   - Avisa cuando se publica una mascota, cuando alguien solicita adoptar
//     una de tus mascotas y cuando responden a tu solicitud.
// ---------------------------------------------------------------------
let temporizadorNotificaciones = null;

const ICONOS_NOTIFICACION = {
    mascota_publicada: '🐶',
    solicitud_recibida: '💌',
    solicitud_aceptada: '🎉',
    solicitud_rechazada: '😿'
};

function crearCampanaNotificaciones() {
    const caja = document.createElement('div');
    caja.className = 'notif-wrap';
    caja.innerHTML = `
        <button type="button" class="notif-btn" aria-label="Notificaciones" aria-expanded="false">
            🔔<span class="notif-badge" hidden>0</span>
        </button>
        <div class="notif-panel" hidden>
            <div class="notif-cabecera">
                <strong>Notificaciones</strong>
                <button type="button" class="notif-marcar-todas">Marcar todas como leídas</button>
            </div>
            <div class="notif-lista"></div>
        </div>`;
    return caja;
}

function iniciarNotificaciones(caja) {
    const boton = caja.querySelector('.notif-btn');
    const insignia = caja.querySelector('.notif-badge');
    const panel = caja.querySelector('.notif-panel');
    const lista = caja.querySelector('.notif-lista');
    const marcarTodas = caja.querySelector('.notif-marcar-todas');
    let cantidadAnterior = null;

    function formatearHora(fecha) {
        return new Date(fecha.replace(' ', 'T')).toLocaleString('es-AR', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        });
    }

    function dibujar(datos) {
        // Contador rojo sobre la campana
        insignia.textContent = datos.noLeidas > 9 ? '9+' : String(datos.noLeidas);
        insignia.hidden = datos.noLeidas === 0;

        // Si llegó una notificación nueva, la campana se sacude
        if (cantidadAnterior !== null && datos.noLeidas > cantidadAnterior) {
            boton.classList.add('notif-sacude');
            setTimeout(() => boton.classList.remove('notif-sacude'), 700);
        }
        cantidadAnterior = datos.noLeidas;

        // Solo se muestran las que NO están leídas: al leerlas desaparecen del panel
        const pendientes = datos.notificaciones.filter(n => !n.leida);
        marcarTodas.hidden = pendientes.length === 0;
        if (!pendientes.length) {
            lista.innerHTML = '<p class="notif-vacia">No tenés notificaciones nuevas 🐾</p>';
            return;
        }
        lista.innerHTML = pendientes.map(n => `
            <button type="button" class="notif-item ${n.leida ? '' : 'notif-nueva'}"
                    data-id="${n.id}" data-tipo="${escaparHTML(n.tipo)}" data-mascota="${n.mascotaId ?? ''}">
                <span class="notif-icono">${ICONOS_NOTIFICACION[n.tipo] || '🔔'}</span>
                <span class="notif-texto">${escaparHTML(n.mensaje)}<small>${formatearHora(n.fecha)}</small></span>
            </button>`).join('');
    }

    async function cargar() {
        try {
            dibujar(await guardarEnBase('notificaciones'));
        } catch (error) {
            // Sin alert: si falla, no queremos molestar al usuario cada 15 segundos
            console.warn('No se pudieron cargar las notificaciones:', error.message);
        }
    }

    // Abrir y cerrar el panel
    boton.addEventListener('click', e => {
        e.stopPropagation();
        panel.hidden = !panel.hidden;
        boton.setAttribute('aria-expanded', String(!panel.hidden));
        if (!panel.hidden) cargar();
    });
    document.addEventListener('click', e => {
        if (!caja.contains(e.target)) {
            panel.hidden = true;
            boton.setAttribute('aria-expanded', 'false');
        }
    });

    // Tocar una notificación: la marca como leída y te lleva a donde corresponde
    lista.addEventListener('click', async e => {
        const item = e.target.closest('.notif-item');
        if (!item) return;
        try {
            await guardarEnBase('notificaciones-leer', 'POST', { id: Number(item.dataset.id) });
        } catch (error) {
            console.warn(error.message);
        }
        if (item.dataset.tipo === 'mascota_publicada') {
            if (item.dataset.mascota) {
                window.location.href = 'mascota.html?id=' + item.dataset.mascota;
            } else {
                cargar();   // la mascota ya no existe
            }
        } else {
            window.location.href = 'perfil.html';
        }
    });

    marcarTodas.addEventListener('click', async () => {
        // Las hacemos desaparecer enseguida, sin esperar al servidor
        dibujar({ notificaciones: [], noLeidas: 0 });
        try {
            await guardarEnBase('notificaciones-leer', 'POST', {});
        } catch (error) {
            console.warn(error.message);
        }
        cargar();
    });

    cargar();
    clearInterval(temporizadorNotificaciones);   // evita temporizadores duplicados
    temporizadorNotificaciones = setInterval(() => {
        if (!document.hidden) cargar();
    }, 15000);
}

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
        if (window.location.pathname.endsWith(enlace.href)) a.classList.add('active');
        nav.appendChild(a);
    });
}

function activarBuscador() {
    const input = document.querySelector('.search-box input');
    const boton = document.querySelector('.search-btn');
    if (!input || document.querySelector('.pets-grid')) return;
    const buscar = () => {
        const texto = input.value.trim();
        window.location.href = 'index.html' + (texto ? '?buscar=' + encodeURIComponent(texto) : '');
    };
    boton?.addEventListener('click', buscar);
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') buscar();
    });
}

// Convierte textos como "6 meses", "1 año" o "2 años" en cantidad de meses.
// Devuelve null si no entiende el texto.
function edadEnMeses(texto) {
    const coincidencia = String(texto).toLowerCase().match(/(\d+(?:[.,]\d+)?)\s*(d[ií]as?|semanas?|mes(?:es)?|a[nñ]os?)/);
    if (!coincidencia) return null;
    const numero = parseFloat(coincidencia[1].replace(',', '.'));
    const unidad = coincidencia[2];
    if (unidad.startsWith('d')) return numero / 30;    // días
    if (unidad.startsWith('s')) return numero / 4.3;   // semanas
    if (unidad.startsWith('m')) return numero;         // meses
    return numero * 12;                                 // años
}

// Rangos de edad del filtro (en meses)
const RANGOS_EDAD = {
    cachorro: { texto: 'Cachorro (menos de 1 año)', min: 0, max: 12 },
    joven: { texto: 'Joven (1 a 2 años)', min: 12, max: 36 },
    adulto: { texto: 'Adulto (3 a 7 años)', min: 36, max: 96 },
    senior: { texto: 'Senior (8 años o más)', min: 96, max: Infinity }
};

async function iniciarCatalogo() {
    const grid = document.querySelector('.pets-grid');
    if (!grid) return;
    const mascotas = (await guardarEnBase('mascotas')).mascotas;
    const input = document.querySelector('.search-box input');
    const boton = document.querySelector('.search-btn');

    function dibujar(lista) {
        grid.innerHTML = '';
        if (!lista.length) {
            grid.innerHTML = '<p class="sin-resultados">No se encontraron mascotas que coincidan.</p>';
            return;
        }
        lista.forEach(mascota => {
            const adoptada = mascota.estado === 'Adoptada';
            const tarjeta = document.createElement('a');
            tarjeta.href = 'mascota.html?id=' + mascota.id;
            tarjeta.className = 'pet-card' + (adoptada ? ' adoptada' : '');
            tarjeta.innerHTML = `
                <img src="${escaparHTML(mascota.img)}" alt="${escaparHTML(mascota.nombre)}">
                <h3>${escaparHTML(mascota.nombre)}</h3>
                <p>${escaparHTML(mascota.edadysexo)}</p>
                <span class="etiqueta ${adoptada ? 'etiqueta-adoptada' : 'etiqueta-disponible'}">${adoptada ? 'Adoptada' : 'Disponible'}</span>
                <span class="btn-ver">Ver más</span>`;
            grid.appendChild(tarjeta);
        });
    }

    // ----- Barra de filtros (se crea acá y se coloca arriba de las tarjetas) -----
    const barra = document.createElement('div');
    barra.className = 'filtros-barra';
    barra.innerHTML = `
        <div class="filtro">
            <label for="filtro-especie">Especie</label>
            <select id="filtro-especie">
                <option value="">Todas</option>
                <option value="perro">Perro</option>
                <option value="gato">Gato</option>
                <option value="otro">Otro</option>
            </select>
        </div>
        <div class="filtro">
            <label for="filtro-sexo">Sexo</label>
            <select id="filtro-sexo">
                <option value="">Todos</option>
                <option value="hembra">Hembra</option>
                <option value="macho">Macho</option>
            </select>
        </div>
        <div class="filtro">
            <label for="filtro-edad">Edad</label>
            <select id="filtro-edad">
                <option value="">Todas</option>
                ${Object.entries(RANGOS_EDAD).map(([clave, rango]) => `<option value="${clave}">${rango.texto}</option>`).join('')}
            </select>
        </div>
        <button type="button" id="filtro-limpiar" class="filtro-limpiar">Limpiar filtros</button>
        <p id="filtro-resultados" class="filtro-resultados"></p>`;
    grid.parentNode.insertBefore(barra, grid);

    const filtroEspecie = document.getElementById('filtro-especie');
    const filtroSexo = document.getElementById('filtro-sexo');
    const filtroEdad = document.getElementById('filtro-edad');
    const resumen = document.getElementById('filtro-resultados');

    // Una mascota se muestra solo si cumple TODOS los filtros elegidos
    const filtrar = () => {
        const texto = input ? input.value.toLowerCase().trim() : '';
        const resultado = mascotas.filter(m => {
            const coincideTexto = !texto ||
                m.nombre.toLowerCase().includes(texto) ||
                m.edadysexo.toLowerCase().includes(texto) ||
                m.especie.toLowerCase().includes(texto);
            const coincideEspecie = !filtroEspecie.value || m.especie.toLowerCase() === filtroEspecie.value;
            const coincideSexo = !filtroSexo.value || String(m.sexo).toLowerCase() === filtroSexo.value;
            let coincideEdad = true;
            if (filtroEdad.value) {
                const meses = edadEnMeses(m.edad);
                const rango = RANGOS_EDAD[filtroEdad.value];
                coincideEdad = meses !== null && meses >= rango.min && meses < rango.max;
            }
            return coincideTexto && coincideEspecie && coincideSexo && coincideEdad;
        });
        resumen.textContent = `Mostrando ${resultado.length} de ${mascotas.length} mascotas`;
        dibujar(resultado);
    };

    const busqueda = new URLSearchParams(window.location.search).get('buscar');
    if (busqueda && input) input.value = busqueda;
    input?.addEventListener('input', filtrar);
    boton?.addEventListener('click', filtrar);
    [filtroEspecie, filtroSexo, filtroEdad].forEach(filtro => filtro.addEventListener('change', filtrar));
    document.getElementById('filtro-limpiar').addEventListener('click', () => {
        filtroEspecie.value = '';
        filtroSexo.value = '';
        filtroEdad.value = '';
        if (input) input.value = '';
        filtrar();
    });
    filtrar();
}

async function iniciarDetalle() {
    const contenedor = document.getElementById('detalle-mascota');
    if (!contenedor) return;
    const id = Number(new URLSearchParams(window.location.search).get('id'));
    const { mascota } = await guardarEnBase('mascotas', 'GET', null, '&id=' + encodeURIComponent(id));
    if (!mascota) {
        contenedor.innerHTML = '<p class="sin-resultados">No encontramos esta mascota. <a href="index.html">Volver al catálogo</a></p>';
        return;
    }

    const usuario = obtenerUsuario();
    const solicitudes = usuario ? (await guardarEnBase('solicitudes')).solicitudes : [];
    const esMia = usuario && Number(mascota.publicadoPorId) === usuario.id;
    const yaSolicitada = usuario && solicitudes.some(s =>
        s.mascotaId === mascota.id && s.solicitanteId === usuario.id &&
        ['Pendiente', 'Aceptada'].includes(s.estado)
    );
    const adoptada = mascota.estado === 'Adoptada';
    let texto = '🐾 Solicitar adopción';
    let deshabilitado = false;
    if (adoptada) {
        texto = 'Esta mascota ya fue adoptada';
        deshabilitado = true;
    } else if (esMia) {
        texto = 'Es una mascota que publicaste vos';
        deshabilitado = true;
    } else if (yaSolicitada) {
        texto = 'Ya enviaste una solicitud';
        deshabilitado = true;
    } else if (!usuario) {
        texto = 'Iniciar sesión para adoptar';
    }

    contenedor.innerHTML = `
        <div class="detalle-card">
            <div class="detalle-foto"><img src="${escaparHTML(mascota.img)}" alt="${escaparHTML(mascota.nombre)}"></div>
            <div class="detalle-info">
                <h1>${escaparHTML(mascota.nombre)}</h1>
                <span class="etiqueta ${adoptada ? 'etiqueta-adoptada' : 'etiqueta-disponible'}">${adoptada ? 'Adoptada' : 'Disponible'}</span>
                <ul class="detalle-datos">
                    <li><strong>Especie:</strong> ${escaparHTML(mascota.especie)}</li>
                    <li><strong>Edad y sexo:</strong> ${escaparHTML(mascota.edadysexo)}</li>
                    <li><strong>Tamaño:</strong> ${escaparHTML(mascota.tamano)}</li>
                    <li><strong>Vacunas al día:</strong> ${mascota.vacunado ? 'Sí' : 'No'}</li>
                    <li><strong>Castrado/a:</strong> ${mascota.castrado ? 'Sí' : 'No'}</li>
                </ul>
                <h3>Sobre ${escaparHTML(mascota.nombre)}</h3>
                <p>${escaparHTML(mascota.descripcion)}</p>
                <p class="publicado-por">Publicada por: <strong>${escaparHTML(mascota.publicadoPorNombre || 'Adopciones MIAU')}</strong></p>
                <button id="btn-solicitar" class="btn-adoptar" ${deshabilitado ? 'disabled' : ''}>${texto}</button>
                ${yaSolicitada ? '<p class="publicado-por"><a href="perfil.html">Ver el estado de mi solicitud</a></p>' : ''}
            </div>
        </div>`;

    document.getElementById('btn-solicitar').addEventListener('click', () => {
        if (!exigirLogin('Tenés que iniciar sesión para solicitar una adopción.')) return;
        if (!exigirTelefono('Cargá tu teléfono en tu perfil antes de solicitar una adopción.')) return;
        const seccion = document.getElementById('seccion-solicitud');
        seccion.hidden = false;
        seccion.scrollIntoView({ behavior: 'smooth' });
    });

    document.getElementById('form-solicitud').addEventListener('submit', async e => {
        e.preventDefault();
        const boton = e.currentTarget.querySelector('button[type="submit"]');
        boton.disabled = true;
        try {
            await guardarEnBase('solicitudes', 'POST', {
                mascotaId: mascota.id,
                mensaje: document.getElementById('mensaje').value.trim()
            });
            alert('¡Solicitud enviada! Podés ver su estado en tu perfil. 🐾');
            window.location.href = 'perfil.html';
        } catch (error) {
            mostrarError(error);
            boton.disabled = false;
        }
    });
}

async function iniciarPublicar() {
    const form = document.getElementById('form-publicar');
    if (!form) return;
    if (!exigirLogin('Tenés que iniciar sesión para publicar una mascota.')) return;
    if (!exigirTelefono('Cargá tu teléfono en tu perfil antes de publicar.')) return;

    const archivoInput = document.getElementById('img-archivo');
    const urlInput = document.getElementById('img-url');
    const vista = document.getElementById('vista-previa');
    const boton = document.getElementById('btn-publicar');
    archivoInput.addEventListener('change', () => {
        if (archivoInput.files[0]) {
            vista.src = URL.createObjectURL(archivoInput.files[0]);
            vista.hidden = false;
        }
    });
    urlInput.addEventListener('input', () => {
        if (/^https?:\/\//i.test(urlInput.value.trim())) {
            vista.src = urlInput.value.trim();
            vista.hidden = false;
        }
    });
    vista.addEventListener('error', () => { vista.hidden = true; });

    form.addEventListener('submit', async e => {
        e.preventDefault();
        boton.disabled = true;
        try {
            if (edadEnMeses(document.getElementById('edad').value) === null) {
                throw new Error('Escribí la edad con número y unidad. Por ejemplo: 6 meses o 2 años.');
            }
            const archivo = archivoInput.files[0];
            let foto = urlInput.value.trim();
            if (archivo) {
                if (!archivo.type.startsWith('image/') || archivo.size > 5 * 1024 * 1024) {
                    throw new Error('Elegí una imagen válida de hasta 5 MB.');
                }
                foto = await comprimirImagen(archivo);
            } else if (!/^https?:\/\//i.test(foto)) {
                throw new Error('Subí una foto o ingresá un enlace que empiece con http:// o https://.');
            }
            const resultado = await guardarEnBase('mascotas', 'POST', {
                nombre: document.getElementById('nombre').value.trim(),
                especie: document.getElementById('especie').value,
                edad: document.getElementById('edad').value.trim(),
                sexo: document.getElementById('sexo').value,
                tamano: document.getElementById('tamano').value,
                descripcion: document.getElementById('descripcion').value.trim(),
                vacunado: document.getElementById('vacunado').checked,
                castrado: document.getElementById('castrado').checked,
                foto
            });
            window.location.href = 'mascota.html?id=' + resultado.id;
        } catch (error) {
            mostrarError(error);
            boton.disabled = false;
        }
    });
}

async function iniciarPerfil() {
    const perfil = document.getElementById('perfil');
    if (!perfil) return;
    if (!exigirLogin('Tenés que iniciar sesión para ver tu perfil.')) return;
    let usuario = obtenerUsuario();
    let [mascotas, solicitudes] = await Promise.all([
        guardarEnBase('mascotas'),
        guardarEnBase('solicitudes')
    ]);
    mascotas = mascotas.mascotas;
    solicitudes = solicitudes.solicitudes;
    const aviso = document.getElementById('aviso-telefono');

    function mostrarDatos() {
        document.getElementById('perfil-nombre').textContent = usuario.username;
        document.getElementById('perfil-email').textContent = usuario.email;
        document.getElementById('dato-username').value = usuario.username;
        document.getElementById('dato-email').value = usuario.email;
        document.getElementById('dato-telefono').value = usuario.telefono;
        aviso.hidden = Boolean(usuario.telefono);
    }

    function tarjetaEnviada(s) {
        const mascota = mascotas.find(m => m.id === s.mascotaId);
        const foto = mascota ? `<img src="${escaparHTML(mascota.img)}" alt="${escaparHTML(s.mascotaNombre)}">` : '<div class="sin-foto">🐾</div>';
        const ver = mascota ? `<a class="btn-mini btn-link" href="mascota.html?id=${mascota.id}">Ver mascota</a>` : '';
        const cancelar = s.estado === 'Pendiente' ? `<button class="btn-mini btn-peligro" data-accion="cancelar" data-id="${s.id}">Cancelar solicitud</button>` : '';
        let mensaje = s.estado === 'Pendiente' ? '<p>Esperando respuesta de quien publicó la mascota.</p>' : '';
        if (s.estado === 'Aceptada') {
            mensaje = '<p>¡Aceptaron tu solicitud! Datos de contacto:</p>' + htmlContacto(s.publicadorEmail, s.publicadorTelefono);
        }
        return `<div class="item-perfil">${foto}<div class="item-info"><h4>${escaparHTML(s.mascotaNombre)}</h4><p>Enviada el ${formatearFecha(s.fecha)}</p>${mensaje}<span class="estado estado-${s.estado.toLowerCase()}">${escaparHTML(s.estado)}</span></div><div class="item-acciones">${ver}${cancelar}</div></div>`;
    }

    function tarjetaRecibida(s) {
        let contacto = s.estado === 'Pendiente' ? '<p>Los datos de contacto se muestran cuando aceptás la solicitud.</p>' : '';
        if (s.estado === 'Aceptada') contacto = '<p>Datos de contacto:</p>' + htmlContacto(s.solicitanteEmail, s.solicitanteTelefono);
        const botones = s.estado === 'Pendiente'
            ? `<button class="btn-mini btn-ok" data-accion="aceptar" data-id="${s.id}">Aceptar</button> <button class="btn-mini btn-peligro" data-accion="rechazar" data-id="${s.id}">Rechazar</button>`
            : '';
        return `<div class="item-perfil"><div class="item-info"><h4>${escaparHTML(s.solicitanteNombre)} quiere adoptar a ${escaparHTML(s.mascotaNombre)}</h4><p class="mensaje-solicitud">"${escaparHTML(s.mensaje)}"</p>${contacto}<p>Recibida el ${formatearFecha(s.fecha)}</p><span class="estado estado-${s.estado.toLowerCase()}">${escaparHTML(s.estado)}</span></div><div class="item-acciones">${botones}</div></div>`;
    }

    function tarjetaPublicada(m) {
        const adoptada = m.estado === 'Adoptada';
        return `<div class="item-perfil"><img src="${escaparHTML(m.img)}" alt="${escaparHTML(m.nombre)}"><div class="item-info"><h4>${escaparHTML(m.nombre)}</h4><p>${escaparHTML(m.edadysexo)}</p><span class="etiqueta ${adoptada ? 'etiqueta-adoptada' : 'etiqueta-disponible'}">${adoptada ? 'Adoptada' : 'Disponible'}</span></div><div class="item-acciones"><a class="btn-mini btn-link" href="mascota.html?id=${m.id}">Ver</a> <button class="btn-mini btn-peligro" data-accion="eliminar" data-id="${m.id}">Eliminar</button></div></div>`;
    }

    function pintar(destino, tarjetas, vacio) {
        document.getElementById(destino).innerHTML = tarjetas.length ? tarjetas.join('') : `<p class="vacio">${vacio}</p>`;
    }

    function dibujar() {
        const propias = mascotas.filter(m => m.publicadoPorId === usuario.id);
        pintar('mis-solicitudes', solicitudes.filter(s => s.solicitanteId === usuario.id).map(tarjetaEnviada),
            'Todavía no enviaste solicitudes. <a href="index.html">Mirá las mascotas disponibles</a>.');
        pintar('solicitudes-recibidas', solicitudes.filter(s => s.publicadorId === usuario.id).map(tarjetaRecibida),
            'Todavía no recibiste solicitudes por tus mascotas.');
        pintar('mis-publicaciones', propias.map(tarjetaPublicada),
            'No publicaste ninguna mascota. <a href="publicar.html">Publicá la primera</a>.');
    }

    document.getElementById('form-datos').addEventListener('submit', async e => {
        e.preventDefault();
        const nombre = document.getElementById('dato-username').value.trim();
        const telefono = document.getElementById('dato-telefono').value.trim();
        const passwordNueva = document.getElementById('dato-pass-nueva').value;
        if (!nombre || !telefonoValido(telefono)) {
            alert('Ingresá un nombre y un teléfono válido.');
            return;
        }
        const faltabaTelefono = !usuario.telefono;
        const boton = e.currentTarget.querySelector('button[type="submit"]');
        boton.disabled = true;
        try {
            const resultado = await guardarEnBase('perfil', 'POST', {
                username: nombre,
                telefono,
                passwordActual: document.getElementById('dato-pass-actual').value,
                passwordNueva
            });
            usuario = resultado.usuario;
            usuarioActual = usuario;
            document.getElementById('dato-pass-actual').value = '';
            document.getElementById('dato-pass-nueva').value = '';
            mostrarDatos();
            actualizarCabeceraUsuario();
            alert('¡Datos actualizados!');
            const destino = sessionStorage.getItem('volverA');
            if (faltabaTelefono && destino && /^[\w-]+\.html(\?[\w=&%.-]*)?$/.test(destino)) {
                sessionStorage.removeItem('volverA');
                window.location.href = destino;
            }
        } catch (error) {
            mostrarError(error);
        } finally {
            boton.disabled = false;
        }
    });

    perfil.addEventListener('click', async e => {
        const boton = e.target.closest('button[data-accion]');
        if (!boton) return;
        const accion = boton.dataset.accion;
        const id = Number(boton.dataset.id);
        let peticion;
        if (accion === 'eliminar') {
            const mascota = mascotas.find(m => m.id === id);
            if (!mascota || !confirm(`¿Eliminar a ${mascota.nombre}? Esta acción no se puede deshacer.`)) return;
        } else if (accion === 'cancelar') {
            if (!confirm('¿Querés cancelar esta solicitud?')) return;
            peticion = { id, operacion: accion };
        } else if (accion === 'aceptar' || accion === 'rechazar') {
            const solicitud = solicitudes.find(s => s.id === id);
            const mascota = solicitud && mascotas.find(m => m.id === solicitud.mascotaId);
            if (accion === 'aceptar' && !confirm(`¿Aceptar la adopción de ${mascota?.nombre || ''}? Se rechazarán las demás solicitudes.`)) return;
            peticion = { id, operacion: accion };
        } else {
            return;
        }
        boton.disabled = true;
        try {
            await guardarEnBase(accion === 'eliminar' ? 'eliminar-mascota' : 'accion-solicitud', 'POST',
                accion === 'eliminar' ? { id } : peticion);
            const resultado = await Promise.all([guardarEnBase('mascotas'), guardarEnBase('solicitudes')]);
            mascotas = resultado[0].mascotas;
            solicitudes = resultado[1].solicitudes;
            dibujar();
        } catch (error) {
            mostrarError(error);
            boton.disabled = false;
        }
    });

    mostrarDatos();
    dibujar();
}

async function iniciarTestimonios() {
    const lista = document.getElementById('lista-testimonios');
    const form = document.getElementById('form-testimonio');
    if (!lista || !form) return;
    const inputFoto = document.getElementById('testimonio-foto');
    const botonAdjuntar = document.getElementById('btn-adjuntar');
    const botonEnviar = document.getElementById('btn-enviar-testimonio');
    const vista = document.getElementById('testimonio-vista-previa');

    async function dibujar() {
        const testimonios = (await guardarEnBase('testimonios')).testimonios;
        if (!testimonios.length) {
            lista.innerHTML = '<p class="vacio">Todavía no hay testimonios. ¡Sé el primero en compartir el tuyo! 🐾</p>';
            return;
        }
        lista.innerHTML = testimonios.map(t => `
            <div class="testimonial-card">
                ${t.img ? `<img src="${escaparHTML(t.img)}" alt="${escaparHTML(t.mascotaNombre)}">` : '<div class="sin-foto">🐾</div>'}
                <div class="testimonial-info">
                    <h4>${escaparHTML(t.mascotaNombre)}</h4><p class="testimonial-texto">${escaparHTML(t.texto)}</p>
                    <p class="testimonial-pie">Por ${escaparHTML(t.autorNombre)} · ${formatearFecha(t.fecha)}
                    ${t.esAutor ? `<button class="btn-mini btn-peligro" data-accion="eliminar-testimonio" data-id="${t.id}">Eliminar</button>` : ''}</p>
                </div>
            </div>`).join('');
    }

    botonAdjuntar.addEventListener('click', () => inputFoto.click());
    inputFoto.addEventListener('change', () => {
        if (!inputFoto.files[0]) return;
        vista.src = URL.createObjectURL(inputFoto.files[0]);
        vista.hidden = false;
        botonAdjuntar.textContent = 'Foto lista ✅ (cambiar)';
    });
    form.addEventListener('submit', async e => {
        e.preventDefault();
        if (!exigirLogin('Tenés que iniciar sesión para compartir tu testimonio.')) return;
        botonEnviar.disabled = true;
        try {
            const archivo = inputFoto.files[0];
            if (archivo && (!archivo.type.startsWith('image/') || archivo.size > 5 * 1024 * 1024)) {
                throw new Error('Elegí una imagen válida de hasta 5 MB.');
            }
            const foto = archivo ? await comprimirImagen(archivo, 600) : '';
            await guardarEnBase('testimonios', 'POST', {
                mascotaNombre: document.getElementById('testimonio-nombre').value.trim(),
                texto: document.getElementById('testimonio-texto').value.trim(),
                foto
            });
            form.reset();
            vista.hidden = true;
            botonAdjuntar.textContent = 'Adjunta foto 📷';
            await dibujar();
            alert('¡Gracias por compartir tu testimonio! 💜');
        } catch (error) {
            mostrarError(error);
        } finally {
            botonEnviar.disabled = false;
        }
    });
    lista.addEventListener('click', async e => {
        const boton = e.target.closest('button[data-accion="eliminar-testimonio"]');
        if (!boton || !confirm('¿Querés eliminar tu testimonio?')) return;
        boton.disabled = true;
        try {
            await guardarEnBase('eliminar-testimonio', 'POST', { id: Number(boton.dataset.id) });
            await dibujar();
        } catch (error) {
            mostrarError(error);
            boton.disabled = false;
        }
    });
    await dibujar();
}

async function iniciarRegistro() {
    const form = document.querySelector('body.auth-body form');
    if (!form || !document.title.includes('Registro')) return;
    form.addEventListener('submit', async e => {
        e.preventDefault();
        const telefono = document.getElementById('reg-telefono').value.trim();
        const password = document.getElementById('reg-password').value;
        if (!telefonoValido(telefono) || password.length < 6) {
            alert('Ingresá un teléfono válido y una contraseña de al menos 6 caracteres.');
            return;
        }
        const boton = form.querySelector('button[type="submit"]');
        boton.disabled = true;
        try {
            await guardarEnBase('registro', 'POST', {
                username: document.getElementById('reg-username').value.trim(),
                email: document.getElementById('reg-email').value.trim().toLowerCase(),
                telefono,
                password
            });
            alert('¡Registro exitoso! Ahora puedes iniciar sesión.');
            window.location.href = 'login.html';
        } catch (error) {
            mostrarError(error);
            boton.disabled = false;
        }
    });
}

async function iniciarLogin() {
    const form = document.querySelector('body.auth-body form');
    if (!form || !document.title.includes('Iniciar Sesión')) return;
    form.addEventListener('submit', async e => {
        e.preventDefault();
        const entradas = form.querySelectorAll('input');
        const boton = form.querySelector('button[type="submit"]');
        boton.disabled = true;
        try {
            const resultado = await guardarEnBase('login', 'POST', {
                email: entradas[0].value.trim().toLowerCase(),
                password: entradas[1].value
            });
            usuarioActual = resultado.usuario;
            alert(`¡Bienvenido de nuevo, ${usuarioActual.username}! 🐾`);
            const destino = sessionStorage.getItem('volverA');
            sessionStorage.removeItem('volverA');
            window.location.href = destino && /^[\w-]+\.html(\?[\w=&%.-]*)?$/.test(destino) ? destino : 'index.html';
        } catch (error) {
            mostrarError(error);
            boton.disabled = false;
        }
    });
}

async function iniciarContacto() {
    const form = document.getElementById('form-contacto');
    if (!form) return;
    form.addEventListener('submit', async e => {
        e.preventDefault();
        const boton = form.querySelector('button[type="submit"]');
        boton.disabled = true;
        try {
            await guardarEnBase('contacto', 'POST', {
                nombre: document.getElementById('contacto-nombre').value.trim(),
                correo: document.getElementById('contacto-correo').value.trim(),
                mensaje: document.getElementById('contacto-mensaje').value.trim()
            });
            form.reset();
            alert('Tu mensaje fue guardado. ¡Gracias por contactarnos!');
        } catch (error) {
            mostrarError(error);
        } finally {
            boton.disabled = false;
        }
    });
}