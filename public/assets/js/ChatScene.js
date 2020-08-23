class ChatScene extends Phaser.Scene {
    init(data){
        this.socket = data.socket;
        this.myPlayer = data.myPlayer;

        //variables
        this.myStream = '';
        this.showingMyVideo = false;
        this.showingMyVideo = false;
        this.myUserID = this.socket.id;
        this.otherPlayer = data.otherPlayer;
        this.readyID = data.readyID;

        this.userServerData = [];
        this.peerList = {};
        this.conversationList = [];
        this.roomInData = {};


        //socket listeners
        // disconnected
        this.socket.on('removeUser', function (userID) {
            if(document.getElementById('video-'+ userID)){
                document.getElementById('video-'+ userID).remove();
            }
            if(this.peerList[userID]){
                this.peerList[userID].destroy();
            }
            this.otherPlayers.getChildren().forEach(function (player) {
              if (userID === player.playerId) {
                player.destroy();
              }
            }.bind(this));

        }.bind(this));

        //users change
        this.socket.on('allUsers', function (userList) {
            console.log('all users',userList);
            this.userServerData = userList;
            this.showUsers();
        }.bind(this));

        // recieve offer
        this.socket.on('reciveOffer', function (offerData) {
            console.log('recieve offer');

            // get answer
            this.peerList[offerData.from] = new SimplePeer({ 
            initiator: false, 
            trickle: false,
            stream: this.myStream 
            });

            //send offer
            this.peerList[offerData.from].on('signal', data => {
                console.log('send answer');
                this.socket.emit('sendAnswer', {to:offerData.from,from:this.myUserID,answer: JSON.stringify(data)});
            })

            //create stream and video
            this.peerList[offerData.from].on('stream', stream => {
                console.log('got stream');
                var video = document.createElement('video');
                document.getElementById('video-block').appendChild(video);
                video.id = 'video-'+ offerData.from;
            
                if ('srcObject' in video) {
                video.srcObject = stream
                } else {
                video.src = window.URL.createObjectURL(stream) // for older browsers
                }
            
                video.play()
            });


            // use offer
            this.peerList[offerData.from].signal(JSON.parse(offerData.offer));

            //destroy
            this.peerList[offerData.from].on('destroy', data => {
                console.log('run destroy recieve offer');
                if(this.peerList[offerData.from]){
                delete this.peerList[offerData.from];
                }
            })

            //create character
            this.createCharacters();

        }.bind(this));

        // recieve answer
        this.socket.on('reciveAnswer', function (answerData) {
            console.log('recieve answer');
            this.peerList[answerData.to].signal(JSON.parse(answerData.answer));
        }.bind(this));

        // join room
        this.socket.on('joinRoom', function (roomData) {
            console.log('joinRoom');
            console.log(roomData);
            this.roomInData = roomData;
            this.joinRoom(roomData);
        }.bind(this));

        // is ready
        this.socket.on('isReady', function (readyData) {
            if(this.myStream !== ''){
              this.socket.emit('userReady',{to: readyData.from});
            }
        }.bind(this));


        // update room data
        this.socket.on('currentPlayersRoom', function (roomData) {
          console.log('currentPlayersRoom');
          console.log(roomData);
          this.roomInData = roomData;
        }.bind(this));


        // listen player moved
        this.socket.on('playerMoved', function (playerInfo) {
          this.moveOtherPlayer(playerInfo);
        }.bind(this));


        // show players
        this.socket.on('roomInfo', function (roomData) {
          //set data
          this.roomInData = roomData;

          //create players
          this.createCharacters()
        }.bind(this));


        // log data
        this.socket.on('log', function (logData) {
          console.log(logData);
        }.bind(this));


    }
  
    constructor() {
      super({
        key: 'ChatScene',
      });
      
    }
  
    create() {
     
        // user input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyEnter = this.input.keyboard.addKey('ENTER');
        
        //variables
        // this.myStream = '';
        // this.showingMyVideo = false;
    
        //varibles
        var constraints = {
            video: {
            width: {max: 320},
            height: {max: 3200},
            frameRate: {max: 30},
            },
            audio: true,
        };
    
    
        // get video
        navigator.mediaDevices.getUserMedia(constraints)
        .then(function (stream) { 
            this.gotMedia(stream);
        }.bind(this)
        ).catch((err) => {console.log('video had an error',err);});
        console.log('try video data...');

         // music socket
        this.setupMusicSockets();


        //setup game
        this.otherPlayers = this.physics.add.group();
        this.createMap();

        this.createPlayer({flipX: false,
          playerId: "me",
          tint: this.myPlayer.tint,
          videoID: "",
          x: 193,
          y: 296,
        });

        // get room info
        this.socket.emit('roomInfo', 'get room info');


  
  
    }


    update() {
      if (this.container) {
  
        if(this.container.body){
          this.container.body.setVelocity(0);
        }
     
        // Horizontal movement
        if (this.cursors.left.isDown) {
          this.container.body.setVelocityX(-80);
        } else if (this.cursors.right.isDown) {
          this.container.body.setVelocityX(80);
        }
     
        // Vertical movement
        if (this.cursors.up.isDown) {
          this.container.body.setVelocityY(-80);
        } else if (this.cursors.down.isDown) {
          this.container.body.setVelocityY(80);
        }
     
        // Update the animation last and give left/right animations precedence over up/down animations
        if (this.cursors.left.isDown) {
          this.player.anims.play('left', true);
          this.player.flipX = true;
        } else if (this.cursors.right.isDown) {
          this.player.anims.play('right', true);
          this.player.flipX = false;
        } else if (this.cursors.up.isDown) {
          this.player.anims.play('up', true);
        } else if (this.cursors.down.isDown) {
          this.player.anims.play('down', true);
        } else {
          if(this.player.anims){
            this.player.anims.stop();
          }
        }
  
        // send data to server
        if(
          this.cursors.left.isDown ||
          this.cursors.right.isDown ||
          this.cursors.up.isDown ||
          this.cursors.down.isDown
        ){
          var playerInfo = {
                flipX: this.player.flipX,
                x: this.container.x,
                y: this.container.y,
              };
          //console.log('send data:', playerInfo);
          this.socket.emit('playerMovement', playerInfo);
          }
  
  
  
      // on enter
      if(this.keyEnter.isDown){
        this.closeChat();
        //this.createCharacters();

        // const otherPlayert = this.add.sprite(193, 296, 'player', 6);
        // otherPlayert.playerId = 'test';
        // otherPlayert.setSize(16, 16);
        // otherPlayert.setScale(1.5);
        // this.otherPlayers.add(otherPlayert);


      }
  
      }
    }


//functions

gotMedia(stream) {
  console.log('got video data');
  this.myStream = stream;

      // start room when have video or tell ready
      if(this.otherPlayer){
        console.log('wait for ready');
        document.getElementById('my-video-block').innerHTML = 'waiting for other user';

        this.socket.on('chatReady',function(){
          console.log('got ready');
          console.log('call createroom');
          this.createRoom(this.otherPlayer);
        }.bind(this));
        this.socket.emit('initUserReady',{to: this.otherPlayer,from:this.socket.id});
    } else{
        console.log('send ready');
        document.getElementById('my-video-block').innerHTML = 'waiting for other user';
        
        this.socket.emit('otherUserReady',{to: this.readyID,from:this.socket.id});
        this.createMyVideo();
    }
}

createMyVideo() {
    console.log('create my video');
    //setup my video
    document.getElementById('my-video-block').innerHTML = '';
    var video = document.createElement('video');
    document.getElementById('my-video-block').appendChild(video);
    video.id = 'video-myvideo';
    video.muted = true;
    this.showingMyVideo = true;

    if ('srcObject' in video) {
    video.srcObject = this.myStream
    } else {
    video.src = window.URL.createObjectURL(this.myStream) // for older browsers
    }

    video.play();
};

closeChat(){
    this.leaveRoom();
    this.socket.removeAllListeners();
    document.getElementById('my-video-block').innerHTML = '';
    this.scene.start('WorldScene',{ socket: this.socket });
}


showUsers(){

    //show users
    document.getElementById('user-block').innerHTML = '';
    this.userServerData.online.forEach( userID => {
      if(userID !== this.myUserID){
        var user = document.createElement('div');
          document.getElementById('user-block').appendChild(user);
          user.classList.add('create-room-with');
          if(userID !== this.myUserID){
          user.innerHTML = 'user---'+ userID +'---In room:'+ this.userServerData[userID].room;
          } else {
            user.innerHTML = 'user---'+ userID +'---'+ this.userServerData[userID].room +'---(me)';
          }
      }
    })
  
    //show my details
    document.getElementById('my-user-block').innerHTML = '';
    document.getElementById('my-user-block').innerHTML = 'Your User ID: '+ this.myUserID +', Room Your In: '+ this.userServerData[this.myUserID].room +'';
  
}

// creste new user video
createNewVideo (ref) {

    var otherID = ref;

    console.log('called init for ', otherID);
          
      // get offer
      this.peerList[otherID] = new SimplePeer({ 
      initiator: true, 
      trickle: false,
      stream: this.myStream 
      });

      //send offer
      this.peerList[otherID].on('signal', data => {
        if(this.conversationList.indexOf(otherID) === -1){
          console.log('send offer');
          this.socket.emit('sendOffer', {to:otherID,from:this.myUserID,offer: JSON.stringify(data)});
          this.conversationList.push(otherID);
        }
      });

      //destory
      this.peerList[otherID].on('destroy', data => {
        console.log('run destroy recieve answer');
        if(this.peerList[otherID]){
          delete this.peerList[otherID];
        }
      });

      //create stream and video
      this.peerList[otherID].on('stream', stream => {
        console.log('got stream');

        //delete if exist
        if(document.getElementById('video-'+ otherID)){
         // document.getElementById('video-'+ otherID).remove();
        };

        //create
        var video = document.createElement('video');
        document.getElementById('video-block').appendChild(video);
        video.id = 'video-'+ otherID;

        //setup stream
        if ('srcObject' in video) {
          video.srcObject = stream
        } else {
          video.src = window.URL.createObjectURL(stream) // for older browsers
        }

        video.play()
      });
  }


  //open all videos
  openActiveUsers(){
    // create other videos
    this.userServerData.online.forEach( otherID => {
    if(otherID !== this.myUserID){

      console.log('called open active user loop');
      this.createNewVideo(otherID);

    }
  })
}

//open users from list
openUsersFromList(userList){
    // create other videos
    userList.forEach( otherID => {
    if(otherID !== this.myUserID){

      console.log('called open active user loop');
      this.createNewVideo(otherID);

    }
  })
}

makeRoomWithUser(addUser){
    this.socket.emit('createOrJoinRoom', {addUser: addUser});
}

joinRoom(joinRoom) {

    //create others videos
    this.openUsersFromList(joinRoom.users);

}

callLeaveRoom() {
  this.socket.emit('leaveRoom', {});
}

cleanScreen() {
  document.getElementById('my-video-block').innerHTML = '';
  document.getElementById('video-block').innerHTML = '';
  this.showingMyVideo = false;

  if(this.roomInData.users){
    this.roomInData.users.forEach( function (user) {
      var removeUserIndex = this.conversationList.indexOf(user);
      if(removeUserIndex > -1){
        this.conversationList.splice(removeUserIndex, 1);
      }
      if(this.peerList[user]){
        this.peerList[user].destroy();
      }
    }.bind(this));
  }
}


createRoom(user){

    //clean up screen
    this.leaveRoom();

    //create my video
    this.createMyVideo();
    
    //setup room or join
    this.makeRoomWithUser(user);
  
}

// show all online users
leaveRoom(){
    
    this.callLeaveRoom();

    this.cleanScreen();
  
}







 //music sockets

 setupMusicSockets(){
  this.socket.on('musicChange', function (musicData) {
    console.log('musicChange ran',musicData);
    if(musicData.action === 'play'){
      player.seekTo(musicData.seekTo);
      player.playVideo();
    }
    if(musicData.action === 'pause'){
      player.pauseVideo();
    }
    if(musicData.action === 'next'){
      player.nextVideo();
    }
    if(musicData.action === 'prev'){
      player.previousVideo();
    }
    if(musicData.action === 'seekTo'){
      player.seekTo(musicData.seekTo);
    }
    if(musicData.action === 'changeVideo'){
      player.cueVideoById(musicData.videoID);
    }
    if(musicData.action === 'volume'){
      player.setVolume(musicData.volume);
      console.log('musicChange volume change',musicData);
    }
  }.bind(this));
}







/// conversation game

createMap() {
  // create the map
  this.map = this.make.tilemap({
    key: 'conversation'
  });
 
  // first parameter is the name of the tilemap in tiled
  var tiles = this.map.addTilesetImage('pixel_house_set_tiles', 'house-tiles', 16, 16, 0, 0);
  var items = this.map.addTilesetImage('pixel_house_set_1.3.4', 'house-items', 16, 16, 0, 0);
 
  // creating the layers
  this.layerBackgroundFloor = this.map.createStaticLayer('background-floor', tiles, 0, 0);
  this.layerBackgroundRoom = this.map.createStaticLayer('background-room', tiles, 0, 0);
  this.layerBackgroundTop = this.map.createStaticLayer('background-top', items, 0, 0);

  this.layerItems = this.map.createStaticLayer('items', items, 0, 0);
  this.layerItemsTop = this.map.createStaticLayer('items-top', items, 0, 0);

  //setup collisions
  this.layerBackgroundRoom.setCollisionByExclusion([-1]);
  this.layerItems.setCollisionByExclusion([-1]);
  this.layerItemsTop.setCollisionByExclusion([-1]);
 
  // don't go out of the map
  this.physics.world.bounds.width = this.map.widthInPixels;
  this.physics.world.bounds.height = this.map.heightInPixels;
}







//player and others

createPlayer(playerInfo) {
  console.log('create player');
  // our player sprite created through the physics system
  this.player = this.add.sprite(0, 0, 'player', 6);
  this.player.setTint(playerInfo.tint);
 
  this.container = this.add.container(playerInfo.x, playerInfo.y);
  this.container.setSize(16, 16);
  this.physics.world.enable(this.container);
  this.container.add(this.player);
  this.container.setScale(1.5);
 
  // update camera
  this.updateCamera();
 
  // don't go out of the map
  this.container.body.setCollideWorldBounds(true);

  //collider enemy
  this.physics.add.collider(this.container, this.layerBackgroundRoom);
  this.physics.add.collider(this.container, this.layerItems);
  this.physics.add.collider(this.container, this.layerItemsTop);
}

addOtherPlayers(playerInfo) {
  console.log('add other players');
  const otherPlayer = this.add.sprite(playerInfo.x, playerInfo.y, 'player', 6);
  otherPlayer.setTint(playerInfo.tint);
  otherPlayer.playerId = playerInfo.playerId;
  otherPlayer.setSize(16, 16);
  otherPlayer.setScale(1.5);
  this.otherPlayers.add(otherPlayer);
}


createCharacters() {
    console.log('current players room',this.roomInData.users);

    //remove 
    this.otherPlayers.getChildren().forEach(function (player) {
        player.destroy();
    }.bind(this));

    //create all
        Object.keys(this.roomInData.users).forEach(function (id) {
          if (this.roomInData.users[id] !== this.socket.id) {
            if (this.roomInData.players[this.roomInData.users[id]]) {
              console.log('create other players loop');
              this.addOtherPlayers(this.roomInData.players[this.roomInData.users[id]]);
            }
          }
        }.bind(this));
    }


updateCamera() {
  // limit camera to map
  this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
  this.cameras.main.startFollow(this.container);
  this.cameras.main.roundPixels = true; // avoid tile bleed
}



moveOtherPlayer(playerInfo) {
  if(playerInfo.from === 'room'){
    this.otherPlayers.getChildren().forEach((otherPlayer) => {
      if(otherPlayer.playerId === playerInfo.playerId){
        otherPlayer.x = playerInfo.x;
        otherPlayer.y = playerInfo.y;
        otherPlayer.flipX = playerInfo.flipX;
      }
    });
  }
 }




  }