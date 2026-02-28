/**
 * Kasir & Pembayaran Renderer
 * Handles the cashier view, payment processing, expense management, and financial reports.
 */

function renderKasirView(container) {
    const tab = state.kasirTab || 'antrian';
    const formatRp = (n) => 'Rp ' + (Number(n) || 0).toLocaleString('id-ID');

    container.innerHTML = `
        <div class="space-y-6 fade-in pb-24">
            <!-- Tab Header -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-1 flex gap-1">
                <button onclick="switchKasirTab('antrian')" id="ktab-antrian"
                    class="flex-1 py-2.5 px-4 rounded-xl text-[11px] md:text-sm font-bold transition-all ${tab === 'antrian' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}">
                    <i data-lucide="clock" width="14" class="inline mr-1"></i> Antrian
                </button>
                <button onclick="switchKasirTab('pengeluaran')" id="ktab-pengeluaran"
                    class="flex-1 py-2.5 px-4 rounded-xl text-[11px] md:text-sm font-bold transition-all ${tab === 'pengeluaran' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}">
                    <i data-lucide="shopping-cart" width="14" class="inline mr-1"></i> Pengeluaran
                </button>
                <button onclick="switchKasirTab('laporan')" id="ktab-laporan"
                    class="flex-1 py-2.5 px-4 rounded-xl text-[11px] md:text-sm font-bold transition-all ${tab === 'laporan' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}">
                    <i data-lucide="bar-chart-2" width="14" class="inline mr-1"></i> Keuangan
                </button>
                <button onclick="switchKasirTab('pajak')" id="ktab-pajak"
                    class="flex-1 py-2.5 px-4 rounded-xl text-[11px] md:text-sm font-bold transition-all ${tab === 'pajak' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}">
                    <i data-lucide="file-text" width="14" class="inline mr-1"></i> Pajak
                </button>
            </div>

            <!-- Tab Content -->
            <div id="kasir-tab-content">
                ${tab === 'antrian' ? renderKasirAntrian(formatRp) :
            (tab === 'pengeluaran' ? renderKasirPengeluaran(formatRp) :
                (tab === 'pajak' ? renderKasirPajak(formatRp) : renderKasirLaporan(formatRp)))}
            </div>
        </div>`;
    lucide.createIcons();
}

function switchKasirTab(tab) {
    state.kasirTab = tab;
    renderKasirView(document.getElementById('main-content'));
}

// --- UTILS KASIR ---
function isPaidAppt(a) {
    if (!a) return false;
    const isPaid = (a.paymentStatus || '').toUpperCase() === 'PAID';
    const isLegacyPaid = !a.paymentStatus && (a.paymentMethod || a.paidAt);
    return isPaid || isLegacyPaid;
}

function parseRp(val) {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const clean = val.toString().replace(/Rp/g, '').replace(/\./g, '').replace(/,/g, '').replace(/\s/g, '');
    return Number(clean) || 0;
}

