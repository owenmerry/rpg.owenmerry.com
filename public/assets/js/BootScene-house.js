class BootScene extends Phaser.Scene {
  constructor() {
    super({
      key: "BootScene",
      active: true,
    });
  }

  preload() {
    // map tiles
    this.load.image("tiles", "assets/map/spritesheet-extruded.png");

    //map tiles house
    this.load.image(
      "house-tiles",
      "assets/map-house/pixel_house_set_tiles.png"
    );
    this.load.image(
      "house-items",
      "assets/map-house/pixel_house_set_1.3.4.png"
    );

    // map in json format
    this.load.tilemapTiledJSON("map", "assets/map-house/level-house.json");
    this.load.tilemapTiledJSON(
      "conversation",
      "assets/map-conversation/level-conversation.json"
    );
    this.load.tilemapTiledJSON("pub", "assets/map-pub/level-pub.json");
    // this.load.tilemapTiledJSON('map', 'assets/map/map.json');
    //this.load.tilemapTiledJSON('map', 'assets/map-house-simple/simple-house.json');

    // our two characters
    this.load.spritesheet("player", "assets/RPG_assets.png", {
      frameWidth: 16,
      frameHeight: 16,
    });
    //enemies
    this.load.image("golem", "assets/images/coppergolem.png");
    this.load.image("ent", "assets/images/dark-ent.png");
    this.load.image("demon", "assets/images/demon.png");
    this.load.image("worm", "assets/images/giant-worm.png");
    this.load.image("wolf", "assets/images/wolf.png");
    this.load.image("sword", "assets/images/attack-icon.png");
  }

  create() {
    //create socket
    this.socket = io();

    //music controls
    this.setupMusicControls();

    //go to game
    this.scene.start("WorldScene", { socket: this.socket });
  }

  //function
  setupMusicControls() {
    // listeners
    document.getElementById("play").addEventListener(
      "click",
      function () {
        player.seekTo(player.getCurrentTime());
        player.playVideo();
        this.socket.emit("musicUpdate", {
          action: "play",
          seekTo: player.getCurrentTime(),
        });
      }.bind(this)
    );
    document.getElementById("pause").addEventListener(
      "click",
      function () {
        player.pauseVideo();
        this.socket.emit("musicUpdate", { action: "pause" });
      }.bind(this)
    );
    document.getElementById("next").addEventListener(
      "click",
      function () {
        player.nextVideo();
        this.socket.emit("musicUpdate", { action: "next" });
      }.bind(this)
    );
    document.getElementById("prev").addEventListener(
      "click",
      function () {
        player.previousVideo();
        this.socket.emit("musicUpdate", { action: "prev" });
      }.bind(this)
    );
    document.getElementById("start").addEventListener(
      "click",
      function () {
        player.seekTo(0);
        this.socket.emit("musicUpdate", { action: "seekTo", seekTo: 0 });
      }.bind(this)
    );
    document.getElementById("add-song-button").addEventListener(
      "click",
      function () {
        const newVideoInput = document.getElementById("add-song-input");

        player.cueVideoById(newVideoInput.value);
        this.socket.emit("musicUpdate", {
          action: "changeVideo",
          videoID: newVideoInput.value,
        });
        newVideoInput.value = "";
      }.bind(this)
    );
    document.getElementById("volume-button").addEventListener(
      "click",
      function () {
        const volumeInput = document.getElementById("volume-input");
        player.setVolume(volumeInput.value);
        this.socket.emit("musicUpdate", {
          action: "volume",
          volume: volumeInput.value,
        });
      }.bind(this)
    );
  }
}
