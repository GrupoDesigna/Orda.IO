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
let enemyBullets;
let bossBullets;
let scoreText;
let healthText;
let timeText;
let spawnTimer = 0;
let score = 0;
let health = 5;
let speed = 200;
let fireRate = 300; // milliseconds
let bulletSpeed = 500;
let bulletCount = 1;
let startTime;
let boss;
let bossHealth = 0;
let bossHealthBar;
let bossShootTimer = 0;
let bossCollider;
let bossPlayerCollider;
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

    const enemyBulletGfx = this.add.graphics();
    enemyBulletGfx.fillStyle(0xff8800, 1);
    enemyBulletGfx.fillCircle(4, 4, 4);
    enemyBulletGfx.generateTexture('enemyBullet', 8, 8);
    enemyBulletGfx.destroy();

    const bossGfx = this.add.graphics();
    // Boss will be a bright magenta circle
    bossGfx.fillStyle(0xff00ff, 1);
    bossGfx.fillCircle(30, 30, 30);
    bossGfx.generateTexture('boss', 60, 60);
    bossGfx.destroy();

    const multiGfx = this.add.graphics();
    multiGfx.fillStyle(0xffffff, 1);
    multiGfx.fillCircle(10, 10, 10);
    multiGfx.generateTexture('multi', 20, 20);
    multiGfx.destroy();

    const bspeedGfx = this.add.graphics();
    bspeedGfx.fillStyle(0xffa500, 1);
    bspeedGfx.fillCircle(10, 10, 10);
    bspeedGfx.generateTexture('bspeed', 20, 20);
    bspeedGfx.destroy();

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
    enemyBullets = this.physics.add.group();
    bossBullets = this.physics.add.group();

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
    this.physics.add.overlap(player, enemyBullets, playerHitByBullet, null, this);
    this.physics.add.overlap(player, bossBullets, playerHitByBullet, null, this);
    this.physics.add.overlap(player, powerups, collectPowerup, null, this);
    this.physics.add.collider(player, buildings);
    this.physics.add.collider(enemies, buildings);
    this.physics.add.collider(bullets, buildings, bulletHitBuilding, null, this);
    this.physics.add.collider(enemyBullets, buildings, bulletHitBuilding, null, this);
    this.physics.add.collider(bossBullets, buildings, bulletHitBuilding, null, this);

    // UI texts fixed to camera
    scoreText = this.add.text(10, 10, 'Score: 0', { font: '16px Arial', fill: '#ffffff' });
    scoreText.setScrollFactor(0);
    healthText = this.add.text(10, 30, 'Health: ' + health, { font: '16px Arial', fill: '#ffffff' });
    healthText.setScrollFactor(0);
    timeText = this.add.text(10, 50, 'Time: 0', { font: '16px Arial', fill: '#ffffff' });
    timeText.setScrollFactor(0);


    // Spawn power-ups periodically using a timed event
    this.time.addEvent({
        delay: 10000,
        callback: spawnPowerup,
        callbackScope: this,
        loop: true
    });

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

    // Spawn enemies every 2 seconds until boss appears
    spawnTimer += delta;
    if (!boss && spawnTimer > 2000) {
        spawnTimer = 0;
        spawnEnemy.call(this);
    }

    // Spawn boss at 100 points
    if (!boss && score >= 100) {
        spawnBoss.call(this);
    }

    // Enemies chase player and use abilities
    enemies.children.iterate(enemy => {
        // Skip any destroyed enemies that may still linger in the group
        if (!enemy || !enemy.body) {
            return;
        }

        const speedVal = enemy.ability === 'fast' ? 150 : 100;
        this.physics.moveToObject(enemy, player, speedVal);

        if (enemy.ability === 'shoot') {
            enemy.shootTimer += delta;
            if (enemy.shootTimer > 2000) {
                enemy.shootTimer = 0;
                enemyShoot.call(this, enemy);
            }
        }
    });

    // Boss behavior
    if (boss && boss.body) {
        this.physics.moveToObject(boss, player, 80);
        bossShootTimer += delta;
        if (bossShootTimer > 1500) {
            bossShootTimer = 0;
            bossShoot.call(this);
        }
        updateBossBar();
    }
}