function renderKasirAntrian(formatRp) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const antrian = (state.appointments || []).filter(a => {
        return a.date === todayStr && (a.status === 'CONFIRMED' || !a.status) && !isPaidAppt(a);
    }).sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    const lunas = (state.appointments || []).filter(a => {
        return a.date === todayStr && isPaidAppt(a);
    }).sort((a, b) => (b.paidAt || b.date || '').localeCompare(a.paidAt || a.date || ''));

    const totalLunasHariIni = lunas.reduce((s, a) => s + (parseRp(a.finalAmount) || parseRp(a.fee) || 0), 0);

    return `
        <!-- Summary strip -->
        <div class="grid grid-cols-3 gap-4">
            <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                <p class="text-2xl font-black text-amber-700">${antrian.length}</p>
                <p class="text-xs font-bold text-amber-600 mt-0.5">Menunggu Bayar</p>
            </div>
            <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <p class="text-2xl font-black text-emerald-700">${lunas.length}</p>
                <p class="text-xs font-bold text-emerald-600 mt-0.5">Sudah Lunas</p>
            </div>
            <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                <p class="text-lg font-black text-blue-700 truncate">${formatRp(totalLunasHariIni)}</p>
                <p class="text-xs font-bold text-blue-600 mt-0.5">Pemasukan Hari Ini</p>
            </div>
        </div>

        <!-- Antrian Belum Bayar -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200">
            <div class="px-6 py-4 border-b border-slate-100">
                <h3 class="font-bold text-slate-800 flex items-center gap-2">
                    <i data-lucide="clock" width="18" class="text-amber-500"></i>
                    Antrian Belum Bayar
                </h3>
            </div>
            <div class="divide-y divide-slate-100">
                ${antrian.length === 0
            ? `<div class="p-8 text-center text-slate-400">
                            <i data-lucide="check-circle" width="40" class="mx-auto mb-2 text-emerald-400"></i>
                            <p class="font-medium">Semua pasien hari ini sudah lunas!</p>
                       </div>`
            : antrian.map(a => {
                const p = (state.patients || []).find(pt => pt.id === a.patientId);
                const nama = p ? p.name : (a.visitor_name || a.name || 'Pasien Baru');
                const terapis = (state.users || []).find(u => u.id === a.therapistId);
                return `
                        <div class="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                            <div class="text-center min-w-[52px]">
                                <span class="text-lg font-black text-slate-700">${a.time || '-'}</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="font-bold text-slate-800 truncate">${nama}</p>
                                <p class="text-xs text-slate-400">${terapis ? terapis.name : (a.therapistId || '-')} &bull; ${a.patientType || 'Klinik'}</p>
                            </div>
                            <div class="text-right shrink-0">
                                <p class="font-bold text-slate-700 text-sm">${formatRp(a.fee)}</p>
                                <button onclick="openPaymentModal('${a.id}')"
                                    class="mt-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-sm">
                                    Proses Bayar
                                </button>
                            </div>
                        </div>`;
            }).join('')}
            </div>
        </div>

        <!-- Sudah Lunas Hari Ini -->
        ${lunas.length > 0 ? `
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200">
            <div class="px-6 py-4 border-b border-slate-100">
                <h3 class="font-bold text-slate-800 flex items-center gap-2">
                    <i data-lucide="check-circle" width="18" class="text-emerald-500"></i>
                    Sudah Lunas Hari Ini
                </h3>
            </div>
            <div class="divide-y divide-slate-100">
                ${lunas.map(a => {
                const p = (state.patients || []).find(pt => pt.id === a.patientId);
                const nama = p ? p.name : (a.visitor_name || a.name || 'Pasien');
                const methodIcons = { 'Tunai': '💵', 'Transfer': '🏦', 'QRIS': '📱', 'BPJS': '🏥' };
                return `
                    <div class="flex items-center gap-4 px-6 py-3 bg-emerald-50/30">
                        <div class="flex-1 min-w-0">
                            <p class="font-semibold text-slate-700 truncate">${nama}</p>
                            <p class="text-xs text-slate-400">${a.time || '-'} &bull; ${methodIcons[a.paymentMethod] || ''} ${a.paymentMethod || '-'}</p>
                        </div>
                        <div class="text-right shrink-0">
                            <div class="flex items-center justify-end gap-2 mb-1">
                                <button onclick="printReceipt('${a.id}', 'RECEIPT')" class="text-slate-300 hover:text-blue-600 transition-colors" title="Cetak Struk">
                                    <i data-lucide="printer" width="14"></i>
                                </button>
                                <p class="font-bold text-emerald-700">${formatRp(a.finalAmount || a.fee)}</p>
                            </div>
                            <span class="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">LUNAS</span>
                        </div>
                    </div>`;
            }).join('')}
            </div>
        </div>` : ''}
    `;
}

