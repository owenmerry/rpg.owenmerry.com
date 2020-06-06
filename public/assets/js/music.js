
// setup video
var player;

function onYouTubeIframeAPIReady() {
    player = new YT.Player('video-placeholder', {
        width: 600,
        height: 400,
        videoId: 'u94lVZa9xXU',
        playerVars: {
            color: 'white',
            playlist: 'IbFEEfNE1YQ,QFpf8-C5UWw'
        },
        events: {
            onReady: initialize
        }
    });
}

function initialize(){

}
