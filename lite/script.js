// --- SOZLAMALAR ---
const urlParams = new URLSearchParams(window.location.search);
const currentFloor = urlParams.get('floor') || "1";

// Elementlar
const startScreen = document.getElementById('start-screen');
const roomListContainer = document.getElementById('room-list-container');
const roomList = document.getElementById('room-list');
const btnReset = document.getElementById('btn-reset');
const worldRoot = document.getElementById('world-root');
const videoElement = document.getElementById('bg-video');

let initialHeading = null; // Boshlang'ich burilish burchagi

// 1. MA'LUMOTNI YUKLASH
fetch('../data.json')
    .then(res => res.json())
    .then(data => {
        const rooms = data[currentFloor];
        if(rooms) renderRooms(rooms);
    });

function renderRooms(rooms) {
    roomList.innerHTML = '';
    rooms.forEach(room => {
        const div = document.createElement('div');
        div.className = 'room-item';
        div.innerHTML = `<b>${room.title}</b><br><small>${room.side === 'left' ? 'Chap tomonda' : 'O\'ng tomonda'}</small>`;
        div.onclick = () => startNavigation(room);
        roomList.appendChild(div);
    });
}

// 2. KAMERA VA SENSORLARNI ISHGA TUSHIRISH
document.getElementById('start-btn').onclick = async () => {
    // A. Kamerani yoqish
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        videoElement.srcObject = stream;
    } catch (err) {
        alert("Kameraga ruxsat berilmadi!");
        return;
    }

    // B. Kompas (DeviceOrientation) ruxsati (iOS uchun)
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== 'granted') {
            alert("Sensorga ruxsat kerak!");
            return;
        }
    }

    // C. Hozirgi yo'nalishni 'lock' qilish
    window.addEventListener('deviceorientation', setInitialHeading, { once: true });

    // UI o'zgarishi
    startScreen.style.display = 'none';
    roomListContainer.style.display = 'block';
};

// Birinchi marta olingan ma'lumot biz uchun "Oldinga" yo'nalishi bo'ladi
function setInitialHeading(e) {
    // iOS: webkitCompassHeading, Android: alpha
    let heading = e.webkitCompassHeading || e.alpha;
    if (heading) {
        initialHeading = heading;
        // Kamerani burab qo'yamiz, shunda 0 gradus hozirgi turgan joy bo'ladi
        const cam = document.getElementById('cam');
        // A-Frame rotation Y o'qi bo'yicha teskari ishlashi mumkin, shunga qarab to'g'irlaymiz
        cam.setAttribute('rotation', `0 ${heading} 0`); 
    }
}

// 3. NAVIGATSIYA CHIZMASI
function startNavigation(room) {
    roomListContainer.style.display = 'none';
    btnReset.style.display = 'block';
    worldRoot.innerHTML = ''; // Tozalash

    // 3DoF da biz foydalanuvchi yurganini bilmaymiz.
    // Shuning uchun shunchaki yo'nalish ko'rsatuvchi "yo'lak" chizamiz.
    
    const distance = room.x; // Masofa
    const sideOffset = room.side === 'left' ? -1.5 : 1.5;

    // A. Strelkalar (Xuddi 6DoF dagi kabi, lekin bu yerda ular 'suzib' yuradi)
    for(let i=1; i<distance; i+=1.5) {
        const arrow = document.createElement('a-entity');
        arrow.setAttribute('geometry', 'primitive: plane; width: 0.5; height: 0.5');
        arrow.setAttribute('material', 'src: url(https://cdn-icons-png.flaticon.com/512/56/56889.png); transparent: true; color: #00d2ff');
        
        // Yerga yotqizish (-90)
        arrow.setAttribute('rotation', '-90 0 0');
        // Z bo'yicha oldinga joylashtiramiz
        arrow.setAttribute('position', `0 -1 -${i}`); 
        
        worldRoot.appendChild(arrow);
    }

    // B. Manzil belgisi
    const pin = document.createElement('a-entity');
    pin.setAttribute('geometry', 'primitive: cone; radiusBottom: 0.3; height: 1');
    pin.setAttribute('material', 'color: lime');
    pin.setAttribute('position', `${sideOffset} 0 -${distance}`);
    
    // Manzil yozuvi
    const text = document.createElement('a-text');
    text.setAttribute('value', room.title);
    text.setAttribute('align', 'center');
    text.setAttribute('scale', '2 2 2');
    text.setAttribute('position', `${sideOffset} 1 -${distance}`);
    
    worldRoot.appendChild(pin);
    worldRoot.appendChild(text);
}

// 4. QAYTA BOSHLASH
window.resetApp = function() {
    worldRoot.innerHTML = '';
    btnReset.style.display = 'none';
    roomListContainer.style.display = 'block';
}