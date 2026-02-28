// --- 7.5. VIEW RENDERERS (SCHEDULE) ---
let scheduleViewDate = new Date();

function renderScheduleView(container) {
    const year = scheduleViewDate.getFullYear();
    const month = scheduleViewDate.getMonth();
    const todayDate = new Date();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = (firstDay.getDay() + 6) % 7;

    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

    const monthAppts = (state.appointments || []).filter(a => {
        const d = new Date(a.date);
        return d.getFullYear() === year && d.getMonth() === month;
    });

    container.innerHTML = `
        <div class="space-y-6 fade-in pb-24">
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                <div class="flex items-center gap-4">
                    <div class="bg-blue-600 text-white p-3 rounded-xl shadow-lg shadow-blue-200"><i data-lucide="calendar" width="24"></i></div>
                    <div>
                        <h2 class="text-2xl font-black text-slate-800">${monthNames[month]} ${year}</h2>
                        <p class="text-slate-500 font-medium text-sm">Kelola Jadwal Terapi</p>
                    </div>
                </div>
                <div class="flex items-center bg-slate-100 rounded-xl p-1">
                    <button onclick="changeScheduleMonth(-1)" class="p-2 hover:bg-white hover:text-blue-600 rounded-lg text-slate-500 transition-all shadow-sm"><i data-lucide="chevron-left" width="20"></i></button>
                    <button onclick="resetScheduleMonth()" class="px-4 py-2 text-sm font-bold text-slate-600 hover:text-blue-600">Hari Ini</button>
                    <button onclick="changeScheduleMonth(1)" class="p-2 hover:bg-white hover:text-blue-600 rounded-lg text-slate-500 transition-all shadow-sm"><i data-lucide="chevron-right" width="20"></i></button>
                </div>
            </div>

            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div class="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
                    ${['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Ming'].map(d => `<div class="py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">${d}</div>`).join('')}
                </div>
                <div class="grid grid-cols-7 divide-x divide-slate-100 divide-y" id="calendar-grid">
                    ${Array(startingDay).fill(null).map(() => `<div class="bg-slate-50/50 min-h-[100px]"></div>`).join('')}
                    ${Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = todayDate.getDate() === day && todayDate.getMonth() === month && todayDate.getFullYear() === year;
        const dayAppts = monthAppts.filter(a => a.date === dateStr);

        return `
                        <div id="day-${dateStr}" data-date="${dateStr}" class="calendar-day-cell min-h-[100px] p-2 hover:bg-blue-50 transition-colors cursor-pointer group relative border border-transparent rounded-lg">
                            <div class="flex justify-between items-start">
                                <span class="text-sm font-bold ${isToday ? 'bg-blue-600 text-white w-7 h-7 flex items-center justify-center rounded-full shadow-md' : 'text-slate-700'}">${day}</span>
                                ${dayAppts.length > 0 ? `<span class="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded">${dayAppts.length}</span>` : ''}
                            </div>
                            <div class="mt-2 space-y-1">
                                ${dayAppts.slice(0, 3).map(a => {
            const ptType = a.patientType || 'Klinik';
            const typeIcon = ptType === 'Home Visit' ? 'home' : 'building-2';
            const typeColor = ptType === 'Home Visit' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-blue-50 border-blue-200 text-blue-700';
            const patientName = state.patients.find(p => p.id === a.patientId)?.name.split(' ')[0] || (a.name || 'Pasien');
            const isPending = a.status === 'PENDING';
            const statusClass = isPending ? 'bg-amber-100 border-amber-300 text-amber-800 ring-1 ring-amber-200 animate-pulse' : 'bg-white border-slate-200 text-slate-600';
            return `<div class="text-[9px] sm:text-[10px] truncate ${statusClass} rounded px-1 py-0.5 font-medium shadow-sm group-hover:border-blue-200 flex items-center gap-0.5 sm:gap-1"><span class="${typeColor} px-0.5 sm:px-1 py-0.5 rounded text-[7px] sm:text-[8px] font-bold flex items-center gap-0.5 shrink-0"><i data-lucide="${typeIcon}" width="7" class="hidden sm:inline"></i><span class="sm:hidden">${ptType === 'Home Visit' ? 'V' : 'K'}</span></span><span class="truncate text-[8px] sm:text-[10px]">${isPending ? '⏳ ' : ''}${a.time.substring(0, 5)} ${patientName}</span></div>`;
        }).join('')}
                                ${dayAppts.length > 3 ? `<div class="text-[9px] sm:text-[10px] text-slate-500 font-bold pl-1 bg-slate-100 rounded px-1">+${dayAppts.length - 3}</div>` : ''}
                            </div>
                            <button data-action="add" data-date="${dateStr}" class="calendar-add-btn absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 bg-blue-600 text-white p-1.5 rounded-lg shadow-md hover:scale-110 transition-all"><i data-lucide="plus" width="14"></i></button>
                        </div>`;
    }).join('')}
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div class="flex items-center justify-between flex-wrap gap-3">
                    <h4 class="text-xs font-bold text-slate-500 uppercase">Keterangan:</h4>
                    <div class="flex items-center gap-4 flex-wrap">
                        <div class="flex items-center gap-2">
                            <span class="bg-blue-50 border border-blue-200 text-blue-700 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1">
                                <i data-lucide="building-2" width="10"></i>
                                <span class="hidden sm:inline">Klinik</span>
                                <span class="sm:hidden">K</span>
                            </span>
                            <span class="text-xs text-slate-600">= Pasien Klinik</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="bg-green-50 border border-green-200 text-green-700 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1">
                                <i data-lucide="home" width="10"></i>
                                <span class="hidden sm:inline">Visit</span>
                                <span class="sm:hidden">V</span>
                            </span>
                            <span class="text-xs text-slate-600">= Home Visit</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    renderIcons();

    const calendarGrid = document.getElementById('calendar-grid');
    if (calendarGrid) {
        calendarGrid.addEventListener('click', function (e) {
            const cell = e.target.closest('.calendar-day-cell');
            const addBtn = e.target.closest('.calendar-add-btn');
            if (addBtn) {
                e.stopPropagation();
                openAppointmentModal(addBtn.getAttribute('data-date'));
            } else if (cell) {
                openDailyScheduleModal(cell.getAttribute('data-date'));
            }
        });
    }
}

function changeScheduleMonth(delta) {
    scheduleViewDate.setMonth(scheduleViewDate.getMonth() + delta);
    renderScheduleView(document.getElementById('main-content'));
}

function resetScheduleMonth() {
    scheduleViewDate = new Date();
    renderScheduleView(document.getElementById('main-content'));
}

function openDailyScheduleModal(dateStr) {
    const dayAppts = (state.appointments || []).filter(a => {
        return a.date === dateStr || new Date(a.date).toISOString().slice(0, 10) === new Date(dateStr).toISOString().slice(0, 10);
    }).sort((a, b) => a.time.localeCompare(b.time));

    const modalHtml = `
        <div class="bg-white px-6 py-4 border-b flex justify-between items-center sticky top-0 z-20">
            <div>
                <h3 class="text-xl font-bold text-slate-800">Jadwal: ${formatDateForDisplay(dateStr)}</h3>
                <p class="text-sm text-slate-500">${dayAppts.length} Pasien Terdaftar</p>
            </div>
            <button onclick="closeModal()" class="bg-slate-100 p-2 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"><i data-lucide="x" width="20"></i></button>
        </div>
        <div class="px-6 py-6 space-y-4 overflow-y-auto modal-scroll flex-1 max-h-[70vh]">
            <div class="flex justify-end">
                 <button onclick="handleAddFromDaily('${dateStr}')" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 transition-all flex items-center gap-2"><i data-lucide="plus" width="16"></i> Tambah Jadwal</button>
            </div>
            <div class="space-y-3">
                ${dayAppts.length > 0 ? dayAppts.map(a => {
        const p = state.patients.find(pt => pt.id === a.patientId);
        const ptType = a.patientType || 'Klinik';
        const typeIcon = ptType === 'Home Visit' ? 'home' : 'building-2';
        const typeColor = ptType === 'Home Visit' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-blue-100 text-blue-700 border-blue-200';
        const isPending = a.status === 'PENDING';
        return `
                    <div class="flex items-center gap-4 p-4 rounded-xl border ${isPending ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-slate-50'} hover:bg-white hover:border-blue-200 hover:shadow-md transition-all group">
                        <div class="text-center min-w-[60px]">
                            <span class="block font-black ${isPending ? 'text-amber-700' : 'text-slate-700'} text-lg">${a.time}</span>
                            ${isPending ? '<span class="text-[10px] font-bold text-amber-600 bg-amber-100 px-1 py-0.5 rounded mx-auto block w-fit mt-1">BARU</span>' : ''}
                        </div>
                        <div class="flex-1">
                            <h4 class="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">${p ? p.name : (a.name || 'Unknown')} <span class="text-xs font-normal text-slate-400 ml-1">(${p ? p.id : 'Calon Pasien'})</span></h4>
                            <div class="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                <span class="${typeColor} px-2 py-0.5 rounded border flex items-center gap-1 font-bold"><i data-lucide="${typeIcon}" width="10"></i> ${ptType}</span>
                                <span class="bg-white px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1"><i data-lucide="user" width="10"></i> ${a.therapistId}</span>
                                ${a.notes ? `<span class="italic text-slate-400 max-w-[200px] truncate"><i data-lucide="sticky-note" width="10" class="inline mr-1"></i>${a.notes}</span>` : ''}
                            </div>
                        </div>
                        <div class="flex gap-2">
                            ${isPending ? `
                            <button onclick="confirmAppointment('${a.id}')" class="p-2 text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm"><i data-lucide="check" width="14"></i></button>
                            <button onclick="deleteAppointment('${a.id}')" class="p-2 text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm"><i data-lucide="x" width="14"></i></button>
                            ` : `
                            <button onclick="handleEditFromDaily('${a.id}')" class="p-2 text-slate-400 hover:text-blue-600 bg-white border border-slate-200 rounded-lg"><i data-lucide="edit-2" width="14"></i></button>
                            <button onclick="handleDeleteFromDaily('${a.id}', '${dateStr}')" class="p-2 text-slate-400 hover:text-red-600 bg-white border border-slate-200 rounded-lg"><i data-lucide="trash-2" width="14"></i></button>
                            `}
                        </div>
                    </div>`;
    }).join('') : `<div class="text-center py-12 text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center gap-3">
                    <div class="bg-slate-100 p-3 rounded-full"><i data-lucide="calendar-x" width="24"></i></div>
                    <span>Tidak ada jadwal pada tanggal ini.</span>
                </div>`}
            </div>
        </div>
        <div class="bg-slate-50 px-6 py-4 border-t flex justify-end sticky bottom-0 z-20">
             <button onclick="closeModal()" class="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors text-sm">Tutup</button>
        </div>
    `;

    document.getElementById('modal-content').innerHTML = modalHtml;
    document.getElementById('modal-container').classList.remove('hidden');
    renderIcons();
}

function handleAddFromDaily(dateStr) { closeModal(); setTimeout(() => openAppointmentModal(dateStr), 300); }
function handleEditFromDaily(id) { closeModal(); setTimeout(() => openAppointmentModal(null, id), 300); }
function handleDeleteFromDaily(id, dateStr) { if (confirm('Hapus jadwal ini?')) { deleteAppointment(id); setTimeout(() => openDailyScheduleModal(dateStr), 500); } }
