// Upmarket Pipeline Dashboard V2
let dashboardData = {};
let notesData = {};

// Filter state
let filters = {
    partner: '',
    stage: '',
    dateFrom: '',
    dateTo: ''
};

// Chart instances
let funnelChart = null;
let trendChart = null;

document.addEventListener('DOMContentLoaded', () => {
    loadSampleData();
    initializeFilters();
    renderDashboard();
    loadDashboardData();
    loadNotesData();
});

// ==================== //
// Data Loading         //
// ==================== //

function loadDashboardData() {
    const dataFile = typeof DASHBOARD_CONFIG !== 'undefined' && DASHBOARD_CONFIG.DATA_FILE ? DASHBOARD_CONFIG.DATA_FILE : 'data.json';

    fetch(dataFile)
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => {
            dashboardData = data;
            populatePartnerFilter();
            renderDashboard();
        })
        .catch(() => {});
}

function loadNotesData() {
    const notesFile = typeof DASHBOARD_CONFIG !== 'undefined' && DASHBOARD_CONFIG.NOTES_FILE ? DASHBOARD_CONFIG.NOTES_FILE : 'notes.json';
    
    fetch(notesFile)
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => {
            notesData = data;
            renderWeeklyUpdates();
        })
        .catch(() => {});
}

function loadSampleData() {
    dashboardData = {
        quarterlyTarget: 20000,
        summary: { closedWon: 0, activeCount: 1, weightedPipeline: 42000 },
        partnerSourced: [
            {
                partner: 'Xray Tech',
                owner: 'Brandon',
                account: 'Green Check Verified',
                pipelineStage: '1. Discovery',
                hubspotStage: 'Qualification',
                currentState: 'Verbal YES for MCP sales meeting. Brandon to lead train-the-trainer AI bootcamp with Xray Tech and then have them commit to training at least 5 clients with the same material.',
                nextAction: 'Next step Brandon to host AI Bootcamp with Xray Tech. Brandon has already provided Xray Tech with MCP training material. Following training, we will co-present to the client.'
            }
        ],
        partnerAssisted: [
            {
                partner: 'Connex Digital',
                owner: 'Brandon',
                account: 'LEARN Behavioral',
                stage: 'Validation',
                dealSize: 60000,
                weightedValue: 42000,
                probability: 70,
                lastActivity: '2026-01-05',
                nextAction: 'MSA + Order Form iteration with LEARN counsel; CHRO final approval',
                status: 'Legal redlines in progress',
                psfInvestment: 5000,
                psfHours: 20,
                psfDetails: 'RyRo-approved exception: $5k SOW (~20 hrs) for Phase 1 UKG Pro integration. Connex builds private UKG Pro connector + new-hire workflow.',
                dealOwner: 'Jaime Crespo',
                forecastCategory: 'Commit',
                context: 'Net-new $60k Enterprise opportunity. Normal PSF cap ($1k) waived given deal size and critical UKG integration gap.'
            }
        ],
        partners: [
            { name: 'Xray Tech', owner: 'Brandon', status: 'active', opportunity: 'Green Check Verified' },
            { name: 'Pyxis', owner: 'Brandon', status: 'TBD', opportunity: null },
            { name: 'iZeno', owner: 'Arvy', status: 'TBD', opportunity: null },
            { name: 'Orium (Myplanet)', owner: 'Michael Shen', status: 'TBD', opportunity: null },
            { name: 'Connex Digital', owner: 'Brandon', status: 'active', opportunity: 'LEARN Behavioral' }
        ],
        recentWins: [],
        pipelineTrend: [
            { date: '2025-12-01', weighted: 5000 },
            { date: '2025-12-15', weighted: 7500 },
            { date: '2026-01-01', weighted: 35000 },
            { date: '2026-01-12', weighted: 42000 }
        ],
        stageCounts: {
            'Discovery': 1,
            'Qualified': 0,
            'Proposal': 0,
            'Negotiation': 0,
            'Validation': 1
        },
        lastUpdated: new Date().toISOString()
    };
}

