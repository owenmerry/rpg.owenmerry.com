class WorldScene extends Phaser.Scene {
    init(data){
      this.socket = data.socket;
      this.myPlayer = {};
      this.myStream = '';

      this.myUserID = data.socket.id;
      this.userServerData = [];
      this.peerList = {};
      this.conversationList = [];
      this.roomInData = {};

    }
  
    constructor() {
      super({
        key: 'WorldScene',
      });
    }
  
    create() {
  
      //websocket start
      //this.socket = io();

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
  
      // others group
      this.otherPlayers = this.physics.add.group();
     
      // create map
      this.createMap();
     
      // create player animations
      this.createAnimations();
     
      // user input
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keyEnter = this.input.keyboard.addKey('ENTER'); 
      
     
      // create enemies
      //this.createEnemies();
  
      // listen for web socket events
      this.socket.on('currentPlayers', function (players) {
        Object.keys(players).forEach(function (id) {
          if (players[id].playerId === this.socket.id) {
            this.myPlayer = players[id];
            this.createPlayer(players[id]);
          } else {
            this.addOtherPlayers(players[id]);
          }
        }.bind(this));
      }.bind(this));
  
      // get current players data
      this.socket.emit('getCurrentPlayers',{});
  
      // start chat
      this.socket.on('startChat', function (chatData) {
        this.socket.removeAllListeners();
        this.scene.start('ChatScene',{ socket: this.socket, readyID: chatData.from, myPlayer: this.myPlayer });
      }.bind(this));
     
      // listen new player
      this.socket.on('newPlayer', function (playerInfo) {
        this.addOtherPlayers(playerInfo);
      }.bind(this));
  
      // listen disconnect
      this.socket.on('disconnect', function (playerId) {
        this.otherPlayers.getChildren().forEach(function (player) {
          if (playerId === player.playerId) {
            player.destroy();
          }
        }.bind(this));
      }.bind(this));
  
      // listen player moved
      this.socket.on('playerMoved', function (playerInfo) {
        this.moveOtherPlayer(playerInfo);
      }.bind(this));


      // music socket
      this.setupMusicSockets();

      // video sockets 
      this.setupVideoSockets();

      // log data
      // this.socket.on('log', function (logData) {
      //   console.log(logData);
      // }.bind(this));
    
    }
     
    createMap() {
      // create the map
      this.map = this.make.tilemap({
        key: 'map'
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
     
    createAnimations() {
      //  animation with key 'left', we don't need left and right as we will use one and flip the sprite
      this.anims.create({
        key: 'left',
        frames: this.anims.generateFrameNumbers('player', {
          frames: [1, 7, 1, 13]
        }),
        frameRate: 10,
        repeat: -1
      });
     
      // animation with key 'right'
      this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers('player', {
          frames: [1, 7, 1, 13]
        }),
        frameRate: 10,
        repeat: -1
      });
     
      this.anims.create({
        key: 'up',
        frames: this.anims.generateFrameNumbers('player', {
          frames: [2, 8, 2, 14]
        }),
        frameRate: 10,
        repeat: -1
      });
     
      this.anims.create({
        key: 'down',
        frames: this.anims.generateFrameNumbers('player', {
          frames: [0, 6, 0, 12]
        }),
        frameRate: 10,
        repeat: -1
      });
    }
     
    createPlayer(playerInfo) {
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
      const otherPlayer = this.add.sprite(playerInfo.x, playerInfo.y, 'player', 6);
      otherPlayer.setTint(playerInfo.tint);
      otherPlayer.playerId = playerInfo.playerId;
      otherPlayer.setSize(16, 16);
      otherPlayer.setScale(1.5);
      this.otherPlayers.add(otherPlayer);
    }
  
    moveOtherPlayer(playerInfo) {
      //if(playerInfo.from === 'world'){
        this.otherPlayers.getChildren().forEach((otherPlayer) => {
          if(otherPlayer.playerId === playerInfo.playerId){
            otherPlayer.x = playerInfo.x;
            otherPlayer.y = playerInfo.y;
            otherPlayer.flipX = playerInfo.flipX;
          }
        });
      //}
    }
     
    updateCamera() {
      // limit camera to map
      this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
      this.cameras.main.startFollow(this.container);
      this.cameras.main.roundPixels = true; // avoid tile bleed
    }
     
    createEnemies() {
      // where the enemies will be
      this.spawns = this.physics.add.group({
        classType: Phaser.GameObjects.Sprite
      });
      for (var i = 0; i < 20; i++) {
        const location = this.getValidLocation();
        // parameters are x, y, width, height
        var enemy = this.spawns.create(location.x, location.y, this.getEnemySprite());
        enemy.body.setCollideWorldBounds(true);
        enemy.body.setImmovable();
      }
  
      // move enemies
      this.timedEvent = this.time.addEvent({
        delay: 3000,
        callback: this.moveEnemies,
        callbackScope: this,
        loop: true
      });
    }
  
    getEnemySprite() {
      var sprites = ['golem', 'ent', 'demon', 'worm', 'wolf'];
      return sprites[Math.floor(Math.random() * sprites.length)];
    }
  
  
  moveEnemies () {
    this.spawns.getChildren().forEach((enemy) => {
      const randNumber = Math.floor((Math.random() * 4) + 1);
   
      switch(randNumber) {
        case 1:
          enemy.body.setVelocityX(50);
          break;
        case 2:
          enemy.body.setVelocityX(-50);
          break;
        case 3:
          enemy.body.setVelocityY(50);
          break;
        case 4:
          enemy.body.setVelocityY(-50);
          break;
        default:
          enemy.body.setVelocityX(50);
      }
    });
   
    setTimeout(() => {
      this.spawns.setVelocityX(0);
      this.spawns.setVelocityY(0);
    }, 500);
  }
     
    getValidLocation() {
      var validLocation = false;
      var x, y;
      while (!validLocation) {
        x = Phaser.Math.RND.between(0, this.physics.world.bounds.width);
        y = Phaser.Math.RND.between(0, this.physics.world.bounds.height);
     
        var occupied = false;
        this.spawns.getChildren().forEach((child) => {
          if (child.getBounds().contains(x, y)) {
            occupied = true;
          }
        });
        if (!occupied) validLocation = true;
      }
      return { x, y };
    }
  
    onMeetEnemy(player, zone) {
      // we move the zone to some other location
      zone.x = Phaser.Math.RND.between(0, this.physics.world.bounds.width);
      zone.y = Phaser.Math.RND.between(0, this.physics.world.bounds.height);
    }


    //music sockets

    setupMusicSockets(){
      this.socket.on('musicChange', function (musicData) {
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
        }
      }.bind(this));
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
          this.socket.emit('playerMovement', playerInfo);
          }
  
  
  
        // on enter
        if(this.keyEnter.isDown){
          var foundChat = false;
          this.otherPlayers.getChildren().forEach(function (otherPlayer) {
            if(this.physics.overlap(this.container, otherPlayer) && foundChat === false){
              this.socket.removeAllListeners();
              this.socket.emit('createOrJoinRoom',{addUser: otherPlayer.playerId });
              this.scene.start('ChatScene',{ socket: this.socket, otherPlayer: otherPlayer.playerId, myPlayer: this.myPlayer});
              foundChat = true;
            }
          }.bind(this));
        }
  
      }
    }





