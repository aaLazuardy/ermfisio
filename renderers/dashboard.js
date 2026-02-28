// --- 7. VIEW RENDERERS (DASHBOARD) ---
function renderDashboard(container) {
    const count = state.assessments.length;
    const todayStr = today();
    const todayAppointments = (state.appointments || []).filter(a => a.date === todayStr);
    const todayIncome = (state.appointments || [])
        .filter(a => {
            const isPaid = (a.paymentStatus || '').toUpperCase() === 'PAID';
            const isLegacyPaid = !a.paymentStatus && (a.paymentMethod || a.paidAt);
            return (isPaid || isLegacyPaid) && (a.paidAt || a.date) && (a.paidAt || a.date).slice(0, 10) === todayStr;
        })
        .reduce((sum, a) => sum + (Number(a.finalAmount) || Number(a.fee) || 0), 0);
    const unpaidToday = (state.appointments || []).filter(a => a.date === todayStr && (a.status === 'CONFIRMED' || !a.status) && (a.paymentStatus || '').toUpperCase() !== 'PAID').length;
    const formatRp = (num) => 'Rp ' + (num || 0).toLocaleString('id-ID');

    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 fade-in">
            <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
                <h3 class="text-4xl font-bold">${state.patients.length}</h3><p class="text-blue-100">Total Pasien</p>
            </div>
            <div class="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg">
                <h3 class="text-4xl font-bold">${count}</h3><p class="text-emerald-100">Assessment</p>
            </div>
            <div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                <h3 class="text-4xl font-bold">${todayAppointments.length}</h3><p class="text-purple-100">Pasien Hari Ini</p>
            </div>
            <div class="bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl p-6 text-white shadow-lg cursor-pointer hover:opacity-90 transition-opacity" onclick="navigate('kasir')">
                <h3 class="text-2xl md:text-3xl font-bold truncate" title="${formatRp(todayIncome)}">${formatRp(todayIncome)}</h3>
                <p class="text-orange-100 text-sm md:text-base">Pemasukan Hari Ini</p>
                ${unpaidToday > 0 ? `<div class="mt-2 bg-white/20 rounded-lg px-2 py-1 text-xs font-bold">${unpaidToday} belum bayar →</div>` : '<div class="mt-2 text-xs text-orange-200">Semua lunas ✓</div>'}
            </div>
        </div>
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 fade-in">
            <h3 class="font-bold text-lg mb-4 text-slate-800 border-b pb-2">Kasus Terbanyak</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto">
                ${Object.keys(ICF_TEMPLATES).map(k => `
                <div class="flex justify-between items-center text-sm p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition-colors">
                    <div class="flex items-center gap-3">
                        <div class="w-2 h-2 rounded-full bg-blue-500"></div> 
                        <span class="font-medium text-slate-700">${k}</span>
                    </div>
                    <span class="font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full text-xs">${state.assessments.filter(a => a.diagnosis === k).length}</span>
                </div>`).join('')}
            </div>
        </div>`;
}