// ==================== //
// Filter Management    //
// ==================== //

function initializeFilters() {
    const partnerSelect = document.getElementById('partnerFilter');
    const stageSelect = document.getElementById('stageFilter');
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');

    if (partnerSelect) {
        partnerSelect.addEventListener('change', (e) => {
            filters.partner = e.target.value;
            renderDashboard();
        });
    }

    if (stageSelect) {
        stageSelect.addEventListener('change', (e) => {
            filters.stage = e.target.value;
            renderDashboard();
        });
    }

    if (dateFrom) {
        dateFrom.addEventListener('change', (e) => {
            filters.dateFrom = e.target.value;
            renderDashboard();
        });
    }

    if (dateTo) {
        dateTo.addEventListener('change', (e) => {
            filters.dateTo = e.target.value;
            renderDashboard();
        });
    }

    populatePartnerFilter();
}

function populatePartnerFilter() {
    const select = document.getElementById('partnerFilter');
    if (!select || !dashboardData.partners) return;

    const current = filters.partner;
    select.innerHTML = '<option value="">All Partners</option>';
    
    dashboardData.partners.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.name;
        opt.textContent = p.name;
        if (p.name === current) opt.selected = true;
        select.appendChild(opt);
    });
}

function applyFilters(items, type = 'opp') {
    if (!items) return [];
    return items.filter(item => {
        if (filters.partner && item.partner !== filters.partner) return false;
        if (filters.stage && item.stage !== filters.stage && item.pipelineStage !== filters.stage) return false;
        if (filters.dateFrom && item.lastActivity) {
            if (new Date(item.lastActivity) < new Date(filters.dateFrom)) return false;
        }
        if (filters.dateTo && item.lastActivity) {
            if (new Date(item.lastActivity) > new Date(filters.dateTo)) return false;
        }
        return true;
    });
}

function getFilteredPartners() {
    if (!dashboardData.partners) return [];
    if (!filters.partner) return dashboardData.partners;
    return dashboardData.partners.filter(p => p.name === filters.partner);
}

// ==================== //
// Rendering Functions  //
// ==================== //

function renderDashboard() {
    updateLastUpdated(dashboardData.lastUpdated);
    renderKPIs();
    renderPartnerSourced();
    renderPartnerAssisted();
    renderRecentWins();
    renderCharts();
    renderBacklog();
    renderWeeklyUpdates();
}

function updateLastUpdated(ts) {
    const time = ts ? new Date(ts) : new Date();
    document.getElementById('lastUpdated').textContent = time.toLocaleString();
}

function renderKPIs() {
    const target = dashboardData.quarterlyTarget || 0;
    const assistedOpps = applyFilters(dashboardData.partnerAssisted || []);
    
    const weighted = assistedOpps.reduce((sum, o) => sum + (o.weightedValue || 0), 0);
    // Active Opps = only actual deals (partner assisted), not pipeline building activities
    const activeCount = assistedOpps.length;
    const closed = computeClosedWon();
    const coverage = target > 0 ? ((closed + weighted) / target).toFixed(2) : '0.00';

    setText('quarterlyTarget', formatCurrency(target));
    setText('closedWon', formatCurrency(closed));
    setText('activeCount', activeCount);
    setText('weightedPipeline', formatCurrency(weighted));
    setText('coverageRatio', `${coverage}x`);
}

