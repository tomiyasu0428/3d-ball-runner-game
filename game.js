// ゲーム変数
let scene, camera, renderer;
let ball, track;
let obstacles = [];
let grounds = [];
let powerUps = [];
let score = 0;
let level = 1;
let gameActive = true;
let speed = 0.2;
let baseSpeed = 0.2;
let maxSpeed = 0.5;
let acceleration = 0.0005;
let trackWidth = 5;
let trackLength = 100;
let cameraOffset = { x: 0, y: 3, z: 6 };
let obstacleTypes = ['cube', 'cylinder', 'sphere'];
let obstacleColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];
let createObstacleIntervalId;
let createPowerUpIntervalId;
let difficultyIncreaseIntervalId;
let isJumping = false;
let jumpHeight = 0;
let jumpSpeed = 0;
let gravity = 0.01;
let hasPowerUp = false;
let powerUpTime = 0;
let powerUpDuration = 5000; // 5秒間

// キー入力の状態を管理
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false,
    Space: false
};

// 初期化関数
init();
animate();

function init() {
    // シーンの作成
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // 空色
    
    // フォグ効果（遠くのオブジェクトを徐々に霞ませる）
    scene.fog = new THREE.Fog(0x87CEEB, 20, 100);
    
    // カメラの作成
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // レンダラーの作成
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('gameContainer').appendChild(renderer.domElement);
    
    // 光源の追加
    addLights();
    
    // トラックの作成
    createTrack();
    
    // ボールの作成
    createBall();
    
    // 最初の障害物を作成
    createInitialObstacles();
    
    // イベントリスナーの設定
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.getElementById('restartButton').addEventListener('click', restartGame);
    
    // 障害物生成のインターバル設定
    createObstacleIntervalId = setInterval(createObstacle, 2000);
    
    // パワーアップ生成のインターバル設定
    createPowerUpIntervalId = setInterval(createPowerUp, 10000);
    
    // 難易度上昇のインターバル設定
    difficultyIncreaseIntervalId = setInterval(increaseDifficulty, 20000);
}

function addLights() {
    // 環境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    // 太陽光
    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLight.position.set(50, 100, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 500;
    sunLight.shadow.camera.left = -50;
    sunLight.shadow.camera.right = 50;
    sunLight.shadow.camera.top = 50;
    sunLight.shadow.camera.bottom = -50;
    scene.add(sunLight);
    
    // 反対側からの光
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-50, 100, -50);
    scene.add(fillLight);
}

function createTrack() {
    // トラック（地面）の作成
    for (let i = 0; i < 3; i++) {
        const groundGeometry = new THREE.BoxGeometry(trackWidth, 0.5, trackLength);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x555555,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.position.z = -i * trackLength;
        ground.position.y = -0.25;
        ground.receiveShadow = true;
        scene.add(ground);
        grounds.push(ground);
    }
    
    // トラックの両側の壁
    const wallHeight = 1;
    const wallGeometry = new THREE.BoxGeometry(0.5, wallHeight, trackLength * 3);
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513,
        roughness: 0.8,
        metalness: 0.2
    });
    
    // 左の壁
    const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
    leftWall.position.x = -trackWidth / 2 - 0.25;
    leftWall.position.y = wallHeight / 2;
    leftWall.position.z = -trackLength;
    leftWall.receiveShadow = true;
    leftWall.castShadow = true;
    scene.add(leftWall);
    
    // 右の壁
    const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
    rightWall.position.x = trackWidth / 2 + 0.25;
    rightWall.position.y = wallHeight / 2;
    rightWall.position.z = -trackLength;
    rightWall.receiveShadow = true;
    rightWall.castShadow = true;
    scene.add(rightWall);
}

function createBall() {
    // ボールの作成
    const ballRadius = 0.3;
    const ballGeometry = new THREE.SphereGeometry(ballRadius, 32, 32);
    const ballMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x1E90FF,
        roughness: 0.2,
        metalness: 0.7,
        envMap: null
    });
    ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.position.y = ballRadius;
    ball.castShadow = true;
    scene.add(ball);
}

function createInitialObstacles() {
    // 初期の障害物をいくつか作成
    for (let i = 0; i < 10; i++) {
        createObstacleAt(-20 - i * 10);
    }
}

function createObstacle() {
    if (!gameActive) return;
    createObstacleAt(-trackLength * 1.5);
}

