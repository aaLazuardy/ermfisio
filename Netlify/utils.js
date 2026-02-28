// --- 2. HELPER FUNCTIONS ---
function today() {
    return new Date().toISOString().slice(0, 10);
}

function calculateAge(dob) {
    if (!dob) return '-';
    const ageDifMs = Date.now() - new Date(dob).getTime();
    const ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
}

function updateDate() {
    const el = document.getElementById('current-date');
    if (el) {
        const now = new Date();
        el.innerText = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
}

function renderIcons() {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    } else {
        setTimeout(renderIcons, 300);
    }
}

function generateNextRM() {
    if (state.patients.length === 0) return 'PX-0001';
    const maxNum = state.patients.reduce((max, p) => {
        const numPart = p.id.includes('-') ? parseInt(p.id.split('-')[1]) : 0;
        return !isNaN(numPart) && numPart > max ? numPart : max;
    }, 0);
    const nextNum = maxNum + 1;
    return `PX-${String(nextNum).padStart(4, '0')}`;
}

function getPatientColor(id) {
    if (!id) return 'bg-slate-100 text-slate-600 border-slate-200';
    const colors = [
        'bg-red-100 text-red-800 border-red-200', 'bg-orange-100 text-orange-800 border-orange-200',
        'bg-amber-100 text-amber-800 border-amber-200', 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'bg-lime-100 text-lime-800 border-lime-200', 'bg-green-100 text-green-800 border-green-200',
        'bg-emerald-100 text-emerald-800 border-emerald-200', 'bg-teal-100 text-teal-800 border-teal-200',
        'bg-cyan-100 text-cyan-800 border-cyan-200', 'bg-sky-100 text-sky-800 border-sky-200',
        'bg-blue-100 text-blue-800 border-blue-200', 'bg-indigo-100 text-indigo-800 border-indigo-200',
        'bg-violet-100 text-violet-800 border-violet-200', 'bg-purple-100 text-purple-800 border-purple-200',
        'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200', 'bg-pink-100 text-pink-800 border-pink-200',
        'bg-rose-100 text-rose-800 border-rose-200'
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) { hash = id.charCodeAt(i) + ((hash << 5) - hash); }
    return colors[Math.abs(hash) % colors.length];
}

function formatDateForDisplay(dateStr) {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (e) {
        return dateStr;
    }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const colors = {
        success: 'bg-white border-emerald-500 text-emerald-800',
        error: 'bg-white border-red-500 text-red-800',
        info: 'bg-white border-blue-500 text-blue-800',
        warning: 'bg-white border-amber-500 text-amber-800'
    };

    const icons = {
        success: 'check-circle',
        error: 'alert-circle',
        info: 'info',
        warning: 'alert-triangle'
    };

    toast.className = `toast-item flex items-center gap-3 p-4 rounded-xl shadow-2xl border-l-4 ${colors[type] || colors.info} mb-3`;
    toast.innerHTML = `
        <i data-lucide="${icons[type] || icons.info}" width="20"></i>
        <p class="text-sm font-bold">${message}</p>
    `;

    container.appendChild(toast);
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Auto remove after 3s
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function getSheetIdFromUrl(url) {
    if (!url) return null;
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
}

function checkOnlineStatus() {
    const status = document.getElementById('sync-status');
    if (status) {
        if (state.scriptUrl && state.scriptUrl.includes("docs.google.com/spreadsheets")) {
            status.classList.remove('hidden');
            status.innerHTML = '<i data-lucide="link" width="12"></i> Sheet Terkoneksi';
        } else {
            status.classList.add('hidden');
        }
    }
    renderIcons();
}

function updateSyncStatusUI(isDirty) {
    const indicator = document.getElementById('sync-indicator');
    if (!indicator) return;

    if (isDirty) {
        indicator.innerHTML = `<span class="flex items-center gap-1 text-orange-500 animate-pulse"><i data-lucide="cloud-off" width="14"></i> <span class="text-[10px] font-bold uppercase">Pending</span></span>`;
    } else {
        indicator.innerHTML = `<span class="flex items-center gap-1 text-emerald-500"><i data-lucide="cloud-check" width="14"></i> <span class="text-[10px] font-bold uppercase">Synced</span></span>`;
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function checkDataDirty() {
    const lastSyncStr = localStorage.getItem('erm_last_sync');
    if (!lastSyncStr) return true;
    const lastSync = new Date(lastSyncStr);

    const hasDirty = (list) => list.some(item => {
        const up = item.updatedAt ? new Date(item.updatedAt) : new Date();
        return up > lastSync;
    });

    const hasDeletes = state.deletedIds.patients.length > 0 || state.deletedIds.assessments.length > 0 ||
        state.deletedIds.appointments.length > 0 || state.deletedIds.expenses.length > 0;

    return hasDirty(state.patients) || hasDirty(state.assessments) ||
        hasDirty(state.appointments) || hasDirty(state.expenses || []) || hasDirty(state.packages || []) || hasDeletes;
}
