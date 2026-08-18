/**
 * 1917: FRIENDLY SQUAD AI & MACHINE GUN OPERATOR PATCH (MONKEY PATCH)
 * Hooks into the main game loop, scene, and state dynamically.
 */
(function () {
    console.log("[Patch] Initializing Friendly Squad AI...");

    // Squad State
    const friendlySquad = [];
    let chatterBox = null;
    let friendlyMGOperator = null;
    let chatterTimer = 0;

    const SQUAD_CALLOUTS = [
        "Hostiles charging from the center!",
        "Keep your heads down! Incoming fire!",
        "Take them down before they reach the wire!",
        "Rifle jammed! Cycling bolt!",
        "Concentrate fire on the right flank!",
        "Artillery needed on coordinates!",
        "Down in the trench! Cover!"
    ];

    // 1. Inject Chatter HUD element if not present
    function setupChatterUI() {
        if (document.getElementById('squad-chatter')) return;
        chatterBox = document.createElement('div');
        chatterBox.id = 'squad-chatter';
        chatterBox.style.cssText = `
            position: absolute;
            bottom: 110px;
            left: 20px;
            display: flex;
            flex-direction: column;
            gap: 6px;
            max-width: 320px;
            pointer-events: none;
            z-index: 15;
            font-family: 'Courier New', Courier, monospace;
        `;
        document.body.appendChild(chatterBox);
    }

    function addChatter(sender, message) {
        if (!chatterBox) setupChatterUI();
        const msg = document.createElement('div');
        msg.style.cssText = `
            background: rgba(14, 12, 9, 0.88);
            border-left: 3px solid #d1a868;
            padding: 5px 10px;
            font-size: 12px;
            color: #f1e6d2;
            text-shadow: 1px 1px 2px #000;
            border-radius: 2px;
            animation: fadeMsg 5s forwards ease-in-out;
        `;
        msg.innerHTML = `<strong>${sender}:</strong> "${message}"`;
        chatterBox.appendChild(msg);

        setTimeout(() => {
            if (msg.parentNode) msg.parentNode.removeChild(msg);
        }, 5000);
    }

    // 2. Build British/Allied Khaki Soldier Model
    function createAlliedSoldierMesh() {
        const soldier = new THREE.Group();

        const khakiMat = new THREE.MeshLambertMaterial({ color: 0x6b624a }); // British Khaki
        const trousersMat = new THREE.MeshLambertMaterial({ color: 0x584f3c });
        const leatherMat = new THREE.MeshLambertMaterial({ color: 0x301e12 });
        const skinMat = new THREE.MeshLambertMaterial({ color: 0xc89874 });
        const brodieMat = new THREE.MeshLambertMaterial({ color: 0x48493b }); // Brodie Helmet
        const gunWoodMat = new THREE.MeshLambertMaterial({ color: 0x422616 });
        const gunMetalMat = new THREE.MeshLambertMaterial({ color: 0x1b1b1b });

        // Torso
        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.20, 0.65, 8), khakiMat);
        torso.position.y = 0.95;
        soldier.add(torso);

        // Webbing / Belt
        const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.08, 8), leatherMat);
        belt.position.y = 0.7;
        soldier.add(belt);

        // Head & Brodie Helmet (Dished helmet with wide brim)
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), skinMat);
        head.position.y = 1.42;
        soldier.add(head);

        const brodieDome = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 6), brodieMat);
        brodieDome.position.set(0, 1.48, 0);
        soldier.add(brodieDome);

        const brodieBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.30, 0.03, 12), brodieMat);
        brodieBrim.position.set(0, 1.46, 0);
        soldier.add(brodieBrim);

        // Legs
        const legGeo = new THREE.CylinderGeometry(0.08, 0.065, 0.65, 6);
        const leftLeg = new THREE.Mesh(legGeo, trousersMat);
        leftLeg.position.set(-0.12, 0.35, 0);
        soldier.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeo, trousersMat);
        rightLeg.position.set(0.12, 0.35, 0);
        soldier.add(rightLeg);

        // Arms & SMLE Rifle
        const armGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.55, 6);
        const leftArm = new THREE.Mesh(armGeo, khakiMat);
        leftArm.position.set(-0.28, 1.05, 0.08);
        soldier.add(leftArm);

        const rightArm = new THREE.Mesh(armGeo, khakiMat);
        rightArm.position.set(0.28, 1.05, 0.12);
        soldier.add(rightArm);

        // Lee-Enfield Rifle
        const rifleMesh = new THREE.Group();
        const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 1.0), gunWoodMat);
        const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.1, 6), gunMetalMat);
        gunBarrel.rotateX(Math.PI / 2);
        gunBarrel.position.set(0, 0.03, -0.1);
        rifleMesh.add(gunBody);
        rifleMesh.add(gunBarrel);
        rifleMesh.position.set(0.15, 0.9, 0.28);
        rifleMesh.rotation.x = 0.5;
        soldier.add(rifleMesh);

        return {
            group: soldier,
            leftLeg: leftLeg,
            rightLeg: rightLeg,
            leftArm: leftArm,
            rightArm: rightArm,
            rifle: rifleMesh
        };
    }

    // 3. Spawn Squad Members
    function spawnSquad() {
        // Clear previous squad
        for (let s of friendlySquad) {
            if (s.mesh && s.mesh.parent) scene.remove(s.mesh);
        }
        friendlySquad.length = 0;
        friendlyMGOperator = null;

        const positions = [-12, -5, 6, 14];
        const names = ["Cpl. Miller", "Pvt. Higgins", "Pvt. Dawson", "Pvt. Evans"];

        for (let i = 0; i < positions.length; i++) {
            const data = createAlliedSoldierMesh();
            const posX = positions[i];
            data.group.position.set(posX, 0.15, 19.8);
            scene.add(data.group);

            friendlySquad.push({
                name: names[i],
                mesh: data.group,
                limbs: data,
                homeX: posX,
                health: 160,          // Durable: smart cover usage
                maxHealth: 160,
                isCrouching: false,
                isOperatingMG: false,
                shootCooldown: 2.0 + Math.random() * 2.0,
                duckTimer: 0,
                targetEnemy: null,
                animSeed: Math.random() * 10
            });
        }

        setTimeout(() => addChatter("Cpl. Miller", "Squad in position! Eyes on No Man's Land!"), 1200);
    }

    // 4. Friendly AI Logic (Targeting, Damaging, Cover, and Machine Gun Use)
    function updateFriendlySquad(dt) {
        if (!isGameRunning) return;

        chatterTimer += dt;
        if (chatterTimer > 12.0 && enemies.length > 0) {
            chatterTimer = 0;
            const randomSoldier = friendlySquad[Math.floor(Math.random() * friendlySquad.length)];
            const randomCall = SQUAD_CALLOUTS[Math.floor(Math.random() * SQUAD_CALLOUTS.length)];
            if (randomSoldier && randomSoldier.health > 0) {
                addChatter(randomSoldier.name, randomCall);
            }
        }

        // Distance from player to the central Machine Gun
        const playerDistToMG = player.pos.distanceTo(new THREE.Vector3(0, 1.15, 19.5));

        for (let i = 0; i < friendlySquad.length; i++) {
            const ai = friendlySquad[i];
            if (ai.health <= 0) continue;

            // --- MACHINE GUN LOGIC ---
            // If player is NOT mounted and NOT near the gun, an AI has a chance to man the MG
            if (!player.isMountedMG && playerDistToMG > 4.0 && !friendlyMGOperator && enemies.length > 0) {
                if (Math.random() < 0.003) { // Controlled chance so they don't rush it instantly
                    friendlyMGOperator = ai;
                    ai.isOperatingMG = true;
                    addChatter(ai.name, "Taking the Maxim gun! Providing suppression!");
                }
            }

            // If player walks up to the MG, immediately relinquish it
            if (ai.isOperatingMG && (player.isMountedMG || playerDistToMG <= 3.5)) {
                ai.isOperatingMG = false;
                friendlyMGOperator = null;
                addChatter(ai.name, "Gun is yours, Sarge! Moving to flank!");
            }

            if (ai.isOperatingMG) {
                // Stand behind the mounted MG
                ai.mesh.position.set(0, 0.45, 19.2);
                ai.mesh.rotation.y = Math.PI; // Face forward
                ai.limbs.rifle.visible = false;

                // Fire burst at closest enemy
                ai.shootCooldown -= dt;
                if (ai.shootCooldown <= 0 && enemies.length > 0) {
                    ai.shootCooldown = 0.12; // High rate of fire
                    const target = findClosestEnemy(ai.mesh.position);
                    if (target) {
                        ai.mesh.lookAt(target.mesh.position.x, ai.mesh.position.y, target.mesh.position.z);
                        if (typeof mountedMGGroup !== 'undefined') {
                            mountedMGGroup.rotation.y = ai.mesh.rotation.y - Math.PI;
                        }
                        if (typeof audio !== 'undefined' && audio.playMGFire) audio.playMGFire();
                        if (typeof mgFlashMesh !== 'undefined') {
                            mgFlashMesh.visible = true;
                            setTimeout(() => { if (typeof mgFlashMesh !== 'undefined') mgFlashMesh.visible = false; }, 35);
                        }
                        // Deal actual damage
                        target.health -= 35;
                        if (typeof createHitSparks === 'function') {
                            createHitSparks(target.mesh.position.clone().add(new THREE.Vector3(0, 1.0, 0)), 0xaa1111);
                        }
                        if (target.health <= 0 && typeof killEnemy === 'function') {
                            killEnemy(target);
                        }
                    }
                }
                continue;
            }

            // Normal Trench Patrol & Shooting Mode
            ai.limbs.rifle.visible = true;

            // Ducking / Peek Cycle
            ai.duckTimer -= dt;
            if (ai.duckTimer <= 0) {
                ai.isCrouching = Math.random() < 0.35; // 35% chance to duck into cover
                ai.duckTimer = 3.0 + Math.random() * 3.5;
            }

            // Height adaptation (Standing on firing step vs ducked in trench)
            const targetY = ai.isCrouching ? -0.8 : 0.15;
            ai.mesh.position.y += (targetY - ai.mesh.position.y) * 0.1;

            // Target nearest enemy
            const nearestEnemy = findClosestEnemy(ai.mesh.position);
            if (nearestEnemy && !ai.isCrouching) {
                // Face the enemy
                ai.mesh.lookAt(nearestEnemy.mesh.position.x, ai.mesh.position.y, nearestEnemy.mesh.position.z);

                // Shoot rifle
                ai.shootCooldown -= dt;
                if (ai.shootCooldown <= 0) {
                    ai.shootCooldown = 2.4 + Math.random() * 2.0;

                    if (typeof audio !== 'undefined' && audio.playRifleFire) audio.playRifleFire();

                    // Accuracy check
                    if (Math.random() < 0.65) {
                        nearestEnemy.health -= 50; // Deals real damage
                        if (typeof createHitSparks === 'function') {
                            createHitSparks(nearestEnemy.mesh.position.clone().add(new THREE.Vector3(0, 1.1, 0)), 0xaa1111);
                        }
                        if (nearestEnemy.health <= 0 && typeof killEnemy === 'function') {
                            killEnemy(nearestEnemy);
                        }
                    }
                }
            } else {
                // Idle facing towards No Man's Land
                ai.mesh.rotation.y = 0;
            }
        }
    }

    function findClosestEnemy(fromPos) {
        let closest = null;
        let minDist = 9999;
        if (typeof enemies === 'undefined') return null;

        for (let i = 0; i < enemies.length; i++) {
            const e = enemies[i];
            if (e.isDead) continue;
            const d = fromPos.distanceTo(e.mesh.position);
            if (d < minDist) {
                minDist = d;
                closest = e;
            }
        }
        return closest;
    }

    // --- MONKEY PATCH HOOKS ---

    // 1. Hook into window.startGame to spawn the squad
    const originalStartGame = window.startGame;
    window.startGame = function () {
        if (typeof originalStartGame === 'function') {
            originalStartGame.apply(this, arguments);
        }
        setupChatterUI();
        spawnSquad();
    };

    // 2. Hook into window.animate (Main Game Loop)
    const originalAnimate = window.animate;
    window.animate = function () {
        if (typeof originalAnimate === 'function') {
            originalAnimate.apply(this, arguments);
        }
        // Update friendly squad behavior every frame
        if (typeof clock !== 'undefined') {
            updateFriendlySquad(clock.getDelta());
        }
    };

    // 3. Hook into window.toggleMountMG to clear friendly MG operator when player presses mount
    const originalToggleMountMG = window.toggleMountMG;
    if (typeof originalToggleMountMG === 'function') {
        window.toggleMountMG = function () {
            if (friendlyMGOperator) {
                friendlyMGOperator.isOperatingMG = false;
                friendlyMGOperator = null;
            }
            originalToggleMountMG.apply(this, arguments);
        };
    }

    console.log("[Patch] Friendly Squad AI successfully hooked!");
})();
