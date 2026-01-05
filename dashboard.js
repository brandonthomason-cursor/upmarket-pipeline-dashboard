// Upmarket Pipeline Focus - minimal, one-at-a-time view
let dashboardData = {};
let selectedPartner = '';

document.addEventListener('DOMContentLoaded', () => {
    loadSampleData();
    populatePartnerFilter();
    renderDashboard();
    loadDashboardData();
});

function updateLastUpdated(ts) {
    const time = ts ? new Date(ts) : new Date();
    document.getElementById('lastUpdated').textContent = time.toLocaleString();
}

function loadDashboardData() {
    const apiUrl = typeof CONFIG !== 'undefined' && CONFIG.API_URL ? CONFIG.API_URL : null;
    const useStatic = typeof CONFIG !== 'undefined' && CONFIG.USE_STATIC_DATA;
    const dataFile = typeof CONFIG !== 'undefined' && CONFIG.DATA_FILE ? CONFIG.DATA_FILE : 'data.json';

    if (!apiUrl && !useStatic) return;

    const source = useStatic ? dataFile : apiUrl;
    fetch(source)
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => {
            dashboardData = data;
                populatePartnerFilter();
            renderDashboard();
        })
        .catch(() => {
            // keep sample data if fetch fails
        });
}

// Sample data aligned to the simplified layout
function loadSampleData() {
    dashboardData = {
        quarterlyTarget: 20000,
        summary: {
            closedWon: 5000,
            activeCount: 2,
            weightedPipeline: 12000
        },
        partners: [
            {
                name: 'Xray Tech',
                owner: 'Brandon',
                active: {
                    account: 'Enterprise Corp',
                    stage: 'Proposal',
                    dealSize: 12000,
                    weightedValue: 6000,
                    lastActivity: '2025-12-22',
                    nextAction: 'Pricing review on Jan 6',
                    status: 'On track'
                },
                backlog: [
                    { account: 'Global Solutions', stage: 'Qualified', priority: 1 },
                    { account: 'FinServe Co', stage: 'Discovery', priority: 2 }
                ],
                weeklyNote: 'Met pre-holidays; CFO review pending; schedule exec sponsor call week of Jan 6.',
                submittedDomains: [
                    { account: 'Enterprise Corp', domain: 'enterprisecorp.com', status: 'active', stage: 'Proposal', priority: 1, lastActivity: '2025-12-22', note: 'Pricing review Jan 6' },
                    { account: 'Global Solutions', domain: 'globalsolutions.com', status: 'next', stage: 'Qualified', priority: 2, lastActivity: '2025-12-18', note: 'Queued next' },
                    { account: 'FinServe Co', domain: 'finserve.co', status: 'next', stage: 'Discovery', priority: 3, lastActivity: '2025-12-17', note: 'Discovery prep' },
                    { account: 'HealthSoft', domain: 'healthsoft.io', status: 'queued', stage: 'Unscreened', priority: 4, lastActivity: null, note: '' },
                    { account: 'Apollo Global', domain: 'apollo.com', status: 'queued', stage: 'Unscreened', priority: 5, lastActivity: null, note: '' },
                    { account: 'CCAHA', domain: 'ccaha.org', status: 'queued', stage: 'Unscreened', priority: 6, lastActivity: null, note: '' },
                    { account: 'Level Agency', domain: 'level.agency', status: 'queued', stage: 'Unscreened', priority: 7, lastActivity: null, note: '' },
                    { account: 'MediData', domain: 'medidata.com', status: 'queued', stage: 'Unscreened', priority: 8, lastActivity: null, note: '' },
                    { account: 'Coding Clarified', domain: '', status: 'queued', stage: 'Unscreened', priority: 9, lastActivity: null, note: '' },
                    { account: 'SEM Rush', domain: 'semrush.com', status: 'queued', stage: 'Unscreened', priority: 10, lastActivity: null, note: '' },
                    { account: 'Try Penny', domain: 'trypennie.com', status: 'queued', stage: 'Unscreened', priority: 11, lastActivity: null, note: '' },
                    { account: 'Boston BioPr', domain: '', status: 'queued', stage: 'Unscreened', priority: 12, lastActivity: null, note: '' },
                    { account: 'US Pet Food', domain: 'uspetfood.com', status: 'queued', stage: 'Unscreened', priority: 13, lastActivity: null, note: '' },
                    { account: 'Journey Live', domain: 'journey.live', status: 'queued', stage: 'Unscreened', priority: 14, lastActivity: null, note: '' },
                    { account: 'SoloMID', domain: 'solomid.net', status: 'queued', stage: 'Unscreened', priority: 15, lastActivity: null, note: '' },
                    { account: "Ben & Jerry's", domain: '', status: 'queued', stage: 'Unscreened', priority: 16, lastActivity: null, note: '' },
                    { account: "O'Reilly Media", domain: 'oreilly.com', status: 'queued', stage: 'Unscreened', priority: 17, lastActivity: null, note: '' },
                    { account: 'Green Check', domain: '', status: 'queued', stage: 'Unscreened', priority: 18, lastActivity: null, note: '' },
                    { account: 'S&S Activewear', domain: 'ssactivewear.com', status: 'queued', stage: 'Unscreened', priority: 19, lastActivity: null, note: '' },
                    { account: 'AY Media', domain: 'aymag.com', status: 'queued', stage: 'Unscreened', priority: 20, lastActivity: null, note: '' },
                    { account: 'CCRES', domain: 'ccres.org', status: 'queued', stage: 'Unscreened', priority: 21, lastActivity: null, note: '' },
                    { account: 'Acumen Fina', domain: 'acumenfa.com', status: 'queued', stage: 'Unscreened', priority: 22, lastActivity: null, note: '' },
                    { account: 'Custodia Bank', domain: 'custodiabank.com', status: 'queued', stage: 'Unscreened', priority: 23, lastActivity: null, note: '' },
                    { account: '128 Plumbing', domain: 'call128.com', status: 'queued', stage: 'Unscreened', priority: 24, lastActivity: null, note: '' },
                    { account: 'Dirty Hands', domain: 'dhstoresupport.com', status: 'queued', stage: 'Unscreened', priority: 25, lastActivity: null, note: '' },
                    { account: 'Munipqlk', domain: '', status: 'queued', stage: 'Unscreened', priority: 26, lastActivity: null, note: '' },
                    { account: 'Feed My Star', domain: 'fmsc.org', status: 'queued', stage: 'Unscreened', priority: 27, lastActivity: null, note: '' },
                    { account: 'Utility Cloud', domain: 'amcsgroup.com', status: 'queued', stage: 'Unscreened', priority: 28, lastActivity: null, note: '' },
                    { account: 'Avanti Bank', domain: '', status: 'queued', stage: 'Unscreened', priority: 29, lastActivity: null, note: '' },
                    { account: 'Arc Southeast', domain: 'arc-southeast.org', status: 'queued', stage: 'Unscreened', priority: 30, lastActivity: null, note: '' },
                    { account: '1800Accountant', domain: '1800accountant.com', status: 'queued', stage: 'Unscreened', priority: 31, lastActivity: null, note: 'Partner assisted' },
                    { account: 'Hiperbaric', domain: '', status: 'queued', stage: 'Unscreened', priority: 32, lastActivity: null, note: 'Partner assisted' },
                    { account: 'Hexagon', domain: '', status: 'queued', stage: 'Unscreened', priority: 33, lastActivity: null, note: 'Partner assisted' }
                ]
            },
            {
                name: 'Pyxis',
                owner: 'Brandon',
                active: {
                    account: 'TechStart',
                    stage: 'Discovery',
                    dealSize: 10000,
                    weightedValue: 2500,
                    lastActivity: '2025-12-20',
                    nextAction: 'Book technical deep-dive',
                    status: 'Needs activity'
                },
                backlog: [
                    { account: 'MidMarket Labs', stage: 'Qualified', priority: 1 },
                    { account: 'Northwind AI', stage: 'Qualified', priority: 2 }
                ],
                weeklyNote: 'Awaiting tech review resources; re-engage Jan 7.',
                submittedDomains: [
                    { account: 'TechStart', domain: 'techstart.io', status: 'active', stage: 'Discovery', priority: 1, lastActivity: '2025-12-20', note: 'Deep-dive to book' },
                    { account: 'MidMarket Labs', domain: 'midmarketlabs.com', status: 'next', stage: 'Qualified', priority: 2, lastActivity: '2025-12-15', note: 'Awaiting kickoff' },
                    { account: 'Northwind AI', domain: 'northwind.ai', status: 'next', stage: 'Qualified', priority: 3, lastActivity: '2025-12-14', note: 'Shortlist' },
                    { account: 'Acme Retail', domain: 'acmeretail.com', status: 'queued', stage: 'Unscreened', priority: 4, lastActivity: null, note: '' },
                    { account: 'SolidCAM', domain: 'solidcam.com', status: 'queued', stage: 'Unscreened', priority: 5, lastActivity: null, note: '' },
                    { account: 'US Anti-Doping Agency (USADA)', domain: 'usada.org', status: 'queued', stage: 'Unscreened', priority: 6, lastActivity: null, note: '' },
                    { account: 'Valiantys', domain: 'valiantys.com', status: 'queued', stage: 'Unscreened', priority: 7, lastActivity: null, note: '' },
                    { account: 'CyberFortress', domain: 'cyberfortress.com', status: 'queued', stage: 'Unscreened', priority: 8, lastActivity: null, note: '' },
                    { account: 'Trimark USA', domain: 'trimarkusa.com', status: 'queued', stage: 'Unscreened', priority: 9, lastActivity: null, note: '' },
                    { account: 'Deriva Energy', domain: 'derivaenergy.com', status: 'queued', stage: 'Unscreened', priority: 10, lastActivity: null, note: '' },
                    { account: 'Regal Plastics', domain: 'regal-plastics.com', status: 'queued', stage: 'Unscreened', priority: 11, lastActivity: null, note: '' },
                    { account: 'VMG Health', domain: 'vmghealth.com', status: 'queued', stage: 'Unscreened', priority: 12, lastActivity: null, note: '' },
                    { account: 'Mohr Partners', domain: 'mohrpartners.com', status: 'queued', stage: 'Unscreened', priority: 13, lastActivity: null, note: '' },
                    { account: 'Aldevron', domain: 'aldevron.com', status: 'queued', stage: 'Unscreened', priority: 14, lastActivity: null, note: '' },
                    { account: 'DAS Health', domain: 'dashealth.com', status: 'queued', stage: 'Unscreened', priority: 15, lastActivity: null, note: '' },
                    { account: 'Security 101', domain: 'security101.com', status: 'queued', stage: 'Unscreened', priority: 16, lastActivity: null, note: '' },
                    { account: 'EnergyHub', domain: 'energyhub.com', status: 'queued', stage: 'Unscreened', priority: 17, lastActivity: null, note: '' },
                    { account: 'Palo Alto University', domain: 'paloaltou.edu', status: 'queued', stage: 'Unscreened', priority: 18, lastActivity: null, note: '' },
                    { account: 'TDIndustries', domain: 'tdindustries.com', status: 'queued', stage: 'Unscreened', priority: 19, lastActivity: null, note: '' },
                    { account: 'Overhaul', domain: 'over-haul.com', status: 'queued', stage: 'Unscreened', priority: 20, lastActivity: null, note: '' }
                ]
            },
            {
                name: 'iZeno',
                owner: 'Michael Shen',
                active: null,
                backlog: [
                    { account: 'APAC Retailer', stage: 'Qualified', priority: 1 },
                    { account: 'DataOps Co', stage: 'Discovery', priority: 2 }
                ],
                weeklyNote: 'No active upmarket opp yet; reviewing list with Michael.',
                submittedDomains: [
                    { account: 'APAC Retailer', domain: 'apacretailer.com', status: 'next', stage: 'Qualified', priority: 1, lastActivity: null, note: 'Pending activation' },
                    { account: 'DataOps Co', domain: 'dataops.co', status: 'next', stage: 'Discovery', priority: 2, lastActivity: null, note: '' }
                ]
            },
            {
                name: 'Orium',
                owner: 'Michael Shen',
                active: null,
                backlog: [
                    { account: 'Commerce Cloud', stage: 'Qualified', priority: 1 }
                ],
                weeklyNote: 'Queue ready once iZeno activates.',
                submittedDomains: [
                    { account: 'Commerce Cloud', domain: 'commercecloud.com', status: 'next', stage: 'Qualified', priority: 1, lastActivity: null, note: 'Pending activation' }
                ]
            }
        ],
        recentWins: [
            { partner: 'Pyxis', account: 'TechStart Pilot', dealSize: 5000, closeDate: '2025-12-15', salesCycleDays: 45 }
        ],
        lastUpdated: new Date().toISOString()
    };
}

