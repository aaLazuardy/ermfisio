/**
 * License & Lock Screen Renderer
 * Handles license checking, activation, and the lock screen interface.
 */

let licenseInterval;

async function checkLicense() {
    const savedKey = localStorage.getItem('erm_license_key');
    const savedExpiry = localStorage.getItem('erm_license_expiry');
    const savedStatus = localStorage.getItem('erm_license_status');

    if (!savedKey) {
        renderLockScreen();
        return;
    }

    // 2. Cek Expiry Lokal (Supaya bisa offline sementara)
    if (savedStatus === 'ACTIVE' && savedExpiry) {
        // Parse "dd MMM yyyy HH:mm" manually
        const parts = savedExpiry.split(' ');
        const monthMap = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11 };

        let expDate = new Date();
        if (parts.length >= 3) {
            const d = parseInt(parts[0]);
            const m = monthMap[parts[1]] !== undefined ? monthMap[parts[1]] : 0;
            const y = parseInt(parts[2]);
            expDate.setFullYear(y, m, d);

            if (parts[3]) {
                const timeParts = parts[3].split(':');
                expDate.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), 0);
            } else {
                expDate.setHours(23, 59, 59);
            }
        } else {
            expDate = new Date(savedExpiry);
        }

        const now = new Date();
        if (now > expDate) {
            renderLockScreen("Masa aktif lisensi Anda telah habis.");
            return;
        }
    }

    // 3. Background Validation (Ke Server Lisensi PUSAT)
    renderApp();

    if (navigator.onLine && typeof LICENSE_API_URL !== 'undefined' && LICENSE_API_URL) {
        try {
            // Add Timestamp to bust cache
            const response = await fetch(`${LICENSE_API_URL}?action=check_license&key=${savedKey}&t=${Date.now()}`);

            if (!response.ok) throw new Error("Server Error: " + response.status);

            const result = await response.json();

            if (result.valid) {
                localStorage.setItem('erm_license_expiry', result.expires);
                if (result.expires_iso) localStorage.setItem('erm_license_expiry_iso', result.expires_iso);
                localStorage.setItem('erm_license_plan', result.plan);
                localStorage.setItem('erm_license_status', 'ACTIVE');
                updateLicenseCountdown();
            } else {
                localStorage.setItem('erm_license_status', 'EXPIRED');
                renderLockScreen(result.message);
            }
        } catch (e) {
            console.log("License Server Unreachable. Using Cached Status.");
        }
    }
}

function renderLockScreen(msg = "") {
    const appLayout = document.getElementById('app-layout');
    const loginScreen = document.getElementById('login-screen');
    const printContainer = document.getElementById('print-container');

    if (appLayout) appLayout.classList.add('hidden');
    if (loginScreen) loginScreen.classList.add('hidden');
    if (printContainer) printContainer.classList.add('hidden');

    if (document.getElementById('lock-screen-overlay')) return;

    const lockScreen = document.createElement('div');
    lockScreen.id = 'lock-screen-overlay';
    lockScreen.className = "fixed inset-0 bg-slate-900 z-[100000] flex flex-col items-center justify-center p-6 text-white";
    lockScreen.innerHTML = `
        <div class="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-2xl border-4 border-slate-700 animate-pulse">
            <i data-lucide="lock" width="40" class="text-red-500"></i>
        </div>
        <h1 class="text-3xl font-black mb-2 tracking-tight">Aplikasi Terkunci</h1>
        <p class="text-slate-400 mb-8 text-center max-w-md">Silakan masukkan Kode Lisensi Aktif untuk mengakses sistem FISIOTA.</p>
        
        ${msg ? `<div class="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-6 text-sm font-bold flex items-center gap-2"><i data-lucide="alert-triangle" width="16"></i> ${msg}</div>` : ''}

        <div class="w-full max-w-sm space-y-4">
            <div>
                <label class="text-xs font-bold text-slate-500 uppercase block mb-1">Kode Lisensi</label>
                <input type="text" id="license-input" class="w-full bg-slate-800 border-2 border-slate-700 p-4 rounded-xl text-center font-mono text-xl font-bold tracking-widest focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all text-white placeholder-slate-600" placeholder="FISIO-XXXX-XXXX">
            </div>
            <button onclick="activateLicense()" id="btn-activate" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/50 transition-all flex items-center justify-center gap-2 text-lg">
                <i data-lucide="key" width="20"></i> Aktivasi Sekarang
            </button>
            
            <div class="mt-8 pt-8 border-t border-slate-800 text-center">
                <p class="text-xs text-slate-500 mb-2">Belum punya kode?</p>
                <div class="text-sm font-bold text-slate-400">Hubungi Admin FISIOTA</div>
                <div class="text-xs text-slate-600 mt-1">Status: Terhubung ke Pusat</div>
            </div>
        </div>
    `;

    document.body.appendChild(lockScreen);
    lucide.createIcons();
}