function createObstacleAt(zPosition) {
    // 難易度に応じて配置パターンを変更
    let obstacleCount = 1;
    if (level >= 3) {
        // レベル3以上では複数の障害物が同時に出現することがある
        obstacleCount = Math.random() < 0.3 ? 2 : 1;
    }
    if (level >= 5) {
        // レベル5以上では3つの障害物が出現することもある
        obstacleCount = Math.random() < 0.2 ? 3 : (Math.random() < 0.5 ? 2 : 1);
    }
    
    // 障害物を配置する位置を重複しないように選択
    const positions = [];
    for (let i = 0; i < obstacleCount; i++) {
        let xPosition;
        do {
            xPosition = (Math.random() - 0.5) * trackWidth * 0.8;
        } while (positions.some(pos => Math.abs(pos - xPosition) < 1)); // 既存の位置から1以上離す
        
        positions.push(xPosition);
        
        // 障害物の生成
        createSingleObstacle(xPosition, zPosition);
    }
}

function createSingleObstacle(xPosition, zPosition) {
    // ランダムなオブジェクトタイプを選択
    const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
    
    // ランダムな色を選択
    const color = obstacleColors[Math.floor(Math.random() * obstacleColors.length)];
    
    let obstacle;
    
    switch (type) {
        case 'cube':
            const size = 0.5 + Math.random() * 0.5;
            const cubeGeometry = new THREE.BoxGeometry(size, size, size);
            const cubeMaterial = new THREE.MeshStandardMaterial({ color: color });
            obstacle = new THREE.Mesh(cubeGeometry, cubeMaterial);
            obstacle.position.y = size / 2;
            break;
            
        case 'cylinder':
            const radius = 0.3 + Math.random() * 0.3;
            const height = 0.8 + Math.random() * 0.8;
            const cylinderGeometry = new THREE.CylinderGeometry(radius, radius, height, 16);
            const cylinderMaterial = new THREE.MeshStandardMaterial({ color: color });
            obstacle = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
            obstacle.position.y = height / 2;
            break;
            
        case 'sphere':
            const sphereRadius = 0.3 + Math.random() * 0.3;
            const sphereGeometry = new THREE.SphereGeometry(sphereRadius, 16, 16);
            const sphereMaterial = new THREE.MeshStandardMaterial({ color: color });
            obstacle = new THREE.Mesh(sphereGeometry, sphereMaterial);
            obstacle.position.y = sphereRadius;
            break;
    }
    
    obstacle.position.x = xPosition;
    obstacle.position.z = zPosition;
    obstacle.castShadow = true;
    obstacle.receiveShadow = true;
    
    // 回転速度をランダムに設定
    obstacle.rotation.x = Math.random() * Math.PI;
    obstacle.rotation.y = Math.random() * Math.PI;
    obstacle.rotation.z = Math.random() * Math.PI;
    obstacle.rotationSpeed = {
        x: (Math.random() - 0.5) * 0.03,
        y: (Math.random() - 0.5) * 0.03,
        z: (Math.random() - 0.5) * 0.03
    };
    
    // レベルに応じた高さのバリエーション（ジャンプが必要なものも出現）
    if (level >= 2 && Math.random() < 0.3) {
        obstacle.position.y += 0.5 + Math.random() * 0.5; // 少し浮かせる
        obstacle.requiresJump = true;
    }
    
    scene.add(obstacle);
    obstacles.push(obstacle);
}

function createPowerUp() {
    if (!gameActive) return;
    
    // スターのようなパワーアップアイテムを作成
    const starGeometry = new THREE.OctahedronGeometry(0.4, 0);
    const starMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFFD700, // 金色
        metalness: 1,
        roughness: 0.3,
        emissive: 0xFFD700,
        emissiveIntensity: 0.5
    });
    
    const powerUp = new THREE.Mesh(starGeometry, starMaterial);
    
    // ランダムな位置に配置
    const xPosition = (Math.random() - 0.5) * trackWidth * 0.8;
    powerUp.position.set(xPosition, 1, -trackLength * 1.5);
    
    // 回転をつける
    powerUp.rotation.x = Math.random() * Math.PI;
    powerUp.rotation.y = Math.random() * Math.PI;
    powerUp.rotation.z = Math.random() * Math.PI;
    
    powerUp.rotationSpeed = {
        x: 0.02,
        y: 0.03,
        z: 0.01
    };
    
    // 上下に浮遊するアニメーション用の変数
    powerUp.floatOffset = Math.random() * Math.PI * 2;
    powerUp.floatSpeed = 0.01;
    powerUp.floatHeight = 0.2;
    
    scene.add(powerUp);
    powerUps.push(powerUp);
}