function renderDashboard() {
    updateLastUpdated(dashboardData.lastUpdated);
    const partners = getFilteredPartners();
    renderTargetStrip(partners);
    renderFocus(partners);
    renderBacklog(partners);
    renderDomains(partners);
    renderWeeklyUpdates(partners);
    renderRecentWins(partners);
}

function renderTargetStrip(partners) {
    const target = dashboardData.quarterlyTarget || 0;
    const closed = computeClosedWon(partners);
    const weighted = partners.reduce((sum, p) => sum + (p.active?.weightedValue || 0), 0);
    const coverage = target > 0 ? ((closed + weighted) / target).toFixed(2) : '0.00';
    const activeCount = partners.filter(p => p.active).length;
    const gap = Math.max(target - closed, 0);
    const forecast = closed + weighted;
    const forecastStatus = target > 0
        ? forecast >= target
            ? 'On track to hit target'
            : `Short by ${formatCurrency(target - forecast)}`
        : '';

    setText('quarterlyTarget', formatCurrency(target));
    setText('closedWon', formatCurrency(closed));
    setText('gapToGoal', formatCurrency(gap));
    setText('activeCount', activeCount);
    setText('weightedPipeline', formatCurrency(weighted));
    setText('forecastTotal', formatCurrency(forecast));
    setText('forecastStatus', forecastStatus);
    setText('coverageRatio', `${coverage}x`);
}

