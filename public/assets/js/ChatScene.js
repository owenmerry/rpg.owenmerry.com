class ChatScene extends Phaser.Scene {
    init(data){
        this.socket = data.socket;

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


        // join room
        this.socket.on('isReady', function (readyData) {
            if(this.myStream !== ''){
              this.socket.emit('userReady',{to: readyData.from});
            }
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

        //functions

  
  
    }
  
    update() {
  
      // on enter
      if(this.keyEnter.isDown){
        this.closeChat();
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



  }