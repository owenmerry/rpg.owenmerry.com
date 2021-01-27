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
  process.exit(1);
});
mongoose.connection.on('connected', function () {
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
const rooms = {};
var roomsNum = 0;

 
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

  //video init
  //setup init conversation   
    conversation[socket.id] = {
      users: {},
  };

  //setup userdata
  users[socket.id] = {
    id: socket.id,
    room: '',
  }



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

    //remove from room
    if(rooms[users[socket.id].room]){
      delete rooms[users[socket.id].room].players[socket.id];
      const indexRoom = rooms[users[socket.id].room].users.indexOf(socket.id);
      if (indexRoom > -1) {
        rooms[users[socket.id].room].users.splice(indexRoom, 1);
      }
    }


    delete players[socket.id];
    // emit a message to all players to remove this player
    io.emit('disconnect', socket.id);

    const index = users.online.indexOf(socket.id);
    if (index > -1) {
      users.online.splice(index, 1);
    }
    delete users[socket.id];
    io.emit('allUsers', users);
    io.emit('removeUser', socket.id);
  });
 
  // when a player moves, update the player data
  socket.on('playerMovement', function (movementData) {

   if(users[socket.id].room === '' || 1 === 1){
      players[socket.id].x = movementData.x;
      players[socket.id].y = movementData.y;
      players[socket.id].flipX = movementData.flipX;

      socket.broadcast.emit('playerMoved', {...players[socket.id],from: 'world'});
    } else {
      if(rooms[users[socket.id].room].players[socket.id]){
        rooms[users[socket.id].room].players[socket.id].x = movementData.x;
        rooms[users[socket.id].room].players[socket.id].y = movementData.y;
        rooms[users[socket.id].room].players[socket.id].flipX = movementData.flipX;

        socket.broadcast.emit('playerMoved', {...rooms[users[socket.id].room].players[socket.id], from: 'room'});
      }
    }

    //show all data
    io.emit('log', { place: 'movement log', myid: socket.id, users: users, players: players, rooms: rooms, conversation: conversation});

  });





  //video sockets

  //offer
  socket.on('sendOffer', function (offerData) {

    
    conversation[socket.id].users[offerData.to] = {
      to: offerData.to,
      from: socket.id,
      offer: offerData.offer,
    };
    // emit to user for answer
    io.to(offerData.to).emit('reciveOffer', conversation[socket.id].users[offerData.to]);
  });

  //answer
  socket.on('sendAnswer', function (answerData) {
    
    io.emit('log', { place: 'send answer', myid: socket.id, users: users, players: players, rooms: rooms, conversation : conversation});

    if(conversation[answerData.to] 
      && conversation[answerData.to].users[answerData.from]
      ){
      conversation[answerData.to].users[answerData.from].answer = answerData.answer;
      // emit to user for answer
      io.to(answerData.to).emit('reciveAnswer', conversation[answerData.to].users[answerData.from]);
    }

  });



  // join or create room
  socket.on('createOrJoinRoom', function (roomData) {

    // have other player add to chat
    if(roomData.addUser){
      io.to(roomData.addUser).emit('startChat', {from: socket.id});
    }

    var room = 'living-room';
    var enterRoom = '';

    if(!rooms['room-'+ room]){
      rooms['room-'+ room] = {name:'room-'+ room, users:[], players:{}};
      rooms['room-'+ room].users.push(socket.id);
      users[socket.id].room = 'room-'+ room;
      enterRoom = 'room-'+ room;
      // io.to(roomData.addUser).emit('joinRoom', rooms['room-'+ roomsNum]);
    } else {
      enterRoom = 'room-'+ room;
      rooms[enterRoom].users.push(socket.id);
      users[socket.id].room = enterRoom;
    }

    rooms[enterRoom].players[socket.id] = {
      flipX: false,
      x: 193,
      y: 296,
      tint: players[socket.id].tint,
      playerId: socket.id,
      videoID: '',
    };

    socket.emit('joinRoom', rooms[enterRoom]);
    //io.emit('roomInfo', rooms[enterRoom]);
    //io.emit('allUsers', users);
  });


  // room
  socket.on('roomInfo',function(roomId){
    var enterRoom = users[socket.id].room;
    io.emit('roomInfo', rooms[enterRoom]);
  });

  //leave chat
  socket.on('leaveRoom', function () {
    var removeRoom = users[socket.id].room;
    if(rooms[removeRoom]){
      const removeIndex = rooms[removeRoom].users.indexOf(socket.id);
      if (removeIndex > -1) {rooms[removeRoom].users.splice(removeIndex, 1) }
    }
    users[socket.id].room = '';
    io.emit('removeUser', socket.id);
    io.emit('allUsers', users);
  });


  // check ready
  socket.on('userReady',function(readyData){
    io.to(readyData.to).emit('chatReady', {from: socket.id,to:readyData.to});
  });
  socket.on('initUserReady',function(readyData){
    io.to(readyData.to).emit('isReady', {from: socket.id,to:readyData.to});
  });
  socket.on('otherUserReady',function(readyData){
    io.to(readyData.to).emit('chatReady', {from: socket.id,to:readyData.to});
  });





  // music sockets
  socket.on('musicUpdate', function (musicData) {
    socket.broadcast.emit('musicChange', musicData);
  });


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
  res.status(err.status || 500).json({ error: err.message });
});
 
server.listen(process.env.PORT || 8443, () => {
  console.log(`Server started on port ${process.env.PORT || 8443}`);
});