function renderPartnerSourced() {
    const container = document.getElementById('partnerSourcedContainer');
    if (!container) return;
    container.innerHTML = '';

    const opps = applyFilters(dashboardData.partnerSourced || []);

    if (opps.length === 0) {
        container.innerHTML = '<div class="opp-empty">No partner sourced opportunities matching filters</div>';
        return;
    }

    opps.forEach(opp => {
        const card = document.createElement('div');
        card.className = 'opp-card sourced';
        
        const stageBadge = opp.pipelineStage ? 
            `<span class="pipeline-stage-badge">${opp.pipelineStage}</span>` : '';
        
        card.innerHTML = `
            <div class="opp-card-header-v2">
                <div class="opp-partner-info">
                    <div class="opp-partner-label">Partner: <span class="opp-partner-name">${opp.partner}</span></div>
                    <div class="opp-manager-label">Partner Manager: <span class="opp-manager-name">${opp.owner}</span></div>
                </div>
                ${stageBadge}
            </div>
            <div class="opp-opportunity-label">Partner Opportunity:</div>
            <div class="opp-account-name">${opp.account}</div>
            <div class="opp-pipeline-stage">
                <span class="stage-label">Pipeline Stage:</span>
                <span class="stage-value">${opp.pipelineStage || opp.stage}</span>
                ${opp.hubspotStage ? `<span class="hubspot-stage">(HubSpot: ${opp.hubspotStage})</span>` : ''}
            </div>
            <div class="opp-current-state">
                <span class="state-label">Current State of Opportunity:</span>
                <div class="state-value">${opp.currentState || opp.status}</div>
            </div>
            <div class="opp-next-action"><strong>Next:</strong> ${opp.nextAction}</div>
        `;
        container.appendChild(card);
    });
}

function renderPartnerAssisted() {
    const container = document.getElementById('partnerAssistedContainer');
    if (!container) return;
    container.innerHTML = '';

    const opps = applyFilters(dashboardData.partnerAssisted || []);

    if (opps.length === 0) {
        container.innerHTML = '<div class="opp-empty">No partner assisted opportunities matching filters</div>';
        return;
    }

    opps.forEach(opp => {
        const card = document.createElement('div');
        card.className = 'opp-card assisted';
        
        let psfSection = '';
        if (opp.psfInvestment) {
            psfSection = `
                <div class="opp-psf">
                    <div class="opp-psf-header">
                        <span class="psf-badge">PSF Investment</span>
                        <span class="psf-amount">${formatCurrency(opp.psfInvestment)} (${opp.psfHours || 0} hrs)</span>
                    </div>
                    ${opp.psfDetails ? `<div class="opp-psf-details">${opp.psfDetails}</div>` : ''}
                </div>
            `;
        }
        
        let dealInfoSection = '';
        if (opp.dealOwner || opp.forecastCategory) {
            dealInfoSection = `
                <div class="opp-deal-info">
                    ${opp.dealOwner ? `<span class="deal-owner">AE: ${opp.dealOwner}</span>` : ''}
                    ${opp.forecastCategory ? `<span class="forecast-category ${opp.forecastCategory.toLowerCase()}">${opp.forecastCategory}</span>` : ''}
                    ${opp.probability ? `<span class="deal-probability">${opp.probability}% probability</span>` : ''}
                </div>
            `;
        }
        
        let contextSection = '';
        if (opp.context) {
            contextSection = `<div class="opp-context">${opp.context}</div>`;
        }
        
        card.innerHTML = `
            <div class="opp-card-header">
                <span class="opp-partner">${opp.partner} &bull; ${opp.owner}</span>
                <span class="opp-stage">${opp.stage}</span>
            </div>
            <div class="opp-account">${opp.account}</div>
            ${dealInfoSection}
            <div class="opp-metrics">
                <div class="opp-metric">
                    <span class="opp-metric-label">Deal Size</span>
                    <span class="opp-metric-value">${formatCurrency(opp.dealSize)}</span>
                </div>
                <div class="opp-metric">
                    <span class="opp-metric-label">Weighted</span>
                    <span class="opp-metric-value">${formatCurrency(opp.weightedValue)}</span>
                </div>
                <div class="opp-metric">
                    <span class="opp-metric-label">Last Activity</span>
                    <span class="opp-metric-value">${formatDate(opp.lastActivity)}</span>
                </div>
            </div>
            ${psfSection}
            <div class="opp-details">${opp.status}</div>
            ${contextSection}
            <div class="opp-next-action"><strong>Next:</strong> ${opp.nextAction}</div>
        `;
        container.appendChild(card);
    });
}

