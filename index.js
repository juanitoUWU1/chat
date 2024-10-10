const express = require('express');
const socket = require('socket.io');
const bcrypt = require('bcrypt'); // Importar bcrypt para cifrar contraseñas
const { MongoClient } = require('mongodb'); // Importar MongoClient

var app = express();
const server = app.listen(5000, function() {
    console.log("Puerto 5000 abierto....");
});

app.use(express.static("public"));

// Conectar a MongoDB Atlas
const uri = 'mongodb+srv://JonassBerdon:050623@jonass.aa8x3.mongodb.net/Jonass_Chat';
let client;
let db;
let chatCollection;
let usersCollection; // Nueva colección de usuarios

async function connectToMongoDB() {
    client = new MongoClient(uri);
    try {
        await client.connect();
        console.log('Conectado a MongoDB Atlas');
        db = client.db('Jonass_Chat'); // Usamos la BD correcta
        chatCollection = db.collection('Chat'); // Accedemos a la colección 'Chat'
        usersCollection = db.collection('Usuarios'); // Accedemos a la colección 'Usuarios'
        
    } catch (error) {
        console.error('Error al conectar a MongoDB', error);
    }
}

connectToMongoDB().catch(console.error);

var io = socket(server);

// Almacenar historial de mensajes en memoria
var historialMensajes = [];

// Almacenar los usuarios conectados
var usuariosEnLinea = [];

io.on('connection', function(socket) {
    console.log('Nueva conexión', socket.id);

    // Enviar historial de mensajes al nuevo usuario conectado
    socket.emit('historial', historialMensajes);

    // Registrar nuevo usuario
    socket.on('registrar', async function(data) {
        const usuarioExistente = await usersCollection.findOne({ nombre: data.nombre });
        if (usuarioExistente) {
            socket.emit('registroResult', { success: false, message: 'El usuario ya existe' });
        } else {
            const hashedPassword = await bcrypt.hash(data.password, 10); // Cifrar la contraseña
            await usersCollection.insertOne({
                nombre: data.nombre,
                password: hashedPassword
            });
            socket.emit('registroResult', { success: true, message: 'Usuario registrado exitosamente' });
        }
    });

    // Iniciar sesión
    socket.on('login', async function(data) {
        const usuario = await usersCollection.findOne({ nombre: data.nombre });
        if (usuario) {
            const match = await bcrypt.compare(data.password, usuario.password);
            if (match) {
                // Contraseña correcta, añadir a usuarios en línea
                usuariosEnLinea.push(data.nombre);
                io.sockets.emit('actualizarConexiones', usuariosEnLinea); // Actualizar lista de usuarios conectados
                socket.emit('loginResult', { success: true, nombre: data.nombre });
            } else {
                // Contraseña incorrecta
                socket.emit('loginResult', { success: false, message: 'Contraseña incorrecta' });
            }
        } else {
            socket.emit('loginResult', { success: false, message: 'Usuario no encontrado' });
        }
    });

    // Escuchar los mensajes de chat y agregar al historial
    socket.on('chat', function(data) {
        historialMensajes.push(data); // Guardar mensaje en el historial local
        chatCollection.insertOne(data); // Guardar mensaje en la base de datos
        io.sockets.emit('chat', data); // Enviar el mensaje a todos los usuarios
    });

    // Escuchar cuando un usuario está escribiendo
    socket.on('typing', function(data) {
        socket.broadcast.emit('typing', data);
    });

    // Escuchar cuando un usuario se desconecta
    socket.on('disconnect', function() {
        usuariosEnLinea = usuariosEnLinea.filter(nombre => nombre !== socket.nombre); // Eliminar usuario de la lista
        io.sockets.emit('actualizarConexiones', usuariosEnLinea); // Actualizar lista de conexiones
        console.log('Usuario desconectado: ' + socket.id);
    });

    // Manejar cuando un usuario se desconecta voluntariamente
    socket.on('usuarioDesconectado', function(nombre) {
        usuariosEnLinea = usuariosEnLinea.filter(u => u !== nombre); // Eliminar usuario de la lista de usuarios en línea
        io.sockets.emit('actualizarConexiones', usuariosEnLinea); // Actualizar la lista de conexiones
    });
});