function renderKasirPengeluaran(formatRp) {
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM

    const filtered = (state.expenses || []).filter(e => e.date && e.date.slice(0, 7) === currentMonth)
        .sort((a, b) => b.date.localeCompare(a.date));

    const total = filtered.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    return `
        <div class="space-y-6 fade-in shadow-inner-lg p-1">
            <!-- Summary Expense -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Biaya Operasional</p>
                    <p class="text-2xl font-black text-rose-600 mt-1">${formatRp(total)}</p>
                    <p class="text-[10px] text-slate-400 mt-1 uppercase">Bulan: ${now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>
                </div>
                <button onclick="openExpenseModal()" 
                    class="w-full md:w-auto bg-rose-600 hover:bg-rose-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2">
                    <i data-lucide="plus-circle" width="18"></i> Catat Pengeluaran
                </button>
            </div>

            <!-- List Pengeluaran -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 class="font-bold text-slate-800 flex items-center gap-2">
                        <i data-lucide="list" width="18" class="text-slate-400"></i>
                        Riwayat Pengeluaran
                    </h3>
                </div>
                ${filtered.length === 0
            ? `<div class="p-16 text-center text-slate-300">
                    <i data-lucide="shopping-bag" width="48" class="mx-auto mb-4 opacity-20"></i>
                    <p class="font-medium">Belum ada catatan pengeluaran bulan ini.</p>
                   </div>`
            : `<div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead class="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th class="text-left px-6 py-3 text-[10px] font-bold text-slate-500 uppercase">Tanggal</th>
                                <th class="text-left px-6 py-3 text-[10px] font-bold text-slate-500 uppercase">Kategori</th>
                                <th class="text-left px-6 py-3 text-[10px] font-bold text-slate-500 uppercase">Catatan</th>
                                <th class="text-right px-6 py-3 text-[10px] font-bold text-slate-500 uppercase">Nominal</th>
                                <th class="text-center px-6 py-3" style="width: 50px;"></th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${filtered.map(e => `
                                <tr class="hover:bg-slate-50 transition-colors">
                                    <td class="px-6 py-4 text-slate-600 font-medium">${e.date}</td>
                                    <td class="px-6 py-4">
                                        <span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-extrabold uppercase">${e.category || 'LAINNYA'}</span>
                                    </td>
                                    <td class="px-6 py-4 text-slate-400 text-xs italic">${e.notes || '-'}</td>
                                    <td class="px-6 py-4 text-right font-black text-rose-600">${formatRp(e.amount)}</td>
                                    <td class="px-6 py-4 text-center">
                                        <button onclick="deleteExpense('${e.id}')" class="text-slate-300 hover:text-rose-500 transition-colors">
                                            <i data-lucide="trash-2" width="16"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                   </div>`}
            </div>
        </div>
    `;
}

function openExpenseModal() {
    const modal = document.getElementById('modal-container');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');

    content.innerHTML = `
        <div class="bg-white px-6 py-4 border-b flex justify-between items-center sticky top-0 z-20">
            <div>
                <h3 class="text-xl font-bold text-slate-800">Tambah Pengeluaran</h3>
                <p class="text-xs text-slate-400">Pencatatan biaya operasional harian</p>
            </div>
            <button onclick="closeModal()" class="bg-slate-100 p-2 rounded-full text-slate-500 hover:bg-slate-200 transition-colors">
                <i data-lucide="x" width="20"></i>
            </button>
        </div>
        <div class="px-6 py-6 space-y-5 overflow-y-auto max-h-[80vh]">
            <div>
                <label class="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Tanggal Pengeluaran</label>
                <input type="date" id="exp-date" value="${today()}" 
                    class="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-semibold outline-none focus:border-blue-500 transition-all">
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Kategori Biaya</label>
                <select id="exp-category" class="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-blue-500 transition-all">
                    <option value="Operasional">Operasional (Listrik, Air, Internet)</option>
                    <option value="Alat Medis">Alat Medis & Bahan Habis Pakai</option>
                    <option value="Gaji">Gaji / Honor Terapis</option>
                    <option value="Sewa">Sewa Tempat / Maintenance</option>
                    <option value="Lainnya">Lainnya / Non-Operasional</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Nominal (Rp)</label>
                <div class="relative">
                    <span class="absolute left-4 top-1/2 -translate-y-1/2 font-black text-rose-400">Rp</span>
                    <input type="number" id="exp-amount" placeholder="0"
                        class="w-full bg-slate-50 border-2 border-slate-100 rounded-xl pl-12 pr-4 py-4 text-xl font-black text-rose-600 outline-none focus:border-rose-500 focus:bg-white transition-all">
                </div>
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Detail / Keterangan</label>
                <textarea id="exp-notes" placeholder="Tulis rincian pengeluaran di sini..."
                    class="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-4 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all min-h-[100px]"></textarea>
            </div>
            
            <div class="pt-2">
                <button onclick="saveExpense()"
                    class="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 group">
                    <i data-lucide="save" width="20" class="group-hover:rotate-12 transition-transform"></i>
                    Simpan Data Pengeluaran
                </button>
            </div>
        </div>
    `;
    lucide.createIcons();
}

function saveExpense() {
    const date = document.getElementById('exp-date').value;
    const category = document.getElementById('exp-category').value;
    const amount = Number(document.getElementById('exp-amount').value) || 0;
    const notes = document.getElementById('exp-notes').value;

    if (amount <= 0) {
        alert('Mohon masukkan nominal belanja/pengeluaran!');
        return;
    }

    const entry = {
        id: 'EXP-' + Date.now(),
        date,
        category,
        amount,
        notes,
        updatedAt: new Date().toISOString()
    };

    if (!Array.isArray(state.expenses)) state.expenses = [];
    state.expenses.push(entry);

    saveData();
    if (state.scriptUrl) syncDelta();
    closeModal();
    renderKasirView(document.getElementById('main-content'));
    showToast("Catatan pengeluaran berhasil disimpan.");
}

function deleteExpense(id) {
    if (!confirm('Hapus selamanya catatan pengeluaran ini?')) return;
    state.expenses = (state.expenses || []).filter(e => e.id !== id);
    saveData();
    if (state.scriptUrl) syncDelta();
    renderKasirView(document.getElementById('main-content'));
    showToast("Data pengeluaran dihapus.");
}

function renderKasirLaporan(formatRp) {
    const now = new Date();
    const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const defaultTo = now.toISOString().slice(0, 10);
    const savedFrom = state.laporanFrom || defaultFrom;
    const savedTo = state.laporanTo || defaultTo;

    const filtered = (state.appointments || []).filter(a => {
        const apptDate = (a.paidAt || a.date || '');
        const dateMatch = apptDate && apptDate.slice(0, 10) >= savedFrom && apptDate.slice(0, 10) <= savedTo;
        return isPaidAppt(a) && dateMatch;
    }).sort((a, b) => (b.paidAt || b.date || '').localeCompare(a.paidAt || a.date || ''));

    const totalIncome = filtered.reduce((s, a) => s + (parseRp(a.finalAmount) || parseRp(a.fee) || 0), 0);
    const byMethod = { Tunai: 0, Transfer: 0, QRIS: 0, BPJS: 0 };
    filtered.forEach(a => {
        const m = a.paymentMethod || 'Tunai';
        if (byMethod[m] !== undefined) {
            byMethod[m] += (parseRp(a.finalAmount) || parseRp(a.fee) || 0);
        }
    });

    const filteredExpenses = (state.expenses || []).filter(e => {
        const d = (e.date || '');
        return d >= savedFrom && d <= savedTo;
    });
    const totalExpense = filteredExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const netProfit = totalIncome - totalExpense;

    let searchResult = filtered;
    if (state.laporanSearch) {
        const key = state.laporanSearch.toLowerCase();
        searchResult = filtered.filter(a => {
            const p = (state.patients || []).find(pt => pt.id === a.patientId);
            const nama = (p ? p.name : (a.visitor_name || a.name || '')).toLowerCase();
            return nama.includes(key);
        });
    }

    const displayed = searchResult.slice(0, state.laporanLimit || 50);
    const hasMore = searchResult.length > (state.laporanLimit || 50);

    const byDate = {};
    searchResult.forEach(a => {
        const d = a.paidAt ? a.paidAt.slice(0, 10) : a.date;
        if (!byDate[d]) byDate[d] = { count: 0, total: 0 };
        byDate[d].count++;
        byDate[d].total += parseRp(a.finalAmount) || parseRp(a.fee) || 0;
    });

    return `
        <!-- Filter -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div class="flex flex-wrap items-end gap-4">
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Dari Tanggal</label>
                    <input type="date" id="laporan-from" value="${savedFrom}"
                        class="border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-blue-500 outline-none">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Sampai Tanggal</label>
                    <input type="date" id="laporan-to" value="${savedTo}"
                        class="border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-blue-500 outline-none">
                </div>
                <button onclick="applyLaporanFilter()"
                    class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-xl text-sm transition-colors shadow-md">
                    Tampilkan
                </button>
                <div class="flex gap-2">
                    <button onclick="printJournalReport()"
                        class="bg-slate-800 hover:bg-black text-white font-bold px-5 py-2 rounded-xl text-sm transition-colors shadow-md flex items-center gap-2">
                        <i data-lucide="printer" width="16"></i> Jurnal
                    </button>
                    <button onclick="printFinancialReport()"
                        class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-xl text-sm transition-colors shadow-md flex items-center gap-2">
                        <i data-lucide="bar-chart-2" width="16"></i> Keuangan
                    </button>
                    <button onclick="printAppointmentReport()"
                        class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl text-sm transition-colors shadow-md flex items-center gap-2">
                        <i data-lucide="list" width="16"></i> Kunjungan
                    </button>
                </div>
            </div>
        </div>

        <!-- Summary Stats -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 shadow-sm">
            <div class="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 relative overflow-hidden">
                <div class="flex justify-between items-start relative z-10">
                    <div>
                        <p class="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Pemasukan</p>
                        <p class="text-3xl font-black text-emerald-800 mt-2">${formatRp(totalIncome)}</p>
                    </div>
                    <div class="bg-white/50 p-2.5 rounded-2xl shadow-sm">
                        <i data-lucide="trending-up" class="text-emerald-600" width="20"></i>
                    </div>
                </div>
            </div>

            <div class="bg-rose-50 border border-rose-100 rounded-3xl p-6 relative overflow-hidden">
                <div class="flex justify-between items-start relative z-10">
                    <div>
                        <p class="text-[10px] font-black text-rose-600 uppercase tracking-widest">Pengeluaran</p>
                        <p class="text-3xl font-black text-rose-800 mt-2">${formatRp(totalExpense)}</p>
                    </div>
                    <div class="bg-white/50 p-2.5 rounded-2xl shadow-sm">
                        <i data-lucide="trending-down" class="text-rose-600" width="20"></i>
                    </div>
                </div>
            </div>

            <div class="bg-blue-600 rounded-3xl p-6 shadow-xl relative overflow-hidden text-white">
                <div class="flex justify-between items-start relative z-10">
                    <div>
                        <p class="text-[10px] font-black text-blue-100 uppercase tracking-widest">Net Profit</p>
                        <p class="text-3xl font-black text-white mt-1">${formatRp(netProfit)}</p>
                    </div>
                    <div class="bg-white/20 p-2.5 rounded-2xl border border-white/20">
                        <i data-lucide="wallet" class="text-white" width="20"></i>
                    </div>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Methods -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 class="font-bold text-slate-800 flex items-center gap-2 mb-6">
                    <i data-lucide="pie-chart" width="18" class="text-blue-500"></i>
                    Metode Pembayaran
                </h3>
                <div class="space-y-4">
                    ${Object.entries(byMethod).sort((a, b) => b[1] - a[1]).map(([m, v]) => {
        const pct = totalIncome > 0 ? (v / totalIncome) * 100 : 0;
        const colors = { Tunai: 'bg-emerald-500', Transfer: 'bg-blue-500', QRIS: 'bg-purple-500', BPJS: 'bg-orange-500' };
        return `
                        <div>
                            <div class="flex justify-between text-[11px] mb-2 font-black uppercase">
                                <span class="text-slate-500">${m}</span>
                                <span class="text-slate-800">${formatRp(v)} (${pct.toFixed(0)}%)</span>
                            </div>
                            <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div class="${colors[m] || 'bg-slate-400'} h-full transition-all" style="width: ${pct}%"></div>
                            </div>
                        </div>`;
    }).join('')}
                </div>
            </div>

            <!-- Per Hari -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div class="px-6 py-4 border-b border-slate-100"><h3 class="font-bold text-slate-800">Ringkasan Per Hari</h3></div>
                <div class="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                    ${Object.entries(byDate).sort(([a], [b]) => b.localeCompare(a)).map(([date, info]) => {
        const d = new Date(date + 'T00:00:00');
        const label = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
        return `
                    <div class="flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition-colors">
                        <div>
                            <p class="font-semibold text-slate-700 text-sm">${label}</p>
                            <p class="text-[10px] text-slate-400">${info.count} transaksi</p>
                        </div>
                        <p class="font-bold text-slate-800">${formatRp(info.total)}</p>
                    </div>`;
    }).join('')}
                </div>
            </div>
        </div>

        <!-- Detailed Table -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                <h3 class="font-bold text-slate-800">Detail Transaksi</h3>
                <div class="relative w-64">
                    <i data-lucide="search" width="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    <input type="text" placeholder="Cari nama pasien..." id="laporan-search-input" value="${state.laporanSearch || ''}"
                        onkeyup="event.key === 'Enter' ? searchLaporan() : null"
                        class="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none">
                </div>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead class="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th class="text-left px-6 py-3 text-[10px] font-bold text-slate-500 uppercase">Tgl Bayar</th>
                            <th class="text-left px-6 py-3 text-[10px] font-bold text-slate-500 uppercase">Pasien</th>
                            <th class="text-left px-6 py-3 text-[10px] font-bold text-slate-500 uppercase">Metode</th>
                            <th class="text-right px-6 py-3 text-[10px] font-bold text-slate-500 uppercase">Total</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${displayed.map(a => {
        const p = (state.patients || []).find(pt => pt.id === a.patientId);
        const name = p ? p.name : (a.visitor_name || a.name || 'Pasien');
        const paidDate = a.paidAt ? new Date(a.paidAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '-';
        return `
                            <tr class="hover:bg-slate-50 transition-colors">
                                <td class="px-6 py-4 text-slate-500 text-xs">${paidDate}</td>
                                <td class="px-6 py-4 font-medium text-slate-800">${name}</td>
                                <td class="px-6 py-4"><span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">${a.paymentMethod || '-'}</span></td>
                                <td class="px-6 py-4 text-right font-black text-slate-700">${formatRp(a.finalAmount || a.fee)}</td>
                            </tr>`;
    }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function searchLaporan() {
    state.laporanSearch = document.getElementById('laporan-search-input')?.value || '';
    state.laporanLimit = 50;
    renderKasirView(document.getElementById('main-content'));
}

function applyLaporanFilter() {
    state.laporanFrom = document.getElementById('laporan-from')?.value;
    state.laporanTo = document.getElementById('laporan-to')?.value;
    renderKasirView(document.getElementById('main-content'));
}

// Payment Modal Logic
function openPaymentModal(apptId) {
    const a = (state.appointments || []).find(x => x.id === apptId);
    if (!a) return;
    const p = (state.patients || []).find(pt => pt.id === a.patientId);
    const nama = p ? p.name : (a.visitor_name || a.name || 'Pasien Baru');

    let feeBase = parseRp(a.fee) || parseRp(a.finalAmount);
    if (feeBase === 0) {
        const lastAsm = (state.assessments || []).filter(asm => asm.patientId === a.patientId)
            .sort((a, b) => b.date.localeCompare(a.date))[0];
        if (lastAsm && lastAsm.fee) feeBase = Number(lastAsm.fee);
    }
    if (feeBase === 0 && p) feeBase = Number(p.defaultFee) || 0;

    state._selectedPaymentMethod = '';
    state._currentDiscount = 0;

    const modal = document.getElementById('modal-container');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');

    content.innerHTML = `
        <div class="bg-white px-6 py-4 border-b flex justify-between items-center sticky top-0 z-20">
            <div>
                <h3 class="text-xl font-bold text-slate-800">Proses Pembayaran</h3>
                <p class="text-sm text-slate-500">${nama}</p>
            </div>
            <button onclick="closeModal()" class="bg-slate-100 p-2 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"><i data-lucide="x" width="20"></i></button>
        </div>
        <div class="px-6 py-5 space-y-5 overflow-y-auto max-h-[70vh]">
            <div class="bg-slate-50 rounded-xl p-4 space-y-4 border border-slate-200">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1">Paket (Opsional)</label>
                        <select id="pm-package-buy" onchange="handlePackageBuy(this.value)" class="w-full text-xs border p-2 rounded-lg bg-white font-bold">
                            <option value="">-- Layanan Biasa --</option>
                            ${(state.packages || []).map(pkg => `<option value="${pkg.id}">${pkg.name}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1">Biaya (Rp)</label>
                        <input type="number" id="pm-fee-base" value="${feeBase}" oninput="handlePaymentUpdateManual()" class="w-full border p-2 rounded-lg font-black text-slate-700 bg-white">
                    </div>
                </div>
                <div class="flex justify-between items-center pt-2 border-t border-slate-200">
                    <span class="font-bold text-slate-400 text-xs uppercase">TOTAL TAGIHAN</span>
                    <span id="pm-total" class="text-2xl font-black text-blue-600">Rp ${feeBase.toLocaleString('id-ID')}</span>
                </div>
            </div>

            <div>
                <p class="text-[10px] font-black text-slate-400 uppercase mb-3 text-center tracking-widest">PILIH METODE PEMBAYARAN</p>
                <div class="grid grid-cols-2 gap-3">
                    ${[
            { name: 'Tunai', icon: '💵' },
            { name: 'Transfer', icon: '🏦' },
            { name: 'QRIS', icon: '📱' },
            { name: 'BPJS', icon: '🏥' }
        ].map(m => `
                        <label class="cursor-pointer group">
                            <input type="radio" name="pm-method" value="${m.name}" class="peer hidden" onchange="pmMethodSelected(this)">
                            <div class="peer-checked:bg-blue-600 peer-checked:text-white border border-slate-200 bg-white rounded-2xl p-5 text-center transition-all hover:bg-slate-50 shadow-sm peer-checked:shadow-md peer-checked:scale-[1.02] transform">
                                <div class="text-3xl mb-2 group-active:scale-90 transition-transform">${m.icon}</div>
                                <span class="text-[10px] font-black uppercase tracking-tighter">${m.name}</span>
                            </div>
                        </label>`).join('')}
                </div>
                
                <div class="mt-3">
                    <label class="cursor-pointer group">
                        <input type="radio" name="pm-method" value="Paket" class="peer hidden" onchange="pmMethodSelected(this)">
                        <div class="peer-checked:bg-amber-500 peer-checked:text-white border border-slate-200 bg-white rounded-xl p-3 flex items-center justify-center gap-3 transition-all hover:bg-slate-50 shadow-sm peer-checked:shadow-md">
                            <span class="text-xl">🎟️</span>
                            <span class="text-[10px] font-black uppercase tracking-tighter">Gunakan Kuota Paket</span>
                        </div>
                    </label>
                </div>
            </div>
        </div>
        <div class="px-6 py-4 border-t bg-slate-50">
            <button onclick="confirmPayment('${apptId}')" id="pm-confirm-btn" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg disabled:opacity-50 transition-all" disabled>Konfirmasi Lunas</button>
        </div>`;

    lucide.createIcons();

    window.handlePackageBuy = (id) => {
        const pkg = state.packages.find(x => x.id === id);
        if (pkg) {
            document.getElementById('pm-fee-base').value = pkg.price;
            handlePaymentUpdateManual();
        }
    };

    window.handlePaymentUpdateManual = () => {
        const fee = Number(document.getElementById('pm-fee-base')?.value) || 0;
        document.getElementById('pm-total').textContent = 'Rp ' + fee.toLocaleString('id-ID');
    };
}

function pmMethodSelected(radio) {
    state._selectedPaymentMethod = radio.value;
    const btn = document.getElementById('pm-confirm-btn');
    if (btn) btn.disabled = false;
}

async function confirmPayment(apptId) {
    const a = (state.appointments || []).find(x => x.id === apptId);
    if (!a) return;

    const feeBase = Number(document.getElementById('pm-fee-base').value) || 0;
    const method = state._selectedPaymentMethod;
    const packageIdBought = document.getElementById('pm-package-buy').value;

    a.fee = feeBase;
    a.paymentStatus = 'PAID';
    a.paymentMethod = method;
    a.finalAmount = feeBase;
    a.paidAt = new Date().toISOString();
    a.updatedAt = new Date().toISOString();

    const pIdx = state.patients.findIndex(p => p.id === a.patientId);
    if (pIdx > -1) {
        let patient = state.patients[pIdx];
        if (packageIdBought) {
            const pkg = state.packages.find(x => x.id === packageIdBought);
            if (pkg) patient.quota = (patient.quota || 0) + pkg.sessions;
        }
        if (method === 'Paket' && (patient.quota || 0) > 0) {
            patient.quota -= 1;
        }
    }

    saveData();
    if (state.scriptUrl) syncDelta();
    closeModal();
    renderKasirView(document.getElementById('main-content'));
    showToast("Pembayaran diproses!");
}

async function autoSyncPayment(appt) {
    if (!state.scriptUrl) return;
    const sheetId = getSheetIdFromUrl(state.scriptUrl);
    if (!sheetId || !LICENSE_API_URL) return;
    try {
        await fetch(LICENSE_API_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'sync_incremental',
                sheet_id: sheetId,
                appointments: [appt]
            })
        });
    } catch (e) {
        console.warn('Auto-sync failed:', e);
    }
}