function renderRecentWins() {
    const section = document.getElementById('recentWinsSection');
    const tbody = document.getElementById('recentWinsBody');
    if (!section || !tbody) return;

    const wins = dashboardData.recentWins || [];
    const filteredWins = wins.filter(win => {
        if (filters.partner && win.partner !== filters.partner) return false;
        return true;
    });

    if (filteredWins.length === 0) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');
    tbody.innerHTML = '';

    filteredWins.forEach(win => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${win.partner}</td>
            <td>${win.account}</td>
            <td>${formatCurrency(win.dealSize)}</td>
            <td>${formatDate(win.closeDate)}</td>
            <td>${win.salesCycleDays || '-'} days</td>
        `;
    });
}

function renderCharts() {
    renderFunnelChart();
    renderTrendChart();
}

function renderFunnelChart() {
    const ctx = document.getElementById('funnelChart');
    if (!ctx) return;

    const stageCounts = dashboardData.stageCounts || {};
    const stages = ['Discovery', 'Qualified', 'Proposal', 'Negotiation', 'Validation'];
    const counts = stages.map(s => stageCounts[s] || 0);

    if (funnelChart) funnelChart.destroy();

    funnelChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: stages,
            datasets: [{
                label: 'Opportunities',
                data: counts,
                backgroundColor: [
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(118, 75, 162, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(59, 130, 246, 0.8)'
                ],
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { display: false } },
                y: { grid: { display: false } }
            }
        }
    });
}

function renderTrendChart() {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;

    const trendData = dashboardData.pipelineTrend || [];
    const labels = trendData.map(d => formatDate(d.date));
    const values = trendData.map(d => d.weighted);

    if (trendChart) trendChart.destroy();

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Weighted Pipeline',
                data: values,
                borderColor: 'rgba(102, 126, 234, 1)',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: 'rgba(102, 126, 234, 1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false } },
                y: {
                    beginAtZero: true,
                    ticks: { callback: v => '$' + v.toLocaleString() }
                }
            }
        }
    });
}

function renderBacklog() {
    const tbody = document.getElementById('backlogBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const partners = getFilteredPartners();
    const rows = [];

    partners.forEach(p => {
        (p.backlog || []).forEach(item => {
            if (filters.stage && item.stage !== filters.stage) return;
            rows.push({ partner: p.name, ...item });
        });
    });

    if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="loading">No backlog queued</td></tr>';
        return;
    }

    rows.sort((a, b) => {
        const pa = a.partner.toLowerCase();
        const pb = b.partner.toLowerCase();
        if (pa !== pb) return pa < pb ? -1 : 1;
        return (a.priority || 999) - (b.priority || 999);
    }).forEach((item, idx, arr) => {
        const prev = idx > 0 ? arr[idx - 1] : null;
        if (!prev || prev.partner !== item.partner) {
            const headerRow = tbody.insertRow();
            headerRow.className = 'group-row';
            headerRow.innerHTML = `<td colspan="4">${item.partner}</td>`;
        }
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${item.partner}</td>
            <td>${item.account}</td>
            <td>${item.stage}</td>
            <td>${item.priority || '-'}</td>
        `;
    });
}

function renderWeeklyUpdates() {
    const container = document.getElementById('weeklyUpdates');
    if (!container) return;
    container.innerHTML = '';

    const partners = getFilteredPartners();
    const notes = notesData.notes || partners.map(p => ({
        partner: p.name,
        owner: p.owner,
        content: p.weeklyNote || 'No update yet.'
    }));

    const filteredNotes = filters.partner 
        ? notes.filter(n => n.partner === filters.partner)
        : notes;

    filteredNotes.forEach(note => {
        const card = document.createElement('div');
        card.className = 'update-card';
        card.innerHTML = `
            <div class="update-card-header">${note.partner} &mdash; ${note.owner}</div>
            <div class="update-card-content">${note.content}</div>
        `;
        container.appendChild(card);
    });
}

// ==================== //
// Helper Functions     //
// ==================== //

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value || 0);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function computeClosedWon() {
    const wins = dashboardData.recentWins || [];
    return wins.reduce((sum, win) => {
        if (filters.partner && win.partner !== filters.partner) return sum;
        return sum + (win.dealSize || 0);
    }, 0);
}
