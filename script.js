// --- DATOS INICIALES DE MASCOTAS (SI NO EXISTEN EN LOCALSTORAGE) ---
const mascotasIniciales = [
    { id: 1, nombre: "Caniche", edadysexo: "6 meses - hembra", img: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?q=80&w=400" },
    { id: 2, nombre: "Rucksell Terrier", edadysexo: "8 Meses - macho", img: "https://images.unsplash.com/photo-1517849845537-4d257902454a?q=80&w=400" },
    { id: 3, nombre: "Gato blanco", edadysexo: "1 año - hembra", img: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=400" },
    { id: 4, nombre: "Gato", edadysexo: "10 Meses - macho", img: "https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?q=80&w=400" },
    { id: 5, nombre: "Pequinés", edadysexo: "5 Meses - hembra", img: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=400" },
    { id: 6, nombre: "PUC", edadysexo: "1 año - macho", img: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=400" }
];

document.addEventListener('DOMContentLoaded', () => {
    
    // Inicializar Mascotas en localStorage si es la primera vez
    if (!localStorage.getItem('mascotas')) {
        localStorage.setItem('mascotas', JSON.stringify(mascotasIniciales));
    }

    // Inicializar lista de usuarios si no existe
    if (!localStorage.getItem('usuarios')) {
        localStorage.setItem('usuarios', JSON.stringify([]));
    }

    // Actualizar la cabecera según el usuario autenticado
    actualizarCabeceraUsuario();

    // ----------------------------------------------------
    // 1. RENDERING Y BÚSQUEDA DINÁMICA EN INDEX.HTML
    // ----------------------------------------------------
    const petsGrid = document.querySelector('.pets-grid');
    const searchInput = document.querySelector('.search-box input');

    if (petsGrid) {
        const mascotas = JSON.parse(localStorage.getItem('mascotas')) || [];

        function renderMascotas(lista) {
            petsGrid.innerHTML = '';
            if (lista.length === 0) {
                petsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666; font-size: 1.2rem;">No se encontraron mascotas que coincidan.</p>';
                return;
            }

            lista.forEach(pet => {
                const card = document.createElement('div');
                card.classList.add('pet-card');
                card.innerHTML = `
                    <img src="${pet.img}" alt="${pet.nombre}">
                    <h3>${pet.nombre}</h3>
                    <p>${pet.edadysexo}</p>
                `;
                petsGrid.appendChild(card);
            });
        }

        // Render inicial
        renderMascotas(mascotas);

        // Búsqueda en tiempo real
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase().trim();
                const filtradas = mascotas.filter(m => 
                    m.nombre.toLowerCase().includes(term) || 
                    m.edadysexo.toLowerCase().includes(term)
                );
                renderMascotas(filtradas);
            });
        }
    }

    // ----------------------------------------------------
    // 2. REGISTRO DE USUARIOS
    // ----------------------------------------------------
    const registroForm = document.querySelector('body.auth-body form');
    if (registroForm && document.title.includes('Registro')) {
        registroForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const inputs = registroForm.querySelectorAll('input');
            const username = inputs[0].value.trim();
            const email = inputs[1].value.trim();
            const password = inputs[2].value;

            const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];

            // Verificar si el correo ya existe
            const existe = usuarios.some(u => u.email === email);
            if (existe) {
                alert('¡Ese correo electrónico ya está registrado!');
                return;
            }

            // Guardar usuario
            usuarios.push({ username, email, password });
            localStorage.setItem('usuarios', JSON.stringify(usuarios));

            alert('¡Registro exitoso! Ahora puedes iniciar sesión.');
            window.location.href = 'login.html';
        });
    }

    // ----------------------------------------------------
    // 3. INICIO DE SESIÓN
    // ----------------------------------------------------
    const loginForm = document.querySelector('body.auth-body form');
    if (loginForm && document.title.includes('Iniciar Sesión')) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const inputs = loginForm.querySelectorAll('input');
            const email = inputs[0].value.trim();
            const password = inputs[1].value;

            const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];

            // Validar credenciales
            const usuarioValido = usuarios.find(u => u.email === email && u.password === password);

            if (usuarioValido) {
                localStorage.setItem('usuarioLogueado', JSON.stringify(usuarioValido));
                alert(`¡Bienvenido de nuevo, ${usuarioValido.username}! 🐾`);
                window.location.href = 'index.html';
            } else {
                alert('Correo o contraseña incorrectos.');
            }
        });
    }

});

// ----------------------------------------------------
// FUNCION PARA ACTUALIZAR CABECERA SI SESION ESTA ACTIVA
// ----------------------------------------------------
function actualizarCabeceraUsuario() {
    const usuarioLogueado = JSON.parse(localStorage.getItem('usuarioLogueado'));
    const headerRight = document.querySelector('.header-right');

    if (usuarioLogueado && headerRight) {
        headerRight.innerHTML = `
            <span style="font-weight: bold; color: #6b5b95; font-size: 1.1rem; align-self: center;">
                👋 Hola, ${usuarioLogueado.username}
            </span>
            <button id="logout-btn" class="btn btn-secondary" style="cursor: pointer; border: none;">
                Cerrar sesión
            </button>
        `;

        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('usuarioLogueado');
            alert('Has cerrado sesión.');
            window.location.reload();
        });
    }
}