async function activateLicense() {
    const key = document.getElementById('license-input').value.trim();
    const btn = document.getElementById('btn-activate');
    const url = typeof LICENSE_API_URL !== 'undefined' ? LICENSE_API_URL : null;

    if (!key) { alert("Masukkan kode dulu!"); return; }
    if (!url) { alert("LICENSE_API_URL tidak ditemukan!"); return; }

    btn.innerHTML = `<i data-lucide="loader-2" class="animate-spin" width="20"></i> Memeriksa...`;
    btn.disabled = true;
    lucide.createIcons();

    try {
        const fetchUrl = `${url}?action=check_license&key=${key}`;
        const resp = await fetch(fetchUrl);
        const result = await resp.json();

        if (result.valid) {
            alert(`✅ AKTIVASI BERHASIL!\n\nPaket: ${result.plan}\nKlien: ${result.client}\nExpired: ${result.expires}`);
            localStorage.setItem('erm_license_key', key);
            localStorage.setItem('erm_license_expiry', result.expires);
            if (result.expires_iso) localStorage.setItem('erm_license_expiry_iso', result.expires_iso);
            if (result.expiry_iso) localStorage.setItem('erm_license_expiry_iso', result.expiry_iso);

            localStorage.setItem('erm_license_status', 'ACTIVE');
            localStorage.setItem('erm_license_plan', result.plan);

            location.reload();
        } else {
            alert(`❌ GAGAL: ${result.message}`);
            btn.innerHTML = `<i data-lucide="key" width="20"></i> Aktivasi Sekarang`;
            btn.disabled = false;
            lucide.createIcons();
        }

    } catch (e) {
        console.error(e);
        alert("Gagal menghubungi Server Pusat.\n\nError: " + e.message);
    }
}

