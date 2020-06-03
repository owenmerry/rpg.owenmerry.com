
//var Peer = require('simple-peer')
var socket = io(); 
var conversationInfo = {};
var myUserID = '';
var userServerData = [];
var constraints = {
    video: {
      width: {max: 320},
      height: {max: 3200},
      frameRate: {max: 30},
    },
    audio: true,
  };
var peerList = {};
var conversationList = [];
var myStream = {};
var showingMyVideo = false;
var roomInData = {};



  // on connected
  socket.on('connected', function (userID,userList) {
    myUserID = userID;
    console.log('connected');

    navigator.mediaDevices.getUserMedia(constraints)
    .then(gotMedia).catch(() => {})
      
    function gotMedia (stream) {
      myStream = stream;
    }

  })


  // disconnected
  socket.on('removeUser', function (userID) {
    if(document.getElementById('video-'+ userID)){
      document.getElementById('video-'+ userID).remove();
    }
    if(peerList[userID]){
      peerList[userID].destroy();
    }
  })



//users change
  socket.on('allUsers', function (userList) {
    console.log('all users',userList);
    userServerData = userList;
    showUsers();
  });



// recieve offer

  socket.on('reciveOffer', function (offerData) {
    console.log('recieve offer');

    navigator.mediaDevices.getUserMedia(constraints)
    .then(gotMedia).catch(() => {})
      
    function gotMedia (stream) {
      console.log('recieve offer got media');

      //check my video
      if(!showingMyVideo){
        createMyVideo();
      }

      // get answer
      peerList[offerData.from] = new SimplePeer({ 
      initiator: false, 
      trickle: false,
      stream: stream 
      });

      //send offer
      peerList[offerData.from].on('signal', data => {
        console.log('send answer');
        socket.emit('sendAnswer', {to:offerData.from,from:myUserID,answer: JSON.stringify(data)});
      })

      //create stream and video
      peerList[offerData.from].on('stream', stream => {
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
      peerList[offerData.from].signal(JSON.parse(offerData.offer));

      //destroy
      peerList[offerData.from].on('destroy', data => {
        console.log('run destroy recieve offer');
        if(peerList[offerData.from]){
          delete peerList[offerData.from];
        }
      })

    };

  });


  //create local video
  function createMyVideo() {
    document.getElementById('my-video-block').innerHTML = '';
    var video = document.createElement('video');
    document.getElementById('my-video-block').appendChild(video);
    video.id = 'video-myvideo';
    video.muted = true;
    showingMyVideo = true;
  
    if ('srcObject' in video) {
      video.srcObject = myStream
    } else {
      video.src = window.URL.createObjectURL(myStream) // for older browsers
    }
  
    video.play()
  }


  // recieve answer
  socket.on('reciveAnswer', function (answerData) {
    console.log('recieve answer');
    peerList[answerData.to].signal(JSON.parse(answerData.answer));
  });


  // creste new user video
  function createNewVideo (ref) {

    var otherID = ref;

    console.log('called init for ', otherID);
          
      // get offer
      peerList[otherID] = new SimplePeer({ 
      initiator: true, 
      trickle: false,
      stream: myStream 
      });

      //send offer
      peerList[otherID].on('signal', data => {
        if(conversationList.indexOf(otherID) === -1){
          console.log('send offer');
          socket.emit('sendOffer', {to:otherID,from:myUserID,offer: JSON.stringify(data)});
          conversationList.push(otherID);
        }
      });

      //destory
      peerList[otherID].on('destroy', data => {
        console.log('run destroy recieve answer');
        if(peerList[otherID]){
          delete peerList[otherID];
        }
      });

      //create stream and video
      peerList[otherID].on('stream', stream => {
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




function openActiveUsers(){
    // create other videos
    userServerData.online.forEach( otherID => {
    if(otherID !== myUserID){

      console.log('called open active user loop');
      createNewVideo(otherID);

    }
  })
}

function openUsersFromList(userList){
    // create other videos
    userList.forEach( otherID => {
    if(otherID !== myUserID){

      console.log('called open active user loop');
      createNewVideo(otherID);

    }
  })
}


//room functions
function makeRoomWithUser(addUser){
  socket.emit('createOrJoinRoom', {addUser: addUser});
}

socket.on('joinRoom', function (roomData) {
  console.log('joinRoom');
  console.log(roomData);
  roomInData = roomData;
  joinRoom(roomData);
});

function joinRoom(joinRoom) {

    //create my video
    createMyVideo();

    //create others videos
    openUsersFromList(joinRoom.users);


}

function callLeaveRoom() {
  socket.emit('leaveRoom', {});
}

function cleanScreen() {
  document.getElementById('my-video-block').innerHTML = '';
  document.getElementById('video-block').innerHTML = '';
  showingMyVideo = false;

  if(roomInData.users){
    roomInData.users.forEach( function (user) {
      var removeUserIndex = conversationList.indexOf(user);
      if(removeUserIndex > -1){
        conversationList.splice(removeUserIndex, 1);
      }
      if(peerList[user]){
        peerList[user].destroy();
      }
    });
  }
}


// show all online users
function showUsers(){

  //show users
  document.getElementById('user-block').innerHTML = '';
  userServerData.online.forEach( userID => {
    if(userID !== myUserID){
      var user = document.createElement('div');
        document.getElementById('user-block').appendChild(user);
        user.classList.add('create-room-with');
        if(userID !== myUserID){
        user.innerHTML = 'user---'+ userID +'---In room:'+ userServerData[userID].room;
        } else {
          user.innerHTML = 'user---'+ userID +'---'+ userServerData[userID].room +'---(me)';
        }
    }
  })

  // create button click
  var elements = document.getElementsByClassName('create-room-with');
  for (var i = 0; i < elements.length; i++) {
  elements[i].addEventListener('click', (e) => {
    console.log('clicked user');
    createRoom(e.target.innerHTML.split('---')[1]);
  });
  }

  //show my details
  document.getElementById('my-user-block').innerHTML = '';
  document.getElementById('my-user-block').innerHTML = 'Your User ID: '+ myUserID +', Room Your In: '+ userServerData[myUserID].room +'';

}


// show all rooms
// function showRooms(){
//   document.getElementById('user-block').innerHTML = '';
//   roomServerData.online.forEach( userID => {
//       var user = document.createElement('div');
//         document.getElementById('user-block').appendChild(user);
//         if(userID !== myUserID){
//         user.innerHTML = 'user-'+ userID;
//         } else {
//           user.innerHTML = 'user-'+ userID +'-(me)';
//         }
//   })

// }



//=================================================================
//Clean API calls

// show all online users
function createRoom(user){

      leaveRoom();
      
      //create my video
      makeRoomWithUser(user);
    
}

// show all online users
function leaveRoom(){
      
      callLeaveRoom();

      cleanScreen();
    
}



//listeners
document.getElementById('leave-chat').addEventListener('click', function(){
  console.log('run leave room');
  leaveRoom();
});
