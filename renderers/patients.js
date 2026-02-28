// --- 8. VIEW RENDERERS (PATIENTS) ---
function renderPatientList(container) {
    container.innerHTML = `
        <div class="space-y-4 fade-in pb-24">
            <div class="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div class="relative w-full md:w-96">
                    <i data-lucide="search" class="absolute left-3 top-3 text-slate-400" width="18"></i>
                    <input type="text" id="search-patient" onkeyup="filterPatients()" placeholder="Cari nama / No. RM..." class="pl-10 w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                </div>
                <button onclick="openPatientModal()" class="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 font-bold shadow-lg shadow-blue-200 transition-all btn-press">
                    <i data-lucide="user-plus" width="18"></i> <span class="hidden md:inline">Pasien Baru</span><span class="md:hidden">Tambah Pasien</span>
                </button>
            </div>
            <div class="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-sm text-left text-slate-600">
                        <thead class="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200 tracking-wider">
                            <tr>
                                <th class="px-6 py-4">No. RM</th>
                                <th class="px-6 py-4">Identitas Pasien</th>
                                <th class="px-6 py-4">Gender / Usia</th>
                                <th class="px-6 py-4">Diagnosa Medis</th>
                                <th class="px-6 py-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="patient-table-body"></tbody>
                    </table>
                </div>
            </div>
            <div id="patient-mobile-list" class="md:hidden space-y-3"></div>
        </div>`;
    filterPatients();
}