function shoot(pointer) {
    const time = this.time.now;
    if (time < lastFired + fireRate) return;
    lastFired = time;

    const baseAngle = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);
    for (let i = 0; i < bulletCount; i++) {
        const offset = (i - (bulletCount - 1) / 2) * 0.1;
        const angle = baseAngle + offset;
        const bullet = bullets.create(player.x, player.y, 'bullet');
        bullet.setCollideWorldBounds(false);
        bullet.body.allowGravity = false;
        const velocity = this.physics.velocityFromRotation(angle, bulletSpeed);
        bullet.setVelocity(velocity.x, velocity.y);
    }
}

function hitEnemy(bullet, enemy) {
    bullet.destroy();
    enemy.destroy();
    // Each enemy is worth 15 points
    score += 15;
    scoreText.setText('Score: ' + score);
}

function playerHit(playerObj, enemy) {
    enemy.destroy();
    health--;
    healthText.setText('Health: ' + health);
}

function bulletHitBuilding(bullet, building) {
    bullet.destroy();
}


function spawnBoss() {
    const pos = Phaser.Math.Between(0, 1);
    let x = pos === 0 ? 0 : WORLD_SIZE;
    let y = Phaser.Math.Between(0, WORLD_SIZE);
    if (Phaser.Math.Between(0, 1) === 0) {
        x = Phaser.Math.Between(0, WORLD_SIZE);
        y = pos === 0 ? 0 : WORLD_SIZE;
    }
    bossHealth = 30;
    boss = this.physics.add.image(x, y, 'boss');
    boss.setCollideWorldBounds(true);
    bossHealthBar = this.add.graphics();
    bossCollider = this.physics.add.overlap(bullets, boss, hitBoss, null, this);
    bossPlayerCollider = this.physics.add.overlap(player, boss, playerHit, null, this);
}

function updateBossBar() {
    if (!boss) return;
    bossHealthBar.clear();
    const width = 60;
    const x = boss.x - width / 2;
    const y = boss.y - 40;
    bossHealthBar.fillStyle(0xff0000, 1);
    bossHealthBar.fillRect(x, y, width * (bossHealth / 30), 6);
    bossHealthBar.lineStyle(1, 0xffffff, 1);
    bossHealthBar.strokeRect(x, y, width, 6);
}

function bossShoot() {
    const angle = Phaser.Math.Angle.Between(boss.x, boss.y, player.x, player.y);
    const velocity = boss.scene.physics.velocityFromRotation(angle, 400);
    const b = bossBullets.create(boss.x, boss.y, 'enemyBullet');
    b.setCollideWorldBounds(false);
    b.body.allowGravity = false;
    b.setVelocity(velocity.x, velocity.y);
}

function hitBoss(bullet, bossObj) {
    bullet.destroy();
    bossHealth--;
    if (bossHealth <= 0) {
        bossHealthBar.destroy();
        bossObj.destroy();
        if (bossCollider) {
            bossCollider.destroy();
            bossCollider = null;
        }
        if (bossPlayerCollider) {
            bossPlayerCollider.destroy();
            bossPlayerCollider = null;
        }
        boss = null;
        score += 150; // boss worth 150 points
        scoreText.setText('Score: ' + score);
    }
}

function playerHitByBullet(playerObj, bullet) {
    bullet.destroy();
    health--;
    healthText.setText('Health: ' + health);
}

function enemyShoot(enemy) {
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
    const velocity = enemy.scene.physics.velocityFromRotation(angle, 300);
    const b = enemyBullets.create(enemy.x, enemy.y, 'enemyBullet');
    b.setCollideWorldBounds(false);
    b.body.allowGravity = false;
    b.setVelocity(velocity.x, velocity.y);
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
    const type = Phaser.Math.Between(0, 2);
    if (type === 0) {
        enemy.ability = 'fast';
    } else if (type === 1) {
        enemy.ability = 'shoot';
        enemy.shootTimer = 0;
    } else {
        enemy.ability = 'normal';
    }
}

function spawnPowerup() {
    const types = ['speed', 'heal', 'multi', 'bspeed'];
    const type = types[Phaser.Math.Between(0, types.length - 1)];
    const x = Phaser.Math.Between(50, WORLD_SIZE - 50);
    const y = Phaser.Math.Between(50, WORLD_SIZE - 50);
    const p = powerups.create(x, y, type);
    p.type = type;
}

function collectPowerup(playerObj, power) {
    if (power.type === 'speed') {
        speed += 50;
    } else if (power.type === 'heal') {
        health += 1;
        healthText.setText('Health: ' + health);
    } else if (power.type === 'multi') {
        bulletCount += 1;
    } else if (power.type === 'bspeed') {
        bulletSpeed += 100;
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
