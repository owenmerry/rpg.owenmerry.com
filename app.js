// reads in our .env file and makes those values available as environment variables
require('dotenv').config();
 
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const passport = require('passport');
var fs = require('fs')
 
const routes = require('./routes/main');
const secureRoutes = require('./routes/secure');
const passwordRoutes = require('./routes/password');
 
// setup mongo connection
const uri = process.env.MONGO_CONNECTION_URL;
mongoose.connect(uri, { useNewUrlParser : true, useCreateIndex: true });
mongoose.connection.on('error', (error) => {
  console.log(error);
  process.exit(1);
});
mongoose.connection.on('connected', function () {
  console.log('connected to mongo');
});
mongoose.set('useFindAndModify', false);
 
// create an instance of an express app
const app = express();
const server = require('http').createServer(app);
// const server = require('https').createServer({
//   key: fs.readFileSync('key.pem'),
//   cert: fs.readFileSync('cert.pem')
// }, app);
const io = require('socket.io').listen(server);
 
const players = {};
const conversation = {};
const users = {
  online: []
}
 
io.on('connection', function (socket) {

  //connected user
  console.log('a user connected: ', socket.id);
  // create a new player and add it to our players object
  players[socket.id] = {
    flipX: false,
    //x: Math.floor(Math.random() * 400) + 50,
    //y: Math.floor(Math.random() * 500) + 50,
    x: 193,
    y: 396,
    tint: Math.random() * 0xffffff,
    playerId: socket.id,
    videoID: '',
  };

  // update all other players of the new player
  socket.broadcast.emit('newPlayer', players[socket.id]);

  users.online.push(socket.id);
  io.emit('allUsers', users);

  // get current players data
  socket.on('getCurrentPlayers', function () {
    socket.emit('currentPlayers', players);
  });

  // when a player disconnects, remove them from our players object
  socket.on('disconnect', function () {
    console.log('user disconnected: ', socket.id);
    delete players[socket.id];
    // emit a message to all players to remove this player
    io.emit('disconnect', socket.id);

    const index = users.online.indexOf(socket.id);
    if (index > -1) {
      users.online.splice(index, 1);
    }
    io.emit('allUsers', users);
  });
 
  // when a player moves, update the player data
  socket.on('playerMovement', function (movementData) {
    players[socket.id].x = movementData.x;
    players[socket.id].y = movementData.y;
    players[socket.id].flipX = movementData.flipX;
    // emit a message to all players about the player that moved
    socket.broadcast.emit('playerMoved', players[socket.id]);
  });

  //video sockets



});
 
// update express settings
app.use(bodyParser.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
app.use(bodyParser.json()); // parse application/json
app.use(cookieParser());
 
// require passport auth
require('./auth/auth');
 
/*
app.get('/game.html', passport.authenticate('jwt', { session : false }), function (req, res) {
  res.sendFile(__dirname + '/public/game.html');
});
*/
 
app.get('/game.html', function (req, res) {
  res.sendFile(__dirname + '/public/game.html');
});
 
app.use(express.static(__dirname + '/public'));
 
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});
 
// main routes
app.use('/', routes);
app.use('/', passwordRoutes);
app.use('/', passport.authenticate('jwt', { session : false }), secureRoutes);
 
// catch all other routes
app.use((req, res, next) => {
  res.status(404).json({ message: '404 - Not Found' });
});
 
// handle errors
app.use((err, req, res, next) => {
  console.log(err.message);
  res.status(err.status || 500).json({ error: err.message });
});
 
server.listen(process.env.PORT || 8443, () => {
  console.log(`Server started on port ${process.env.PORT || 8443}`);
});