function filterPatients() {
    const searchVal = document.getElementById('search-patient')?.value.toLowerCase() || '';
    const tbody = document.getElementById('patient-table-body');
    const mobileList = document.getElementById('patient-mobile-list');
    const filtered = state.patients.filter(p => p.name.toLowerCase().includes(searchVal) || p.id.toLowerCase().includes(searchVal));

    if (filtered.length === 0) {
        const emptyMsg = `<div class="p-8 text-center flex flex-col items-center justify-center text-slate-400"><i data-lucide="search-x" width="32" class="mb-2 opacity-50"></i><p class="text-sm">Pasien tidak ditemukan.</p></div>`;
        if (tbody) tbody.innerHTML = `<tr><td colspan="6">${emptyMsg}</td></tr>`;
        if (mobileList) mobileList.innerHTML = emptyMsg;
        renderIcons();
        return;
    }

    const hasMore = filtered.length > state.patientLimit;
    const loadMoreBtn = hasMore ? `
        <div class="pt-4 pb-8 flex justify-center">
            <button onclick="loadMorePatients()" class="bg-white border border-slate-300 text-slate-700 px-8 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2">
                <i data-lucide="plus" width="16"></i> Tampilkan Lebih Banyak (${filtered.length - state.patientLimit})
            </button>
        </div>` : '';

    if (tbody) {
        const sliced = filtered.slice(0, state.patientLimit);
        tbody.innerHTML = sliced.map(p => {
            const cat = p.category || 'Klinik';
            const badgeClass = cat === 'Home Visit' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200';
            const catIcon = cat === 'Home Visit' ? 'home' : 'building-2';
            let quotaBadge = p.quota > 0 ? `<span class="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700 border border-purple-200" title="Sisa Paket"><i data-lucide="package" width="8"></i> ${p.quota}</span>` : '';

            return `<tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td class="px-6 py-4 font-mono text-xs text-slate-500 font-bold">${p.id}</td>
                <td class="px-6 py-4">
                    <div class="font-bold text-slate-800 text-sm md:text-base flex items-center">${p.name} ${quotaBadge}</div>
                    <div class="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${badgeClass}"><i data-lucide="${catIcon}" width="10"></i> ${cat}</div>
                </td>
                <td class="px-6 py-4 text-xs text-slate-600">
                    <div class="font-bold">${p.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</div>
                    <div class="text-slate-400">${calculateAge(p.dob)} Th</div>
                </td>
                <td class="px-6 py-4 text-xs text-slate-600 max-w-[200px] truncate">${p.diagnosis || '-'}</td>
                <td class="px-6 py-4 text-center">
                    <div class="flex justify-center gap-2">
                        <button onclick="viewPatientHistory('${p.id}')" title="Riwayat" class="p-2 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 rounded-lg transition-all shadow-sm"><i data-lucide="history" width="16"></i></button>
                        <button onclick="startAssessment('${p.id}')" title="Assessment Baru" class="p-2 bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-300 rounded-lg transition-all shadow-sm"><i data-lucide="clipboard-plus" width="16"></i></button>
                        <button onclick="openPatientModal('${p.id}')" title="Edit Data" class="p-2 bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 rounded-lg transition-all shadow-sm"><i data-lucide="edit-3" width="16"></i></button>
                        <button onclick="deletePatient('${p.id}')" title="Hapus" class="p-2 bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-300 rounded-lg transition-all shadow-sm"><i data-lucide="trash-2" width="16"></i></button>
                    </div>
                </td>
            </tr>`;
        }).join('') + (hasMore ? `<tr><td colspan="5">${loadMoreBtn}</td></tr>` : '');
    }

    if (mobileList) {
        const sliced = filtered.slice(0, state.patientLimit);
        mobileList.innerHTML = sliced.map(p => {
            const cat = p.category || 'Klinik'; const isVisit = cat === 'Home Visit';
            const borderLeftClass = isVisit ? 'border-l-4 border-l-orange-500' : 'border-l-4 border-l-blue-500';
            let quotaDisplay = p.quota > 0 ? `<div class="absolute top-3 right-3 bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[9px] font-bold border border-purple-200 flex items-center gap-1"><i data-lucide="package" width="10"></i> ${p.quota}</div>` : '';

            return `<div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 ${borderLeftClass} relative">
                ${quotaDisplay}
                <div class="flex items-start gap-3 mb-3">
                    <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-black text-slate-400 shrink-0">${p.name.charAt(0)}</div>
                    <div class="pr-12"><h4 class="font-bold text-slate-800 text-sm leading-tight mb-0.5">${p.name}</h4><p class="text-[10px] text-slate-400 font-mono">${p.id}</p></div>
                </div>
                <div class="grid grid-cols-2 gap-2 mb-3">
                    <div class="bg-slate-50 p-2 rounded-lg border border-slate-100"><p class="text-[9px] text-slate-400 uppercase font-bold">Usia / Gender</p><p class="text-xs font-bold text-slate-600">${calculateAge(p.dob)} Th • ${p.gender}</p></div>
                    <div class="bg-slate-50 p-2 rounded-lg border border-slate-100"><p class="text-[9px] text-slate-400 uppercase font-bold">Diagnosa</p><p class="text-xs font-bold text-slate-600 truncate">${p.diagnosis || '-'}</p></div>
                </div>
                <div class="grid grid-cols-4 gap-2 border-t border-slate-100 pt-3">
                    <button onclick="viewPatientHistory('${p.id}')" class="flex flex-col items-center justify-center gap-1 py-2 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"><div class="bg-indigo-50 text-indigo-600 p-1.5 rounded-md"><i data-lucide="history" width="16"></i></div><span class="text-[10px] font-bold">Riwayat</span></button>
                    <button onclick="startAssessment('${p.id}')" class="flex flex-col items-center justify-center gap-1 py-2 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"><div class="bg-emerald-50 text-emerald-600 p-1.5 rounded-md"><i data-lucide="clipboard-plus" width="16"></i></div><span class="text-[10px] font-bold">Assess</span></button>
                    <button onclick="openPatientModal('${p.id}')" class="flex flex-col items-center justify-center gap-1 py-2 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"><div class="bg-blue-50 text-blue-600 p-1.5 rounded-md"><i data-lucide="edit-3" width="16"></i></div><span class="text-[10px] font-bold">Edit</span></button>
                    <button onclick="deletePatient('${p.id}')" class="flex flex-col items-center justify-center gap-1 py-2 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"><div class="bg-red-50 text-red-600 p-1.5 rounded-md"><i data-lucide="trash-2" width="16"></i></div><span class="text-[10px] font-bold">Hapus</span></button>
                </div>
            </div>`;
        }).join('') + loadMoreBtn;
    }
    renderIcons();
}

function loadMorePatients() { state.patientLimit += 50; filterPatients(); }
function viewPatientHistory(id) { state.filterPatientId = id; navigate('assessments'); }
function startAssessment(pid) { state.selectedPatient = state.patients.find(p => p.id === pid); state.currentAssessment = null; templateSearchQuery = ''; navigate('assessment_form'); }

function deletePatient(id) {
    if (confirm('Yakin ingin menghapus pasien ini? Data assessment terkait juga akan hilang.')) {
        state.deletedIds.patients.push(id);
        state.patients = state.patients.filter(p => p.id !== id);
        state.assessments = state.assessments.filter(a => a.patientId !== id);
        saveData();
        if (state.scriptUrl) syncDelta();
        filterPatients();
    }
}
