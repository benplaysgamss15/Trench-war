/**
 * 1917: FRIENDLY SQUAD AI - MONKEY PATCH (v2.0)
 * - Independent clock to prevent frame-delta conflicts
 * - Active trench patrol and walking animations
 * - Slower, high-accuracy rifle fire with visible tracers
 * - Dynamic battlefield voice chatter feed
 * - Smart Machine Gun usage and player yielding
 */
(function () {
    console.log("[Patch] Initializing Upgraded Friendly Squad AI...");

    // Dedicated patch clock (prevents delta collision with main game clock)
    const patchClock = new THREE.Clock();

    const friendlySquad = [];
    let chatterBox = null;
    let friendlyMGOperator = null;
    let chatterCooldown = 2.0;

    const SQUAD_CALLOUTS = [
        "Hostiles spotted advancing across the wire!",
        "Aim center mass! Make every round count!",
        "Keep low! Snipers in the treeline!",
        "Good hit! Target down!",
        "Enemy stormtroopers pushing the left flank!",
        "Cycling bolt! Covering fire!",
        "Down! Sandbags taking hits!",
        "Hold the line, lads! Don't let them breach!"
    ];

    // 1. Inject Chatter Styles & HUD
    function setupChatterUI() {
        if (!document.getElementById('squad-chatter-style')) {
            const style = document.createElement('style');
            style.id = 'squad-chatter-style';
            style.innerHTML = `
                @keyframes chatterSlideIn {
                    0% { opacity: 0; transform: translateX(-15px); }
                    12% { opacity: 1; transform: translateX(0); }
                    80% { opacity: 1; transform: translateX(0); }
                    100% { opacity: 0; transform: translateY(-8px); }
                }
                .squad-msg {
                    background: rgba(18, 14, 10, 0.92);
                    border-left: 4px solid #d1a868;
                    border-top: 1px solid rgba(209, 168, 104, 0.3);
                    border-bottom: 1px solid rgba(209, 168, 104, 0.3);
                    padding: 6px 12px;
                    font-size: 12px;
                    color: #f5eedf;
                    text-shadow: 1px 1px 3px #000;
                    border-radius: 3px;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.7);
                    animation: chatterSlideIn 6s forwards ease-in-out;
                    pointer-events: none;
                }
            `;
            document.head.appendChild(style);
        }

        if (!document.getElementById('squad-chatter-box')) {
            chatterBox = document.createElement('div');
            chatterBox.id = 'squad-chatter-box';
            chatterBox.style.cssText = `
                position: absolute;
                top: 75px;
                left: 15px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                max-width: 320px;
                pointer-events: none;
                z-index: 50;
                font-family: 'Courier New', Courier, monospace;
            `;
            document.body.appendChild(chatterBox);
        }
    }

    function addChatter(sender, message) {
        if (!chatterBox) setupChatterUI();
        const msg = document.createElement('div');
        msg.className = 'squad-msg';
        msg.innerHTML = `<strong style="color: #ffd992;">${sender}:</strong> "${message}"`;
        chatterBox.appendChild(msg);

        setTimeout(() => {
            if (msg.parentNode) msg.parentNode.removeChild(msg);
        }, 6000);
    }

    // 2. Create Tracer Bullet Visual Effect
    function drawTracer(startPos, endPos) {
        const material = new THREE.LineBasicMaterial({ color: 0xffe066, linewidth: 2 });
        const points = [startPos.clone(), endPos.clone()];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        scene.add(line);

        setTimeout(() => {
            scene.remove(line);
            geometry.dispose();
            material.dispose();
        }, 60);
    }

    // 3. Build Allied Khaki Soldier Model with Rigged Limbs
    function createAlliedSoldierMesh() {
        const soldier = new THREE.Group();

        const khakiMat = new THREE.MeshLambertMaterial({ color: 0x6e654e }); // British Khaki
        const trousersMat = new THREE.MeshLambertMaterial({ color: 0x544d3b });
        const leatherMat = new THREE.MeshLambertMaterial({ color: 0x2e1d11 });
        const skinMat = new THREE.MeshLambertMaterial({ color: 0xc89874 });
        const brodieMat = new THREE.MeshLambertMaterial({ color: 0x4a4a3b });
        const gunWoodMat = new THREE.MeshLambertMaterial({ color: 0x482b18 });
        const gunMetalMat = new THREE.MeshLambertMaterial({ color: 0x1c1c1c });

        // Torso
        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.20, 0.65, 8), khakiMat);
        torso.position.y = 0.95;
        soldier.add(torso);

        const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.08, 8), leatherMat);
        belt.position.y = 0.7;
        soldier.add(belt);

        // Head & Brodie Helmet
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), skinMat);
        head.position.y = 1.42;
        soldier.add(head);

        const brodieDome = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 6), brodieMat);
        brodieDome.position.set(0, 1.48, 0);
        soldier.add(brodieDome);

        const brodieBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.30, 0.03, 12), brodieMat);
        brodieBrim.position.set(0, 1.46, 0);
        soldier.add(brodieBrim);

        // Limbs
        const legGeo = new THREE.CylinderGeometry(0.08, 0.065, 0.65, 6);
        const leftLeg = new THREE.Mesh(legGeo, trousersMat);
        leftLeg.position.set(-0.12, 0.35, 0);
        soldier.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeo, trousersMat);
        rightLeg.position.set(0.12, 0.35, 0);
        soldier.add(rightLeg);

        const armGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.55, 6);
        const leftArm = new THREE.Mesh(armGeo, khakiMat);
        leftArm.position.set(-0.28, 1.05, 0.08);
        leftArm.rotation.x = 0.6;
        soldier.add(leftArm);

        const rightArm = new THREE.Mesh(armGeo, khakiMat);
        rightArm.position.set(0.28, 1.05, 0.12);
        rightArm.rotation.x = 0.9;
        soldier.add(rightArm);

        // SMLE Rifle with Flash
        const rifleMesh = new THREE.Group();
        const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 1.0), gunWoodMat);
        const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.1, 6), gunMetalMat);
        gunBarrel.rotateX(Math.PI / 2);
        gunBarrel.position.set(0, 0.03, -0.1);

        const flash = new THREE.Mesh(new THREE.SphereGeometry(0.12, 5, 5), new THREE.MeshBasicMaterial({ color: 0xffbb33 }));
        flash.position.set(0, 0.03, -0.7);
        flash.visible = false;

        rifleMesh.add(gunBody);
        rifleMesh.add(gunBarrel);
        rifleMesh.add(flash);
        rifleMesh.position.set(0.15, 0.9, 0.28);
        rifleMesh.rotation.x = 0.5;
        soldier.add(rifleMesh);

        return {
            group: soldier,
            leftLeg: leftLeg,
            rightLeg: rightLeg,
            leftArm: leftArm,
            rightArm: rightArm,
            rifle: rifleMesh,
            flash: flash
        };
    }

    // 4. Spawn Active Squad
    function spawnSquad() {
        for (let s of friendlySquad) {
            if (s.mesh && s.mesh.parent) scene.remove(s.mesh);
        }
        friendlySquad.length = 0;
        friendlyMGOperator = null;

        const positions = [-18, -8, 8, 18];
        const names = ["Cpl. Miller", "Pvt. Dawson", "Pvt. Higgins", "Pvt. Evans"];

        for (let i = 0; i < positions.length; i++) {
            const data = createAlliedSoldierMesh();
            const startX = positions[i];
            data.group.position.set(startX, 0.15, 19.8);
            scene.add(data.group);

            friendlySquad.push({
                name: names[i],
                mesh: data.group,
                limbs: data,
                homeX: startX,
                targetX: startX + (Math.random() - 0.5) * 6,
                isMoving: false,
                walkSpeed: 1.6 + Math.random() * 0.4,
                health: 200,
                isCrouching: false,
                isOperatingMG: false,
                shootCooldown: 2.0 + i * 1.0, // Staggered initial shots
                repositionTimer: 4.0 + Math.random() * 4.0,
                animSeed: Math.random() * 20
            });
        }

        setTimeout(() => addChatter("Cpl. Miller", "Squad in position! Manning the parapet!"), 1000);
    }

    // 5. Squad AI Logic: Active Patrol, Slow Accurate Fire, Machine Gun Support
    function updateFriendlySquad(dt) {
        if (!isGameRunning || typeof enemies === 'undefined') return;

        // Periodic Voice Chatter
        chatterCooldown -= dt;
        if (chatterCooldown <= 0 && enemies.length > 0) {
            chatterCooldown = 7.0 + Math.random() * 5.0;
            const living = friendlySquad.filter(s => s.health > 0);
            if (living.length > 0) {
                const speaker = living[Math.floor(Math.random() * living.length)];
                const line = SQUAD_CALLOUTS[Math.floor(Math.random() * SQUAD_CALLOUTS.length)];
                addChatter(speaker.name, line);
            }
        }

        const playerDistToMG = player.pos.distanceTo(new THREE.Vector3(0, 1.15, 19.5));

        for (let i = 0; i < friendlySquad.length; i++) {
            const ai = friendlySquad[i];
            if (ai.health <= 0) continue;

            // --- MACHINE GUN LOGIC ---
            // An AI will occasionally man the MG if free and enemies are active
            if (!player.isMountedMG && playerDistToMG > 4.5 && !friendlyMGOperator && enemies.length > 0) {
                if (Math.random() < 0.005) {
                    friendlyMGOperator = ai;
                    ai.isOperatingMG = true;
                    addChatter(ai.name, "Taking the Maxim gun! Laying down suppression!");
                }
            }

            // Immediately yield to player
            if (ai.isOperatingMG && (player.isMountedMG || playerDistToMG <= 3.8)) {
                ai.isOperatingMG = false;
                friendlyMGOperator = null;
                ai.targetX = ai.homeX;
                addChatter(ai.name, "Gun is all yours, Sarge! Falling back to the line!");
            }

            if (ai.isOperatingMG) {
                ai.mesh.position.set(0, 0.45, 19.2);
                ai.limbs.rifle.visible = false;

                const mgTarget = findBestTarget(ai.mesh.position);
                if (mgTarget) {
                    ai.mesh.lookAt(mgTarget.mesh.position.x, 0.45, mgTarget.mesh.position.z);
                    if (typeof mountedMGGroup !== 'undefined') {
                        mountedMGGroup.rotation.y = ai.mesh.rotation.y - Math.PI;
                    }

                    ai.shootCooldown -= dt;
                    if (ai.shootCooldown <= 0) {
                        ai.shootCooldown = 0.14; // Controlled MG fire rate
                        if (typeof audio !== 'undefined' && audio.playMGFire) audio.playMGFire();
                        if (typeof mgFlashMesh !== 'undefined') {
                            mgFlashMesh.visible = true;
                            setTimeout(() => { if (typeof mgFlashMesh !== 'undefined') mgFlashMesh.visible = false; }, 35);
                        }

                        // High accuracy MG shot
                        mgTarget.health -= 35;
                        const hitPos = mgTarget.mesh.position.clone().add(new THREE.Vector3(0, 1.0, 0));
                        drawTracer(new THREE.Vector3(0, 0.7, 18.2), hitPos);
                        if (typeof createHitSparks === 'function') createHitSparks(hitPos, 0xaa1111);
                        if (mgTarget.health <= 0 && typeof killEnemy === 'function') {
                            killEnemy(mgTarget, hitPos);
                        }
                    }
                }
                continue;
            }

            // --- STANDARD TRENCH PATROL & MOVEMENT ---
            ai.limbs.rifle.visible = true;

            // Reposition / Trench Bay Patrol Timer
            ai.repositionTimer -= dt;
            if (ai.repositionTimer <= 0) {
                ai.repositionTimer = 5.0 + Math.random() * 5.0;
                // Choose a new spot near their home section
                ai.targetX = ai.homeX + (Math.random() - 0.5) * 8.0;
                ai.isCrouching = Math.random() < 0.25; // Occasional crouch for reload/cover
            }

            // Move smoothly along the X axis
            const dx = ai.targetX - ai.mesh.position.x;
            if (Math.abs(dx) > 0.2) {
                const dir = Math.sign(dx);
                ai.mesh.position.x += dir * ai.walkSpeed * dt;

                // Leg swing walking animation
                const walkCycle = Math.sin(patchClock.getElapsedTime() * 7 + ai.animSeed);
                ai.limbs.leftLeg.rotation.x = walkCycle * 0.5;
                ai.limbs.rightLeg.rotation.x = -walkCycle * 0.5;
                ai.mesh.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
            } else {
                // Standing still at firing step
                ai.limbs.leftLeg.rotation.x = 0;
                ai.limbs.rightLeg.rotation.x = 0;
            }

            // Height adaptation (Standing on step vs ducked)
            const targetY = ai.isCrouching ? -0.8 : 0.15;
            ai.mesh.position.y += (targetY - ai.mesh.position.y) * 0.12;

            // --- ACCURATE, DELIBERATE RIFLE SHOOTING ---
            const target = findBestTarget(ai.mesh.position);

            if (target && !ai.isCrouching && Math.abs(dx) <= 0.3) {
                // Aim at the enemy
                ai.mesh.lookAt(target.mesh.position.x, 0.15, target.mesh.position.z);

                ai.shootCooldown -= dt;
                if (ai.shootCooldown <= 0) {
                    // Slow, realistic fire rate: 3.5 - 5.0 seconds between shots
                    ai.shootCooldown = 3.5 + Math.random() * 1.5;

                    if (typeof audio !== 'undefined' && audio.playRifleFire) audio.playRifleFire();

                    // Flash on rifle barrel
                    ai.limbs.flash.visible = true;
                    setTimeout(() => { ai.limbs.flash.visible = false; }, 50);

                    const muzzleWorldPos = new THREE.Vector3();
                    ai.limbs.flash.getWorldPosition(muzzleWorldPos);
                    const targetChest = target.mesh.position.clone().add(new THREE.Vector3(0, 1.1, 0));

                    // 85% Accuracy: Hits reliably
                    if (Math.random() < 0.85) {
                        drawTracer(muzzleWorldPos, targetChest);
                        target.health -= 75; // Substantial damage (kills weak or 2-shot kill)

                        if (typeof createHitSparks === 'function') {
                            createHitSparks(targetChest, 0xaa1111);
                        }

                        if (target.health <= 0) {
                            if (typeof killEnemy === 'function') {
                                killEnemy(target, targetChest);
                            }
                            addChatter(ai.name, "Got one! Target neutralized!");
                        }
                    } else {
                        // Near-miss tracer
                        const missTarget = targetChest.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, 0, 0));
                        drawTracer(muzzleWorldPos, missTarget);
                    }
                }
            } else if (!target && Math.abs(dx) <= 0.3) {
                // Face No Man's Land when idle
                ai.mesh.rotation.y = 0;
            }
        }
    }

    // Find the closest active enemy
    function findBestTarget(fromPos) {
        if (typeof enemies === 'undefined' || enemies.length === 0) return null;
        let closest = null;
        let minDist = 9999;

        for (let i = 0; i < enemies.length; i++) {
            const e = enemies[i];
            if (e.isDead || !e.mesh) continue;
            const dist = fromPos.distanceTo(e.mesh.position);
            if (dist < minDist) {
                minDist = dist;
                closest = e;
            }
        }
        return closest;
    }

    // --- MONKEY PATCH HOOKS ---

    // 1. Hook startGame
    const originalStartGame = window.startGame;
    window.startGame = function () {
        if (typeof originalStartGame === 'function') {
            originalStartGame.apply(this, arguments);
        }
        setupChatterUI();
        spawnSquad();
    };

    // 2. Hook animate (Game Loop)
    const originalAnimate = window.animate;
    window.animate = function () {
        if (typeof originalAnimate === 'function') {
            originalAnimate.apply(this, arguments);
        }
        // Use our independent patchClock delta
        const dt = Math.min(patchClock.getDelta(), 0.1);
        updateFriendlySquad(dt);
    };

    // 3. Hook toggleMountMG
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

    console.log("[Patch] Friendly Squad AI loaded and hooked successfully!");
})();
