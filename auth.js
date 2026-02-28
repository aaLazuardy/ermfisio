// --- 5. AUTH & NAVIGATION ---
function handleLogin(e) {
    e.preventDefault();
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    const user = state.users.find(user => user.username === u && user.password === p);

    if (user) {
        state.user = user;
        navigate('dashboard');
        document.getElementById('login-error').classList.add('hidden');
        backgroundAutoSync();
    } else {
        const errEl = document.getElementById('login-error');
        errEl.classList.remove('hidden');
        errEl.innerText = 'Username atau Password Salah!';
    }
}

function handleLogout() { state.user = null; state.currentView = 'login'; renderApp(); }

function navigate(view) {
    if (view === 'config' && state.user.role !== 'ADMIN') {
        alert("Akses Ditolak! Menu ini khusus Administrator.");
        return;
    }
    state.currentView = view;
    if (view !== 'assessments') state.filterPatientId = null;
    if (view === 'kasir') state.kasirTab = state.kasirTab || 'antrian';
    renderApp();
}

function toggleSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const isMobile = window.innerWidth < 768;
    if (sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.remove('-translate-x-full');
        if (isMobile) overlay.classList.remove('hidden');
    } else {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    }
}

function closeModal() {
    document.getElementById('modal-container').classList.add('hidden');
    document.getElementById('modal-content').innerHTML = '';
}

window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) {
        document.getElementById('sidebar-overlay').classList.add('hidden');
        document.getElementById('app-sidebar').classList.remove('-translate-x-full');
    } else {
        const sidebar = document.getElementById('app-sidebar');
        if (sidebar) sidebar.classList.add('-translate-x-full');
    }
});