function handleKeyDown(event) {
    if (event.code === 'Space') {
        keys.Space = true;
        // ジャンプ処理
        if (gameActive && !isJumping && ball.position.y <= 0.3) {
            isJumping = true;
            jumpSpeed = 0.2; // 初期のジャンプ速度
        }
    } else if (keys.hasOwnProperty(event.code)) {
        keys[event.code] = true;
    }
}

function handleKeyUp(event) {
    if (event.code === 'Space') {
        keys.Space = false;
    } else if (keys.hasOwnProperty(event.code)) {
        keys[event.code] = false;
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function moveAndRotateBall() {
    // 左右の移動
    if (keys.ArrowLeft && ball.position.x > -trackWidth / 2 + 0.5) {
        ball.position.x -= 0.1;
    }
    if (keys.ArrowRight && ball.position.x < trackWidth / 2 - 0.5) {
        ball.position.x += 0.1;
    }
    
    // 加速と減速
    if (keys.ArrowUp && speed < maxSpeed) {
        speed += acceleration;
    }
    if (keys.ArrowDown && speed > baseSpeed * 0.5) {
        speed -= acceleration * 2;
    }
    
    // ジャンプ処理
    if (isJumping) {
        // ジャンプの物理計算
        ball.position.y += jumpSpeed;
        jumpSpeed -= gravity;
        
        // 地面に着地したらジャンプ終了
        if (ball.position.y <= 0.3 && jumpSpeed < 0) {
            ball.position.y = 0.3;
            isJumping = false;
        }
    }
    
    // ボールを回転させる（前進方向と左右移動に応じて）
    ball.rotation.x -= speed * 2;
    
    if (keys.ArrowLeft) {
        ball.rotation.z += 0.05;
    } else if (keys.ArrowRight) {
        ball.rotation.z -= 0.05;
    } else {
        // 回転を徐々に戻す
        ball.rotation.z *= 0.95;
    }
}

function updateObstacles() {
    // 障害物の更新（移動と回転）
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        
        // 障害物を手前に移動（プレイヤーに向かって）
        obstacle.position.z += speed;
        
        // 障害物を回転
        obstacle.rotation.x += obstacle.rotationSpeed.x;
        obstacle.rotation.y += obstacle.rotationSpeed.y;
        obstacle.rotation.z += obstacle.rotationSpeed.z;
        
        // 障害物が画面外に出たら削除
        if (obstacle.position.z > 10) {
            scene.remove(obstacle);
            obstacles.splice(i, 1);
            
            // スコアを加算（障害物を避けたので）
            score += 10;
            updateScore();
        }
        
        // 衝突判定（パワーアップ中は無敵）
        if (!hasPowerUp && checkCollision(ball, obstacle)) {
            gameOver();
            return;
        }
    }
}

function updatePowerUps() {
    // パワーアップアイテムの更新
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];
        
        // パワーアップを手前に移動
        powerUp.position.z += speed;
        
        // 回転とアニメーション
        powerUp.rotation.x += powerUp.rotationSpeed.x;
        powerUp.rotation.y += powerUp.rotationSpeed.y;
        powerUp.rotation.z += powerUp.rotationSpeed.z;
        
        // 上下の浮遊アニメーション
        powerUp.position.y = 1 + Math.sin(Date.now() * powerUp.floatSpeed + powerUp.floatOffset) * powerUp.floatHeight;
        
        // 画面外に出たら削除
        if (powerUp.position.z > 10) {
            scene.remove(powerUp);
            powerUps.splice(i, 1);
        }
        
        // パワーアップとの衝突判定
        if (checkCollision(ball, powerUp)) {
            // パワーアップ獲得
            activatePowerUp();
            
            // パワーアップをシーンから削除
            scene.remove(powerUp);
            powerUps.splice(i, 1);
        }
    }
    
    // パワーアップの効果時間管理
    if (hasPowerUp) {
        powerUpTime -= 16; // 約16ミリ秒/フレーム
        
        if (powerUpTime <= 0) {
            deactivatePowerUp();
        }
    }
}

function activatePowerUp() {
    hasPowerUp = true;
    powerUpTime = powerUpDuration;
    
    // ボールの色を金色に変更
    ball.material.color.set(0xFFD700);
    ball.material.emissive = new THREE.Color(0xFFD700);
    ball.material.emissiveIntensity = 0.5;
    
    // パワーアップインジケータを表示
    document.getElementById('powerUpIndicator').style.display = 'block';
    
    // スコアボーナス
    score += 50;
    updateScore();
}

function deactivatePowerUp() {
    hasPowerUp = false;
    
    // ボールの色を元に戻す
    ball.material.color.set(0x1E90FF);
    ball.material.emissive = new THREE.Color(0x000000);
    ball.material.emissiveIntensity = 0;
    
    // パワーアップインジケータを非表示
    document.getElementById('powerUpIndicator').style.display = 'none';
}

