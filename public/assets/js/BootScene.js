class BootScene extends Phaser.Scene {
    constructor() {
      super({
        key: 'BootScene',
        active: true
      });
    }
  
    preload() {
      // map tiles
      this.load.image('tiles', 'assets/map/spritesheet-extruded.png');
  
      //map tiles house
      this.load.image('house-tiles', 'assets/map-house/pixel_house_set_tiles.png');
      this.load.image('house-items', 'assets/map-house/pixel_house_set_1.3.4.png');
  
      // map in json format
      this.load.tilemapTiledJSON('map', 'assets/map-house/level-house.json');
     // this.load.tilemapTiledJSON('map', 'assets/map/map.json');
     //this.load.tilemapTiledJSON('map', 'assets/map-house-simple/simple-house.json');
  
      // our two characters
      this.load.spritesheet('player', 'assets/RPG_assets.png', {
        frameWidth: 16,
        frameHeight: 16
      });
      //enemies
      this.load.image('golem', 'assets/images/coppergolem.png');
      this.load.image('ent', 'assets/images/dark-ent.png');
      this.load.image('demon', 'assets/images/demon.png');
      this.load.image('worm', 'assets/images/giant-worm.png');
      this.load.image('wolf', 'assets/images/wolf.png');
      this.load.image('sword', 'assets/images/attack-icon.png');
    }
  
    create() {
      //create socket
      this.socket = io();
  
      //go to game
      this.scene.start('WorldScene',{ socket: this.socket });
    }
  }