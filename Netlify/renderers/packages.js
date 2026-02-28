/**
 * Packages Renderer
 * Handles the rendering and management of service packages.
 */

function renderPackagesConfig() {
    return `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <h3 class="font-bold text-slate-800 flex items-center gap-2"><i data-lucide="package" class="text-orange-500"></i> Daftar Paket Layanan</h3>
                <button onclick="openPackageModal()" class="bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-orange-100 transition-all font-sans">
                    <i data-lucide="plus-circle" width="16"></i> Tambah Paket
                </button>
            </div>
            <div id="package-list-container">
                ${renderPackageTable()}
            </div>
        </div>`;
}

function renderPackageTable() {
    if (!state.packages || state.packages.length === 0) {
        return `<div class="p-12 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                    <p class="text-slate-400 text-sm font-medium">Belum ada paket layanan yang dibuat.</p>
                </div>`;
    }

    return `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${state.packages.map(pkg => `
                <div class="bg-white border-2 border-slate-100 rounded-2xl p-5 hover:border-orange-200 transition-all group">
                    <div class="flex justify-between items-start mb-4">
                        <div class="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                            <i data-lucide="package" width="20"></i>
                        </div>
                        <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button onclick="openPackageModal('${pkg.id}')" class="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><i data-lucide="edit-3" width="16"></i></button>
                            <button onclick="deletePackage('${pkg.id}')" class="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"><i data-lucide="trash-2" width="16"></i></button>
                        </div>
                    </div>
                    <h4 class="font-black text-slate-800 tracking-tight leading-snug mb-1">${pkg.name}</h4>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">${pkg.sessions} Sesi Pertemuan</p>
                    <div class="flex justify-between items-end border-t border-slate-50 pt-4">
                        <div>
                            <p class="text-[9px] font-bold text-slate-400 uppercase">Harga Paket</p>
                            <p class="text-lg font-black text-orange-600">Rp ${Number(pkg.price).toLocaleString('id-ID')}</p>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function openPackageModal(id = null) {
    const pkg = id ? state.packages.find(p => p.id === id) : { id: '', name: '', price: 0, sessions: 1 };

    const modalHtml = `
        <div class="bg-white px-6 py-4 border-b flex justify-between items-center sticky top-0 z-20">
            <h3 class="text-xl font-bold text-slate-800">${id ? 'Edit Paket' : 'Tambah Paket Baru'}</h3>
            <button onclick="closeModal()" class="bg-slate-100 p-2 rounded-full text-slate-500 hover:bg-slate-200"><i data-lucide="x" width="20"></i></button>
        </div>
        <div class="p-6 space-y-4">
            <form id="package-form">
                <input type="hidden" name="id" value="${pkg.id}">
                <div>
                    <label class="text-xs font-bold text-slate-500 uppercase block mb-1">Nama Paket</label>
                    <input type="text" name="name" value="${pkg.name}" class="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Contoh: Paket 5x Terapi">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-xs font-bold text-slate-500 uppercase block mb-1">Jumlah Sesi</label>
                        <input type="number" name="sessions" value="${pkg.sessions}" class="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none">
                    </div>
                    <div>
                        <label class="text-xs font-bold text-slate-500 uppercase block mb-1">Harga Total (Rp)</label>
                        <input type="number" name="price" value="${pkg.price}" class="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none">
                    </div>
                </div>
            </form>
        </div>
        <div class="bg-slate-50 px-6 py-4 border-t flex justify-end gap-2">
            <button onclick="savePackage()" class="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg btn-press text-sm">Simpan Paket</button>
        </div>`;

    document.getElementById('modal-content').innerHTML = modalHtml;
    document.getElementById('modal-container').classList.remove('hidden');
    lucide.createIcons();
}

function savePackage() {
    const form = document.getElementById('package-form');
    const id = form.querySelector('[name="id"]').value;
    const name = form.querySelector('[name="name"]').value;
    const price = Number(form.querySelector('[name="price"]').value) || 0;
    const sessions = Number(form.querySelector('[name="sessions"]').value) || 0;

    if (!name || sessions <= 0) { alert('Nama dan Sesi wajib diisi!'); return; }

    if (!Array.isArray(state.packages)) state.packages = [];

    if (id) {
        const idx = state.packages.findIndex(x => x.id === id);
        if (idx > -1) state.packages[idx] = { id, name, price, sessions };
    } else {
        state.packages.push({ id: 'pkg' + Date.now(), name, price, sessions });
    }

    saveData();
    if (state.scriptUrl) syncDelta();
    closeModal();
    renderConfigView(document.getElementById('main-content'));
    showToast("Paket layanan disimpan.");
}

function deletePackage(id) {
    if (confirm('Hapus paket ini?')) {
        state.packages = (state.packages || []).filter(x => x.id !== id);
        saveData();
        if (state.scriptUrl) syncDelta();
        renderConfigView(document.getElementById('main-content'));
        showToast("Paket dihapus.");
    }
}

function applyPackageToPatient(patientId, packageId) {
    const pIdx = state.patients.findIndex(p => p.id === patientId);
    const pkg = state.packages.find(x => x.id === packageId);
    if (pIdx > -1 && pkg) {
        state.patients[pIdx].quota = (state.patients[pIdx].quota || 0) + pkg.sessions;
        saveData();
        return true;
    }
    return false;
}