function updateLicenseCountdown() {
    const status = localStorage.getItem('erm_license_status');
    const expiryStr = localStorage.getItem('erm_license_expiry');
    const expiryIso = localStorage.getItem('erm_license_expiry_iso');

    const widget = document.getElementById('license-widget');
    if (status !== 'ACTIVE' || (!expiryStr && !expiryIso)) {
        if (widget) widget.classList.add('hidden');
    } else {
        if (widget) widget.classList.remove('hidden');
    }

    let expDate = new Date();
    if (expiryIso) {
        expDate = new Date(expiryIso);
    } else if (expiryStr) {
        const parts = expiryStr.split(' ');
        const monthMap = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11 };
        if (parts.length >= 3) {
            const d = parseInt(parts[0]);
            const m = monthMap[parts[1]] !== undefined ? monthMap[parts[1]] : 0;
            const y = parseInt(parts[2]);
            expDate.setFullYear(y, m, d);
            if (parts[3]) {
                const timeParts = parts[3].split(':');
                expDate.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), 0);
            } else {
                expDate.setHours(23, 59, 59);
            }
        } else {
            expDate = new Date(expiryStr);
        }
    } else {
        return;
    }

    const now = new Date();
    const diff = expDate - now;
    const planName = localStorage.getItem('erm_license_plan') || 'Active License';

    const confPlan = document.getElementById('conf-lic-plan');
    const confStatus = document.getElementById('conf-lic-status');
    const confExpiry = document.getElementById('conf-lic-expiry');
    const confCount = document.getElementById('conf-lic-countdown');

    if (confPlan) confPlan.innerText = planName;
    if (confStatus) confStatus.innerText = status;
    if (confExpiry) confExpiry.innerText = expiryStr || expiryIso;

    const sidePlan = document.getElementById('lic-plan');
    if (sidePlan) sidePlan.innerText = planName;
    const sideCount = document.getElementById('lic-countdown');

    if (diff <= 0) {
        const expiredText = "EXPIRED";
        if (confCount) confCount.innerText = expiredText;
        if (sideCount) sideCount.innerText = expiredText;
        if (licenseInterval) clearInterval(licenseInterval);
        checkLicense();
    } else {
        const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
        const diffHrs = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const diffSecs = Math.floor((diff % (1000 * 60)) / 1000);

        let shortText = "";
        let longText = "";

        if (diffDays > 0) {
            shortText = `${diffDays} Hari`;
            longText = `${diffDays} Hari ${diffHrs} Jam`;
        } else {
            shortText = `${diffHrs}j ${diffMins}m ${diffSecs}s`;
            longText = `${diffHrs}j ${diffMins}m ${diffSecs}s`;
        }

        if (sideCount) {
            sideCount.innerText = shortText;
            sideCount.className = diffDays < 3 ? "text-orange-400 font-mono font-bold" : "text-blue-400 font-mono font-bold";
        }

        if (confCount) {
            confCount.innerText = longText;
            confCount.className = diffDays < 3 ? "text-5xl font-black text-orange-500 font-mono tracking-tight animate-pulse" : "text-5xl font-black text-blue-600 font-mono tracking-tight";
        }
    }
}

async function refreshLicenseStatus() {
    const btn = document.querySelector('#config-tab-content button'); // Adjust selector as needed
    const oldHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = `<i data-lucide="loader-2" class="animate-spin" width="16"></i> Memeriksa...`;
        btn.disabled = true;
        lucide.createIcons();
    }

    const savedKey = localStorage.getItem('erm_license_key');
    if (!savedKey) {
        alert("Data lisensi lokal tidak lengkap.");
        if (btn) { btn.innerHTML = oldHtml; btn.disabled = false; }
        return;
    }

    try {
        const fetchUrl = `${LICENSE_API_URL}?action=check_license&key=${savedKey}&t=${Date.now()}`;
        const resp = await fetch(fetchUrl);
        const result = await resp.json();

        if (result.valid) {
            localStorage.setItem('erm_license_expiry', result.expires);
            if (result.expires_iso) localStorage.setItem('erm_license_expiry_iso', result.expires_iso);
            localStorage.setItem('erm_license_plan', result.plan);
            localStorage.setItem('erm_license_status', 'ACTIVE');
            alert(`Status Diperbarui!\n\nPaket: ${result.plan}\nExpired Terbaru: ${result.expires}`);
            updateLicenseCountdown();
        } else {
            alert(`Lisensi Tidak Valid / Expired: ${result.message}`);
            localStorage.setItem('erm_license_status', 'EXPIRED');
            checkLicense();
        }
    } catch (e) {
        console.error(e);
        alert("Gagal koneksi ke server Lisensi Pusat. Coba lagi.");
    } finally {
        if (btn) {
            btn.innerHTML = oldHtml;
            btn.disabled = false;
            lucide.createIcons();
        }
    }
}

// Initial license countdown
licenseInterval = setInterval(updateLicenseCountdown, 1000);
setTimeout(updateLicenseCountdown, 2000);