function updateGrounds() {
    // トラックの更新（無限スクロール）
    for (let i = 0; i < grounds.length; i++) {
        const ground = grounds[i];
        ground.position.z += speed;
        
        // トラックが画面外に出たら、後ろに移動させて再利用
        if (ground.position.z > trackLength / 2) {
            ground.position.z -= trackLength * grounds.length;
        }
    }
}

function checkCollision(object1, object2) {
    // シンプルな距離ベースの衝突判定
    const distance = object1.position.distanceTo(object2.position);
    const collisionThreshold = 0.7; // 衝突判定の距離
    
    return distance < collisionThreshold;
}

function updateScore() {
    document.getElementById('score').textContent = `スコア: ${score}`;
}

function updateLevel() {
    document.getElementById('level').textContent = `レベル: ${level}`;
}

function increaseDifficulty() {
    if (!gameActive) return;
    
    // レベルアップ
    level++;
    updateLevel();
    
    // 最大速度を上げる
    maxSpeed += 0.05;
    
    // 基本速度も少し上げる
    baseSpeed += 0.02;
    
    // 障害物の生成間隔を短くする
    clearInterval(createObstacleIntervalId);
    const newInterval = Math.max(500, 2000 - (level - 1) * 200); // 最小500ミリ秒まで短縮
    createObstacleIntervalId = setInterval(createObstacle, newInterval);
    
    // レベルアップ効果
    ball.material.emissive = new THREE.Color(0x00ff00);
    ball.material.emissiveIntensity = 0.5;
    
    // 一時的な効果を元に戻すタイマー
    setTimeout(() => {
        if (!hasPowerUp) { // パワーアップ中でなければ
            ball.material.emissive = new THREE.Color(0x000000);
            ball.material.emissiveIntensity = 0;
        }
    }, 1000);
}

function gameOver() {
    gameActive = false;
    document.getElementById('finalScore').textContent = `スコア: ${score}`;
    document.getElementById('gameOver').style.display = 'block';
    clearInterval(createObstacleIntervalId);
    clearInterval(createPowerUpIntervalId);
    clearInterval(difficultyIncreaseIntervalId);
}

function restartGame() {
    // ゲーム変数のリセット
    score = 0;
    level = 1;
    speed = 0.2;
    baseSpeed = 0.2;
    maxSpeed = 0.5;
    gameActive = true;
    isJumping = false;
    hasPowerUp = false;
    
    // ボールの位置と回転をリセット
    ball.position.set(0, 0.3, 0);
    ball.rotation.set(0, 0, 0);
    ball.material.color.set(0x1E90FF);
    ball.material.emissive = new THREE.Color(0x000000);
    ball.material.emissiveIntensity = 0;
    
    // 障害物とパワーアップを全て削除
    for (let i = obstacles.length - 1; i >= 0; i--) {
        scene.remove(obstacles[i]);
    }
    obstacles = [];
    
    for (let i = powerUps.length - 1; i >= 0; i--) {
        scene.remove(powerUps[i]);
    }
    powerUps = [];
    
    // スコアとレベル表示のリセット
    updateScore();
    updateLevel();
    document.getElementById('powerUpIndicator').style.display = 'none';
    
    // ゲームオーバー画面を非表示
    document.getElementById('gameOver').style.display = 'none';
    
    // 新しい障害物を作成
    createInitialObstacles();
    
    // インターバルを再設定
    createObstacleIntervalId = setInterval(createObstacle, 2000);
    createPowerUpIntervalId = setInterval(createPowerUp, 10000);
    difficultyIncreaseIntervalId = setInterval(increaseDifficulty, 20000);
}

function animate() {
    requestAnimationFrame(animate);
    
    if (gameActive) {
        // スコア加算（時間ベース）
        score += 1;
        if (score % 5 === 0) {
            updateScore();
        }
        
        // ボールの移動と回転
        moveAndRotateBall();
        
        // 障害物の更新
        updateObstacles();
        
        // パワーアップの更新
        updatePowerUps();
        
        // トラックの更新
        updateGrounds();
        
        // カメラの位置更新（ボールを追従）
        camera.position.x = ball.position.x + cameraOffset.x;
        camera.position.y = ball.position.y + cameraOffset.y;
        camera.position.z = ball.position.z + cameraOffset.z;
        camera.lookAt(ball.position.x, ball.position.y, ball.position.z - 2);
    }
    
    // レンダリング
    renderer.render(scene, camera);
}