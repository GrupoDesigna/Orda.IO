// Phaser 3 survival style game

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

// Global variables
let player;
let cursors;
let wasd;
let bullets;
let lastFired = 0;
let enemies;
let powerups;
let buildings;

let scoreText;
let healthText;
let timeText;
let spawnTimer = 0;
let killCount = 0;
let health = 5;
let speed = 200;
let fireRate = 300; // milliseconds
let startTime;
const WORLD_SIZE = 2000;
const WIN_TIME = 60; // seconds to win

function preload() {
    // Create simple textures using graphics for player, bullet, enemy and powerup
    const circle = this.add.graphics();
    circle.fillStyle(0x00ff00, 1);
    circle.fillCircle(15, 15, 15);
    circle.generateTexture('player', 30, 30);
    circle.destroy();

    const bulletGfx = this.add.graphics();
    bulletGfx.fillStyle(0xffff00, 1);
    bulletGfx.fillCircle(5, 5, 5);
    bulletGfx.generateTexture('bullet', 10, 10);
    bulletGfx.destroy();

    const enemyGfx = this.add.graphics();
    enemyGfx.fillStyle(0xff0000, 1);
    enemyGfx.fillRect(0, 0, 30, 30);
    enemyGfx.generateTexture('enemy', 30, 30);
    enemyGfx.destroy();

    const speedGfx = this.add.graphics();
    speedGfx.fillStyle(0x00ffff, 1);
    speedGfx.fillCircle(10, 10, 10);
    speedGfx.generateTexture('speed', 20, 20);
    speedGfx.destroy();

    const healGfx = this.add.graphics();
    healGfx.fillStyle(0xff00ff, 1);
    healGfx.fillCircle(10, 10, 10);
    healGfx.generateTexture('heal', 20, 20);
    healGfx.destroy();

    const buildingGfx = this.add.graphics();
    buildingGfx.fillStyle(0x555555, 1);
    buildingGfx.fillRect(0, 0, 60, 60);
    buildingGfx.generateTexture('building', 60, 60);
    buildingGfx.destroy();

}

function create() {
    // Create large world bounds
    this.physics.world.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);

    // Player setup
    player = this.physics.add.image(WORLD_SIZE / 2, WORLD_SIZE / 2, 'player');
    player.setCollideWorldBounds(true);

    // Camera follows the player
    this.cameras.main.startFollow(player);
    this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
    this.cameras.main.setBackgroundColor('#333333');

    // Groups
    bullets = this.physics.add.group();
    enemies = this.physics.add.group();
    powerups = this.physics.add.group();
    buildings = this.physics.add.staticGroup();

    // Place rectangular buildings around the world for orientation
    for (let i = 0; i < 40; i++) {
        const x = Phaser.Math.Between(100, WORLD_SIZE - 100);
        const y = Phaser.Math.Between(100, WORLD_SIZE - 100);
        buildings.create(x, y, 'building');
    }


    // Input
    cursors = this.input.keyboard.createCursorKeys();
    wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.input.on('pointerdown', shoot, this);

    // Collisions
    this.physics.add.overlap(bullets, enemies, hitEnemy, null, this);
    this.physics.add.overlap(player, enemies, playerHit, null, this);
    this.physics.add.overlap(player, powerups, collectPowerup, null, this);
    this.physics.add.collider(player, buildings);
    this.physics.add.collider(enemies, buildings);
    this.physics.add.collider(bullets, buildings, bulletHitBuilding, null, this);


    // UI texts fixed to camera
    scoreText = this.add.text(10, 10, 'Kills: 0', { font: '16px Arial', fill: '#ffffff' });
    scoreText.setScrollFactor(0);
    healthText = this.add.text(10, 30, 'Health: ' + health, { font: '16px Arial', fill: '#ffffff' });
    healthText.setScrollFactor(0);
    timeText = this.add.text(10, 50, 'Time: 0', { font: '16px Arial', fill: '#ffffff' });
    timeText.setScrollFactor(0);

    startTime = this.time.now;
}

function update(time, delta) {
    if (health <= 0) {
        return gameOver.call(this, false);
    }
    const elapsed = Math.floor((time - startTime) / 1000);
    timeText.setText('Time: ' + elapsed);
    if (elapsed >= WIN_TIME) {
        return gameOver.call(this, true);
    }

    // Player movement
    let vx = 0;
    let vy = 0;
    if (cursors.left.isDown || wasd.A.isDown) {
        vx = -speed;
    } else if (cursors.right.isDown || wasd.D.isDown) {
        vx = speed;
    }
    if (cursors.up.isDown || wasd.W.isDown) {
        vy = -speed;
    } else if (cursors.down.isDown || wasd.S.isDown) {
        vy = speed;
    }
    player.setVelocity(vx, vy);

    // Spawn enemies every 2 seconds
    spawnTimer += delta;
    if (spawnTimer > 2000) {
        spawnTimer = 0;
        spawnEnemy.call(this);
    }

    // Enemies chase player
    enemies.children.iterate(enemy => {
        if (enemy) {
            this.physics.moveToObject(enemy, player, 100);
        }
    });
}

function shoot(pointer) {
    const time = this.time.now;
    if (time < lastFired + fireRate) return;
    lastFired = time;

    const bullet = bullets.create(player.x, player.y, 'bullet');
    bullet.setCollideWorldBounds(false);
    bullet.body.allowGravity = false;

    const angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);
    const velocity = this.physics.velocityFromRotation(angle, 500);
    bullet.setVelocity(velocity.x, velocity.y);
}

function hitEnemy(bullet, enemy) {
    bullet.destroy();
    enemy.destroy();
    killCount++;
    scoreText.setText('Kills: ' + killCount);
}

function playerHit(playerObj, enemy) {
    enemy.destroy();
    health--;
    healthText.setText('Health: ' + health);
}

function bulletHitBuilding(bullet, building) {
    bullet.destroy();
}

function spawnEnemy() {
    const pos = Phaser.Math.Between(0, 1);
    let x = pos === 0 ? 0 : WORLD_SIZE;
    let y = Phaser.Math.Between(0, WORLD_SIZE);
    if (Phaser.Math.Between(0, 1) === 0) {
        x = Phaser.Math.Between(0, WORLD_SIZE);
        y = pos === 0 ? 0 : WORLD_SIZE;
    }
    const enemy = enemies.create(x, y, 'enemy');
    enemy.setCollideWorldBounds(true);
}

function collectPowerup(playerObj, power) {
    if (power.type === 'speed') {
        speed += 50;
    } else if (power.type === 'heal') {
        health += 1;
        healthText.setText('Health: ' + health);
    }
    power.destroy();
}

function gameOver(win) {
    this.physics.pause();
    player.setTint(0x808080);
    const msg = win ? 'You Survived!' : 'Game Over';
    this.add.text(this.cameras.main.worldView.centerX, this.cameras.main.worldView.centerY, msg, {
        font: '32px Arial',
        fill: '#ffffff'
    }).setOrigin(0.5);
    return true;
}

// Periodically spawn power-ups
setInterval(function() {
    if (!game.scene.keys.default) return;
    const type = Phaser.Math.Between(0, 1) === 0 ? 'speed' : 'heal';
    const x = Phaser.Math.Between(50, WORLD_SIZE - 50);
    const y = Phaser.Math.Between(50, WORLD_SIZE - 50);
    const p = powerups.create(x, y, type);
    p.type = type;
}, 10000);

