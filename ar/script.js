// --- SOZLAMALAR ---
const FLOOR_HEIGHT = 0; // Pol sathi (0 = oyoq osti)
const ARROW_SPACING = 1.5; // Strelkalar orasi (metrda)

// URL dan qavatni olamiz (?floor=2)
const urlParams = new URLSearchParams(window.location.search);
const currentFloor = urlParams.get('floor') || "1";

// DOM Elementlar
const uiContainer = document.getElementById('ui-container');
const startScreen = document.getElementById('start-screen');
const roomListContainer = document.getElementById('room-list-container');
const roomList = document.getElementById('room-list');
const hud = document.getElementById('hud');
const distVal = document.getElementById('dist-val');
const hudHint = document.getElementById('hud-hint');
const btnReset = document.getElementById('btn-reset');
const arWorld = document.getElementById('ar-world');

// Holat o'zgaruvchilari
let targetData = null; // Tanlangan xona ma'lumoti
let isNavigating = false;

// Qavatni ko'rsatib turish
document.getElementById('floor-indicator').innerText = `${currentFloor}-qavat ma'lumotlari yuklanmoqda...`;

// 1. MA'LUMOTLARNI YUKLASH (Umumiy bazadan)
fetch('../data.json')
    .then(response => response.json())
    .then(data => {
        const rooms = data[currentFloor];
        
        if (!rooms) {
            document.getElementById('floor-indicator').innerText = "Bu qavat bo'yicha ma'lumot topilmadi.";
            return;
        }

        document.getElementById('floor-indicator').innerText = `${currentFloor}-qavat. Xonalar soni: ${rooms.length}`;
        renderRooms(rooms);
    })
    .catch(err => {
        console.error("JSON Xatolik:", err);
        document.getElementById('floor-indicator').innerText = "Internet yoki baza xatosi!";
    });

// 2. RO'YXATNI CHIZISH
function renderRooms(rooms) {
    roomList.innerHTML = '';
    rooms.forEach(room => {
        const div = document.createElement('div');
        div.className = 'room-item';
        div.innerHTML = `
            <div>
                <div class="room-title">${room.title}</div>
                <div class="room-desc">${room.desc || ''}</div>
            </div>
            <div class="room-arrow">➤</div>
        `;
        
        // Bosilganda navigatsiyani boshlash
        div.onclick = () => startNavigation(room);
        roomList.appendChild(div);
    });
}

// 3. AR BOSHLASH (Start tugmasi)
document.getElementById('start-btn').onclick = async () => {
    try {
        // iOS 13+ uchun datchik ruxsati
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            const permission = await DeviceOrientationEvent.requestPermission();
            if (permission !== 'granted') {
                alert("Navigatsiya ishlashi uchun datchiklarga ruxsat bering!");
                return;
            }
        }

        // WebXR sahnaga kirish
        const scene = document.querySelector('a-scene');
        await scene.enterAR();

        // UI o'zgarishi
        startScreen.style.display = 'none';
        roomListContainer.style.display = 'block'; // Ro'yxatni ochamiz

    } catch (e) {
        console.error(e);
        alert("AR xatolik: " + e.message);
    }
};

// 4. NAVIGATSIYANI BOSHLASH (Xona tanlanganda)
function startNavigation(room) {
    targetData = room;
    isNavigating = true;

    // UI ni yopib, HUD ni ochamiz
    roomListContainer.style.display = 'none';
    hud.style.display = 'block';
    btnReset.style.display = 'block';

    // Hint: Qaysi tomonga
    hudHint.innerText = `To'g'riga va ${room.side === 'left' ? 'chapga' : 'o\'ngda'}`;

    // Sahnani tozalash (eski strelkalar o'chadi)
    arWorld.innerHTML = '';

    // AR Elementlarni chizish
    drawPath(room);
}