//=============================
//    Video functions
//=============================

gotMedia(stream) {
  this.myStream = stream;

      // start room when have video or tell ready
      document.getElementById('my-video-block').innerHTML = 'waiting for other user';
      this.socket.emit('createOrJoinRoom',{});
      
      //this.socket.emit('otherUserReady',{to: this.readyID,from:this.socket.id});
      this.createMyVideo();
}

createMyVideo() {
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



// creste new user video
createNewVideo (ref) {

  var otherID = ref;
        
    // get offer
    this.peerList[otherID] = new SimplePeer({ 
    initiator: true, 
    trickle: false,
    stream: this.myStream 
    });

    //send offer
    this.peerList[otherID].on('signal', data => {
      if(this.conversationList.indexOf(otherID) === -1){
        this.socket.emit('sendOffer', {to:otherID,from:this.myUserID,offer: JSON.stringify(data)});
        this.conversationList.push(otherID);
      }
    });

    //destory
    this.peerList[otherID].on('destroy', data => {
      if(this.peerList[otherID]){
        delete this.peerList[otherID];
      }
    });

    //create stream and video
    this.peerList[otherID].on('stream', stream => {

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

    this.createNewVideo(otherID);

  }
})
}

//open users from list
openUsersFromList(userList){
  // create other videos
  userList.forEach( otherID => {
  if(otherID !== this.socket.id){

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



setupVideoSockets(){

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
         this.userServerData = userList;
         //this.showUsers();
     }.bind(this));

     // recieve offer
     this.socket.on('reciveOffer', function (offerData) {

         // get answer
         this.peerList[offerData.from] = new SimplePeer({ 
         initiator: false, 
         trickle: false,
         stream: this.myStream 
         });

         //send offer
         this.peerList[offerData.from].on('signal', data => {
              var sendData = {to:offerData.from,from:offerData.to,answer: JSON.stringify(data)};
             this.socket.emit('sendAnswer', sendData);
         })

         //create stream and video
         this.peerList[offerData.from].on('stream', stream => {
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
             if(this.peerList[offerData.from]){
             delete this.peerList[offerData.from];
             }
         })

         //create character
         //this.createCharacters();

     }.bind(this));

     // recieve answer
     this.socket.on('reciveAnswer', function (answerData) {
         this.peerList[answerData.to].signal(JSON.parse(answerData.answer));
     }.bind(this));

     // join room
     this.socket.on('joinRoom', function (roomData) {
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
       //this.createCharacters()
     }.bind(this));


     // log data
     this.socket.on('log', function (logData) {
      // console.log(logData);
     }.bind(this));

}




  }