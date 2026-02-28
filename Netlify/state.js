// --- 1. STATE & GLOBAL VARIABLES ---
let state = {
    _version: '5.5',
    user: null,
    users: [],
    patients: [],
    assessments: [],
    appointments: [],
    expenses: [],
    packages: [],
    printSelection: [],
    currentView: 'login',
    selectedPatient: null,
    currentAssessment: null,
    patientLimit: 50,
    assessmentLimit: 50,
    scriptUrl: '',
    sheetId: '',
    filterPatientId: null,
    laporanLimit: 50,
    laporanSearch: '',
    calendarDate: new Date(),
    pdfConfig: {
        layoutMode: 'normal',
        accentColor: 'blue',
        showKop: true, showPatientInfo: true, showDiagnosis: true,
        showAnamnesis: true, showBodyChart: true, showObjective: true,
        showImpairment: true, showLimitation: true, showIntervention: true,
        showEvalPlan: true, showSignature: true,
        showInformedConsent: true,
        informedConsentText: 'Dengan ini saya menyatakan bahwa saya memberikan persetujuan kepada Fisioterapis untuk melakukan tindakan pemeriksaan dan terapi sesuai dengan standar profesi. Saya telah mendapatkan penjelasan mengenai tujuan, risiko, dan manfaat dari tindakan tersebut.',
        fontFamily: 'sans', fontSize: '10pt'
    },
    clinicInfo: {
        name: 'FISIOTA',
        subname: 'Physiotherapy & Rehab',
        therapist: 'Fisio',
        sipf: 'SIPF: ....................',
        address: 'Jl. Contoh No.1, Kota, Provinsi',
        phone: '',
        mapsUrl: ''
    },
    notificationConfig: {
        telegramToken: '',
        telegramChatId: '',
        targetEmail: '',
        senderEmail: '',
        msgConfirm: '',
        msgReject: '',
        msgReminder: ''
    },
    bookingConfig: {
        alias: '',
        availableHours: ''
    },
    deletedIds: {
        patients: [],
        assessments: [],
        appointments: [],
        expenses: [],
        packages: []
    },
    pendingUploads: []
};

let currentTemplateCategory = 'Semua';
let currentTemplateRegion = 'Semua';
let templateSearchQuery = '';
let selectedExercises = [];
window.tempFormData = {};