// 5. AR CHIZMOLAR (Strelkalar va Manzil)
function drawPath(room) {
    const distance = room.x; // JSON dagi 'x' bu aslida yo'lak uzunligi (Z o'qi bo'ylab ketamiz)
    
    // WebXR da oldinga yurish -Z o'qi hisoblanadi.
    // Biz 0 dan boshlab -distance gacha strelka qo'yib chiqamiz.

    const numArrows = Math.floor(distance / ARROW_SPACING);

    // A. Yerdagi strelkalar
    for (let i = 1; i <= numArrows; i++) {
        const zPos = -(i * ARROW_SPACING); // Oldinga qarab minus bo'lib ketadi
        
        const arrow = document.createElement('a-entity');
        
        // Uchburchak shakli
        arrow.setAttribute('geometry', 'primitive: triangle; vertexA: 0 0.1 0; vertexB: -0.15 -0.15 0; vertexC: 0.15 -0.15 0');
        arrow.setAttribute('material', 'color: #00d2ff; shader: flat; side: double; transparent: true; opacity: 0.8');
        
        // Joylashuvi (Yerni ustida sal ko'tarilib turadi)
        arrow.setAttribute('position', `0 0.05 ${zPos}`);
        
        // Yerga yotqizish (-90 X)
        arrow.setAttribute('rotation', '-90 0 0');

        // Animatsiya: Oldinga siljib turish effekti
        arrow.setAttribute('animation', `property: position; to: 0 0.05 ${zPos - 0.5}; dir: alternate; loop: true; dur: 1000; easing: easeInOutSine`);

        arWorld.appendChild(arrow);
    }

    // B. Manzil Belgisi (Destination Pin)
    const pin = document.createElement('a-entity');
    
    // Xona eshigi qaysi tomonda? (O'ng yoki Chap)
    // Agar left bo'lsa X = -1.5, right bo'lsa X = 1.5
    const xOffset = room.side === 'left' ? -1.5 : 1.5;
    const finalZ = -distance;

    // Konus shakli (Pin)
    pin.setAttribute('geometry', 'primitive: cone; radiusBottom: 0.2; height: 1; segmentsRadial: 10');
    pin.setAttribute('material', 'color: #00ff00; emissive: #00ff00; emissiveIntensity: 0.5');
    
    pin.setAttribute('position', `${xOffset} 1.5 ${finalZ}`);
    
    // Pirildoq animatsiya
    pin.setAttribute('animation', 'property: rotation; to: 0 360 0; loop: true; dur: 3000; easing: linear');

    // Manzil yozuvi
    const text = document.createElement('a-text');
    text.setAttribute('value', room.title);
    text.setAttribute('align', 'center');
    text.setAttribute('color', '#ffffff');
    text.setAttribute('scale', '2 2 2');
    text.setAttribute('position', `${xOffset} 2.2 ${finalZ}`);
    text.setAttribute('look-at', '#cam'); // Doim kameraga qarab turadi

    arWorld.appendChild(pin);
    arWorld.appendChild(text);
}

// 6. MENYUGA QAYTISH
window.resetNavigation = function() {
    isNavigating = false;
    targetData = null;
    
    // UI
    hud.style.display = 'none';
    btnReset.style.display = 'none';
    roomListContainer.style.display = 'block';
    
    // Sahna tozalanadi
    arWorld.innerHTML = '';
}

// 7. NAVIGATSIYA MANTIGI (Har bir kadrda ishlaydi)
AFRAME.registerComponent('nav-logic', {
    tick: function () {
        if (!isNavigating || !targetData) return;

        const camPos = this.el.camera.el.object3D.position;
        
        // Pifagor teoremasi: Biz turgan joy va manzil (X va Z bo'yicha)
        // Manzil koordinatasi: X (targetData.side ga qarab) va Z (-targetData.x)
        const targetX = targetData.side === 'left' ? -1.5 : 1.5;
        const targetZ = -targetData.x;

        const dx = camPos.x - targetX;
        const dz = camPos.z - targetZ;
        
        // Masofani hisoblash
        const dist = Math.sqrt(dx*dx + dz*dz);

        // UI ni yangilash
        distVal.innerText = dist.toFixed(1);

        // Yetib kelganda
        if (dist < 1.5) {
            hudHint.innerText = "YETIB KELDINGIZ!";
            hudHint.style.color = "#00ff00";
            if(window.navigator.vibrate) window.navigator.vibrate(200);
        } else {
            hudHint.style.color = "#fff";
            hudHint.innerText = `To'g'riga va ${targetData.side === 'left' ? 'chapga' : 'o\'ngda'}`;
        }
    }
});

// Komponentni sahnaga ulash
document.querySelector('a-scene').setAttribute('nav-logic', '');