function renderFocus(partners) {
    const container = document.getElementById('focusContainer');
    container.innerHTML = '';

    partners.forEach(partner => {
        const card = document.createElement('div');
        card.className = 'metric-card focus-card';

        if (partner.active) {
            const a = partner.active;
            card.innerHTML = `
                <div class="metric-label">${partner.name} — owner: ${partner.owner}</div>
                <div class="metric-value">${a.account}</div>
                <div class="metric-subtext">${a.stage} • ${formatCurrency(a.dealSize)} (${formatCurrency(a.weightedValue)} weighted)</div>
                <div class="metric-subtext">Last activity: ${formatDate(a.lastActivity)} | Next: ${a.nextAction}</div>
                <div class="metric-subtext">${a.status}</div>
            `;
        } else {
            card.innerHTML = `
                <div class="metric-label">${partner.name} — owner: ${partner.owner}</div>
                <div class="metric-subtext">No active upmarket opp. Activate top backlog pick.</div>
            `;
        }

        container.appendChild(card);
    });
}

function renderBacklog(partners) {
    const tbody = document.getElementById('backlogBody');
    tbody.innerHTML = '';

    const rows = [];
    partners.forEach(p => {
        (p.backlog || []).forEach(item => {
            rows.push({ partner: p.name, ...item });
        });
    });

    if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="loading">No backlog queued</td></tr>';
        return;
    }

    rows
        .sort((a, b) => {
            const pa = a.partner.toLowerCase();
            const pb = b.partner.toLowerCase();
            if (pa !== pb) return pa < pb ? -1 : 1;
            return (a.priority || 999) - (b.priority || 999);
        })
        .forEach((item, idx, arr) => {
            const prev = idx > 0 ? arr[idx - 1] : null;
            const isNewPartner = !prev || prev.partner !== item.partner;
            if (isNewPartner) {
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

function renderDomains(partners) {
    const tbody = document.getElementById('domainsBody');
    tbody.innerHTML = '';

    const summaryDiv = document.getElementById('domainSummary');
    summaryDiv.innerHTML = '';

    const rows = [];
    partners.forEach(p => {
        (p.submittedDomains || []).forEach(item => {
            rows.push({ partner: p.name, owner: p.owner, ...item });
        });
    });

    if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading">No submitted domains yet</td></tr>';
        return;
    }

    const statusOrder = { active: 1, next: 2, queued: 3 };

    rows
        .sort((a, b) => {
            const sa = statusOrder[a.status] || 99;
            const sb = statusOrder[b.status] || 99;
            if (sa !== sb) return sa - sb;
            return (a.priority || 999) - (b.priority || 999);
        })
        .forEach(item => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${item.partner}</td>
                <td>${item.account}${item.domain ? ' (' + item.domain + ')' : ''}</td>
                <td class="status-${item.status || 'queued'}">${item.status || '-'}</td>
                <td>${item.stage || '-'}</td>
                <td>${item.priority || '-'}</td>
                <td>${item.lastActivity ? formatDate(item.lastActivity) : '-'}</td>
                <td>${item.note || ''}</td>
            `;
        });

    // Partner-level totals
    const byPartner = {};
    rows.forEach(r => {
        if (!byPartner[r.partner]) byPartner[r.partner] = { total: 0, active: 0, next: 0, queued: 0 };
        byPartner[r.partner].total += 1;
        if (r.status === 'active') byPartner[r.partner].active += 1;
        else if (r.status === 'next') byPartner[r.partner].next += 1;
        else byPartner[r.partner].queued += 1;
    });

    const summaryParts = Object.keys(byPartner).map(p => {
        const s = byPartner[p];
        return `<div class="summary-pill"><strong>${p}</strong>: ${s.total} submitted • ${s.active} active • ${s.next} next • ${s.queued} queued</div>`;
    });
    summaryDiv.innerHTML = summaryParts.join('');
}

function renderWeeklyUpdates(partners) {
    const container = document.getElementById('weeklyUpdates');
    container.innerHTML = '';

    partners.forEach(p => {
        const note = document.createElement('div');
        note.className = 'metric-card update-card';
        note.innerHTML = `
            <div class="metric-label">${p.name} — ${p.owner}</div>
            <div class="metric-subtext">${p.weeklyNote || 'No update yet.'}</div>
        `;
        container.appendChild(note);
    });
}

function renderRecentWins(partners) {
    const tbody = document.getElementById('recentWinsBody');
    tbody.innerHTML = '';

    const partnerNames = new Set(partners.map(p => p.name));
    const wins = (dashboardData.recentWins || []).filter(win => {
        return selectedPartner ? partnerNames.has(win.partner) : true;
    });

    if (!wins || wins.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading">No wins yet</td></tr>';
        return;
    }

    wins.forEach(win => {
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

// Helpers
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

function getFilteredPartners() {
    if (!dashboardData.partners) return [];
    if (!selectedPartner) return dashboardData.partners;
    return dashboardData.partners.filter(p => p.name === selectedPartner);
}

function populatePartnerFilter() {
    const select = document.getElementById('partnerFilter');
    if (!select || !dashboardData.partners) return;
    const current = selectedPartner;
    select.innerHTML = '<option value=\"\">All partners</option>';
    dashboardData.partners.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.name;
        opt.textContent = p.name;
        if (p.name === current) opt.selected = true;
        select.appendChild(opt);
    });
    select.onchange = (e) => {
        selectedPartner = e.target.value;
        renderDashboard();
    };
}

function computeClosedWon(partners) {
    const partnerNames = new Set(partners.map(p => p.name));
    return (dashboardData.recentWins || []).reduce((sum, win) => {
        if (selectedPartner && !partnerNames.has(win.partner)) return sum;
        return sum + (win.dealSize || 0);
    }, 0);
}
