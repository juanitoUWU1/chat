var socket = io.connect('http://3.141.11.195:5000/');
var usuarioNombre = document.getElementById('usuario-nombre'),
    usuarioPassword = document.getElementById('usuario-password'),
    appChat = document.getElementById('app-chat'),
    panelBienvenida = document.getElementById('panel-bienvenida'),
    usuario = document.getElementById('usuario'),
    mensaje = document.getElementById('mensaje'),
    botonEnviar = document.getElementById('enviar'),
    escribiendoMensaje = document.getElementById('escribiendo-mensaje'),
    output = document.getElementById('output'),
    mensajeAlerta = document.getElementById('mensaje-alerta'),
    listaUsuarios = document.getElementById('lista-usuarios');

// Función para mostrar el historial de mensajes
function mostrarHistorial(historial) {
    historial.forEach(function(data) {
        output.innerHTML += '<p><strong>' + data.usuario + ':</strong> ' + data.mensaje + '</p>';
    });
}

// Recibir el historial de mensajes cuando te conectas
socket.on('historial', function(historial) {
    mostrarHistorial(historial); // Mostrar el historial de mensajes en el chat
});


// Función para mostrar mensajes emergentes
function mostrarMensaje(texto, tipo, posicion = 'superior') {
    mensajeAlerta.innerHTML = texto;
    mensajeAlerta.className = 'mensaje ' + tipo + ' ' + posicion;
    mensajeAlerta.style.display = 'block';
    setTimeout(function() {
        mensajeAlerta.style.display = 'none';
    }, 3000);
}

// Función para validar usuario y contraseña
function validarCredenciales() {
    var nombreUsuario = usuarioNombre.value;
    var password = usuarioPassword.value;

    if (nombreUsuario.length > 12) {
        mostrarMensaje("El nombre de usuario debe tener al menos 12 caracteres.", "error", "superior");
        return false;
    }
    if (password.length < 4 || password.length > 10 || !/^\d+$/.test(password)) {
        mostrarMensaje("La contraseña debe tener entre 8 y 10 números.", "error", "superior");
        return false;
    }
    return true;
}

// Función para registrarse como nuevo usuario
function registrarse() {
    if (validarCredenciales()) {
        socket.emit('registrar', {
            nombre: usuarioNombre.value,
            password: usuarioPassword.value
        });
    }
}

// Función para ingresar al chat con autenticación
function ingresarAlChat() {
    if (validarCredenciales()) {
        socket.emit('login', {
            nombre: usuarioNombre.value,
            password: usuarioPassword.value
        });
        // Limpiar las casillas de usuario y contraseña
        usuarioNombre.value = '';
        usuarioPassword.value = '';
    }
}

botonEnviar.addEventListener('click', function() {
    if (mensaje.value) {
        socket.emit('chat', {
            mensaje: mensaje.value,
            usuario: usuario.value
        });
    }
    mensaje.value = '';
});

mensaje.addEventListener('keyup', function() {
    if (usuario.value) {
        socket.emit('typing', {
            nombre: usuario.value,
            texto: mensaje.value
        });
    }
});

// Recibir el historial de mensajes cuando te conectas
socket.on('historial', function(historial) {
    mostrarHistorial(historial); // Mostrar el historial de mensajes en el chat
});

socket.on('chat', function(data) {
    escribiendoMensaje.innerHTML = '';
    output.innerHTML += '<p><strong>' + data.usuario + ':</strong> ' + data.mensaje + '</p>';
});

socket.on('typing', function(data) {
    if (data.texto) {
        escribiendoMensaje.innerHTML = '<p><em>' + data.nombre + ' está escribiendo un mensaje...</em></p>';
    } else {
        escribiendoMensaje.innerHTML = '';
    }
});

// Manejo del resultado del registro
socket.on('registroResult', function(data) {
    if (data.success) {
        mostrarMensaje(data.message, "exito", "superior");
    } else {
        mostrarMensaje(data.message, "error", "superior");
    }
});

// Manejo del resultado del login
socket.on('loginResult', function(data) {
    if (data.success) {
        panelBienvenida.style.display = "none";
        appChat.style.display = "block";
        usuario.value = data.nombre;
        usuario.readOnly = true;
        socket.emit('usuarioConectado', data.nombre); // Emitir que el usuario se ha conectado
    } else {
        mostrarMensaje(data.message, "error", "superior");
    }
});

// Mostrar todos los usuarios en línea
socket.on('actualizarConexiones', function(usuariosEnLinea) {
    listaUsuarios.innerHTML = ""; // Limpiar la lista anterior
    usuariosEnLinea.forEach(function(usuario) {
        var li = document.createElement('li');
        li.textContent = usuario; // Crear un nuevo elemento de lista
        listaUsuarios.appendChild(li); // Agregarlo a la lista
    });
});

// Emitir evento de desconexión al salir
window.addEventListener('beforeunload', function() {
    socket.emit('usuarioDesconectado', usuario.value);
});

// Función para salir del chat y volver al login
function salirDelChat() {
    socket.emit('usuarioDesconectado', usuario.value);
    appChat.style.display = "none";
    panelBienvenida.style.display = "block";
    usuario.value = ''; // Limpiar nombre de usuario
}


