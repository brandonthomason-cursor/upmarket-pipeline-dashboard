// 2026 Upmarket Pipeline and Revenue Dashboard - JavaScript

// Sample data structure (replace with actual data from SQL queries)
let dashboardData = {
    quarterlyTarget: 2000000,
    summaryMetrics: {
        totalOpportunities: 0,
        closedWonDeals: 0,
        closedWonRevenue: 0,
        totalPipelineValue: 0,
        weightedPipelineValue: 0,
        avgDealSize: 0,
        stalledDeals: 0,
        longSalesCycle: 0,
        // Pipeline Progression Metrics
        qualifiedCount: 0,
        discoveryCount: 0,
        proposalCount: 0,
        negotiationCount: 0,
        qualifiedValue: 0,
        discoveryValue: 0,
        proposalValue: 0,
        negotiationValue: 0,
        qualifiedToWonRate: 0,
        discoveryToWonRate: 0,
        pipelineConversionRate: 0,
        // Pacing Metrics
        pipelinePacingPercent: 0,
        activityPacingPercent: 0,
        dealVelocity: 0,
        // Most Important Metrics (with trends)
        qualifiedPipelineTrend: '--',
        conversionRateTrend: '--',
        pacingTrend: '--',
        activityPacingTrend: '--'
    },
    closedWonDeals: [],
    activeOpportunities: [],
    bobOverlaps: [],
    partnerPerformance: {}
};

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    updateLastUpdated();
    // Load sample data immediately (works with file:// protocol)
    loadSampleData();
    renderDashboard();
    // Try to load from data.json if available (requires HTTP server)
    loadDashboardData();
});

// Update last updated timestamp
function updateLastUpdated() {
    const now = new Date();
    document.getElementById('lastUpdated').textContent = now.toLocaleString();
}

// Load dashboard data
function loadDashboardData() {
    // Check if config is available (for GitHub Pages setup)
    const apiUrl = typeof CONFIG !== 'undefined' && CONFIG.API_URL 
        ? CONFIG.API_URL 
        : '/api/dashboard-data'; // Default to relative path for Flask server
    
    const useStaticData = typeof CONFIG !== 'undefined' && CONFIG.USE_STATIC_DATA;
    const dataFile = typeof CONFIG !== 'undefined' && CONFIG.DATA_FILE 
        ? CONFIG.DATA_FILE 
        : 'data.json';
    
    if (useStaticData) {
        // Load from static data.json file (GitHub Actions approach)
        fetch(dataFile)
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                throw new Error('data.json not found');
            })
            .then(data => {
                console.log('Loaded data from data.json');
                dashboardData = data;
                renderDashboard();
            })
            .catch(error => {
                console.log('Error loading data.json:', error);
                if (typeof CONFIG !== 'undefined' && CONFIG.USE_SAMPLE_DATA_ON_ERROR) {
                    loadSampleData();
                    renderDashboard();
                }
            });
    } else {
        // Try to load from API endpoint (live data)
        fetch(apiUrl)
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                // If API fails, try data.json file as fallback
                if (!apiUrl.startsWith('/')) {
                    // Only try data.json if using external API
                    return fetch(dataFile).then(r => r.ok ? r.json() : Promise.reject());
                }
                throw new Error('API request failed');
            })
            .then(data => {
                console.log('Loaded live data from API');
                dashboardData = data;
                renderDashboard();
            })
            .catch(error => {
                console.log('Error loading from API:', error);
                // Fallback to sample data
                if (typeof CONFIG !== 'undefined' && CONFIG.USE_SAMPLE_DATA_ON_ERROR) {
                    loadSampleData();
                    renderDashboard();
                }
            });
    }
    
    // Set up auto-refresh if configured
    if (typeof CONFIG !== 'undefined' && CONFIG.AUTO_REFRESH_INTERVAL > 0) {
        setInterval(loadDashboardData, CONFIG.AUTO_REFRESH_INTERVAL);
    }
}

// Load sample data for POC
function loadSampleData() {
    dashboardData = {
        quarterlyTarget: 2000000,
        summaryMetrics: {
            totalOpportunities: 15,
            closedWonDeals: 3,
            closedWonRevenue: 450000,
            totalPipelineValue: 1800000,
            weightedPipelineValue: 720000,
            avgDealSize: 120000,
            stalledDeals: 2,
            longSalesCycle: 1,
            // Pipeline Progression Metrics
            qualifiedCount: 5,
            discoveryCount: 4,
            proposalCount: 2,
            negotiationCount: 1,
            qualifiedValue: 250000,
            discoveryValue: 300000,
            proposalValue: 150000,
            negotiationValue: 100000,
            qualifiedToWonRate: 15.0,
            discoveryToWonRate: 25.0,
            pipelineConversionRate: 18.5,
            // Pacing Metrics
            pipelinePacingPercent: 16.0,
            activityPacingPercent: 85.0,
            dealVelocity: 2.5,
            // Most Important Metrics (with trends)
            qualifiedPipelineTrend: '↑ +2 this week',
            conversionRateTrend: '↑ +2.5%',
            pacingTrend: '↑ On track',
            activityPacingTrend: '↑ +5%'
        },
        closedWonDeals: [
            {
                opportunityName: 'Acme Corp Expansion',
                partner: 'XrayTech',
                account: 'acme.com',
                dealSize: 150000,
                closeDate: '2026-01-15',
                salesCycleDays: 45,
                ae: 'Emily Misurec',
                inBob: true
            },
            {
                opportunityName: 'TechStart Enterprise',
                partner: 'Pyxis',
                account: 'techstart.io',
                dealSize: 200000,
                closeDate: '2026-01-20',
                salesCycleDays: 60,
                ae: 'Varun Jiandani',
                inBob: true
            },
            {
                opportunityName: 'Global Solutions',
                partner: 'XrayTech',
                account: 'globalsolutions.com',
                dealSize: 100000,
                closeDate: '2026-01-25',
                salesCycleDays: 30,
                ae: null,
                inBob: false
            }
        ],
        activeOpportunities: [
            {
                opportunityName: 'Enterprise Corp Deal',
                partner: 'XrayTech',
                source: 'Referral',
                account: 'enterprisecorp.com',
                stage: 'Proposal',
                dealSize: 250000,
                weightedValue: 125000,
                ae: 'Emily Misurec',
                inBob: true,
                activity30d: '3 calls, 5 emails, 2 meetings',
                risk: null,
                coSellStatus: 'READY FOR CO-SELL (IN AE BOOK - LOOP IN AE EARLY)'
            },
            {
                opportunityName: 'MidMarket Solutions',
                partner: 'Pyxis',
                source: 'Managed Revenue',
                account: 'midmarket.com',
                stage: 'Discovery',
                dealSize: 80000,
                weightedValue: 20000,
                ae: null,
                inBob: false,
                activity30d: '1 call, 2 emails, 0 meetings',
                risk: 'Low Activity',
                coSellStatus: 'READY FOR CO-SELL (NET-NEW - PARTNER LEADS)'
            },
            {
                opportunityName: 'Stalled Opportunity',
                partner: 'iZeno',
                source: 'Referral',
                account: 'stalled.com',
                stage: 'Qualified',
                dealSize: 120000,
                weightedValue: 12000,
                ae: 'John Connell',
                inBob: true,
                activity30d: '0 calls, 0 emails, 0 meetings',
                risk: 'Stalled',
                coSellStatus: 'READY FOR CO-SELL (IN AE BOOK - LOOP IN AE EARLY)'
            }
        ],
        bobOverlaps: [
            {
                partnerDomain: 'enterprisecorp.com',
                partner: 'XrayTech',
                source: 'Referral',
                accountArr: 75000,
                matchStatus: 'MATCH FOUND',
                aeName: 'Emily Misurec',
                bobField: 'company_owner',
                coSellRouting: 'LOOP IN AE EARLY - Co-sell playbook Step 2'
            },
            {
                partnerDomain: 'midmarket.com',
                partner: 'Pyxis',
                source: 'Managed Revenue',
                accountArr: 25000,
                matchStatus: 'NO MATCH',
                aeName: null,
                bobField: null,
                coSellRouting: 'PARTNER LEADS - Net-new account, Zapier supports after discovery'
            }
        ],
        partnerPerformance: {
            'XrayTech': { pipeline: 400000, deals: 5, closedWon: 250000 },
            'Pyxis': { pipeline: 280000, deals: 3, closedWon: 200000 },
            'iZeno': { pipeline: 120000, deals: 1, closedWon: 0 },
            'Orium': { pipeline: 0, deals: 0, closedWon: 0 }
        }
    };
}

// Render all dashboard components
function renderDashboard() {
    renderTargetSection();
    renderMostImportantMetrics();
    renderPipelineProgression();
    renderPacingMetrics();
    renderSummaryMetrics();
    renderPartnerChart();
    renderClosedWonDeals();
    renderActiveOpportunities();
    renderBoBOverlaps();
    populateFilters();
}

// Render target section
function renderTargetSection() {
    const target = dashboardData.quarterlyTarget;
    const weighted = dashboardData.summaryMetrics.weightedPipelineValue || 0;
    const closedWon = dashboardData.summaryMetrics.closedWonRevenue || 0;
    const total = weighted + closedWon;
    const coverage = target > 0 ? (weighted / target).toFixed(2) : '0.00';
    const progressPercent = target > 0 ? Math.min((total / target) * 100, 100) : 0;
    const progressColor = progressPercent >= 100 ? '#10b981' : progressPercent >= 75 ? '#f59e0b' : '#ef4444';

    document.getElementById('quarterlyTarget').textContent = formatCurrency(target);
    document.getElementById('weightedPipeline').textContent = formatCurrency(weighted);
    document.getElementById('pipelineCoverage').textContent = coverage + 'x';
    document.getElementById('targetProgress').style.width = progressPercent + '%';
    document.getElementById('targetProgress').style.backgroundColor = progressColor;
    
    // Add helpful message if no data
    const progressText = document.getElementById('targetProgress');
    if (weighted === 0 && closedWon === 0) {
        progressText.textContent = 'No pipeline data yet';
        progressText.style.color = '#64748b';
    } else {
        progressText.textContent = coverage + 'x coverage';
        progressText.style.color = '#fff';
    }
}

// Render most important metrics (rotating based on priorities)
function renderMostImportantMetrics() {
    const m = dashboardData.summaryMetrics || {};
    const progression = m.qualifiedCount || 0;
    const conversionRate = m.pipelineConversionRate || 0;
    const pacing = m.pipelinePacingPercent || 0;
    const activityPacing = m.activityPacingPercent || 0;
    
    // Qualified Pipeline Progression
    document.getElementById('qualifiedPipelineProgression').textContent = progression;
    const progressionTrend = m.qualifiedPipelineTrend || '--';
    document.getElementById('qualifiedPipelineTrend').textContent = progressionTrend;
    
    // Pipeline Conversion Rate
    document.getElementById('pipelineConversionRate').textContent = conversionRate.toFixed(1) + '%';
    const conversionTrend = m.conversionRateTrend || '--';
    document.getElementById('conversionRateTrend').textContent = conversionTrend;
    
    // Pipeline Pacing
    document.getElementById('pipelinePacing').textContent = pacing.toFixed(1) + '%';
    const pacingTrend = m.pacingTrend || '--';
    document.getElementById('pacingTrend').textContent = pacingTrend;
    
    // Activity Pacing
    document.getElementById('activityPacing').textContent = activityPacing.toFixed(1) + '%';
    const activityPacingTrend = m.activityPacingTrend || '--';
    document.getElementById('activityPacingTrend').textContent = activityPacingTrend;
}

// Render pipeline progression metrics
function renderPipelineProgression() {
    const m = dashboardData.summaryMetrics || {};
    
    // Stage counts
    document.getElementById('qualifiedCount').textContent = m.qualifiedCount || 0;
    document.getElementById('discoveryCount').textContent = m.discoveryCount || 0;
    document.getElementById('proposalCount').textContent = m.proposalCount || 0;
    document.getElementById('negotiationCount').textContent = m.negotiationCount || 0;
    
    // Stage values
    document.getElementById('qualifiedValue').textContent = formatCurrency(m.qualifiedValue || 0, true);
    document.getElementById('discoveryValue').textContent = formatCurrency(m.discoveryValue || 0, true);
    document.getElementById('proposalValue').textContent = formatCurrency(m.proposalValue || 0, true);
    document.getElementById('negotiationValue').textContent = formatCurrency(m.negotiationValue || 0, true);
    
    // Conversion rates
    document.getElementById('qualifiedToWonRate').textContent = (m.qualifiedToWonRate || 0).toFixed(1) + '%';
    document.getElementById('discoveryToWonRate').textContent = (m.discoveryToWonRate || 0).toFixed(1) + '%';
}

// Render pacing metrics
function renderPacingMetrics() {
    const m = dashboardData.summaryMetrics || {};
    const target = dashboardData.quarterlyTarget || 2000000;
    
    // Pipeline pacing
    const pipelinePacing = m.pipelinePacingPercent || 0;
    document.getElementById('pipelinePacingPercent').textContent = pipelinePacing.toFixed(1) + '%';
    
    // Revenue pacing
    const revenuePacing = ((m.closedWonRevenue || 0) / target * 100);
    document.getElementById('revenuePacingPercent').textContent = revenuePacing.toFixed(1) + '%';
    
    // Activity pacing
    const activityPacing = m.activityPacingPercent || 0;
    document.getElementById('activityPacingPercent').textContent = activityPacing.toFixed(1) + '%';
    
    // Deal velocity (deals per week)
    const dealVelocity = m.dealVelocity || 0;
    document.getElementById('dealVelocity').textContent = dealVelocity.toFixed(1);
}

// Render summary metrics
function renderSummaryMetrics() {
    const m = dashboardData.summaryMetrics || {};
    document.getElementById('totalOpportunities').textContent = m.totalOpportunities || 0;
    document.getElementById('closedWonDeals').textContent = m.closedWonDeals || 0;
    document.getElementById('closedWonRevenue').textContent = formatCurrency(m.closedWonRevenue || 0);
    document.getElementById('totalPipelineValue').textContent = formatCurrency(m.totalPipelineValue || 0);
    document.getElementById('weightedPipelineValue').textContent = formatCurrency(m.weightedPipelineValue || 0);
    document.getElementById('avgDealSize').textContent = formatCurrency(m.avgDealSize || 0);
    document.getElementById('stalledDeals').textContent = m.stalledDeals || 0;
    document.getElementById('longSalesCycle').textContent = m.longSalesCycle || 0;
}

// Render partner performance chart
function renderPartnerChart() {
    const ctx = document.getElementById('partnerChart').getContext('2d');
    const partners = Object.keys(dashboardData.partnerPerformance);
    const pipelineData = partners.map(p => dashboardData.partnerPerformance[p].pipeline);
    const closedWonData = partners.map(p => dashboardData.partnerPerformance[p].closedWon);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: partners,
            datasets: [
                {
                    label: 'Pipeline Value',
                    data: pipelineData,
                    backgroundColor: 'rgba(102, 126, 234, 0.8)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Closed Won',
                    data: closedWonData,
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + (value / 1000) + 'K';
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
                        }
                    }
                }
            }
        }
    });
}

// Render closed won deals table
function renderClosedWonDeals() {
    const tbody = document.getElementById('closedWonTableBody');
    tbody.innerHTML = '';

    if (dashboardData.closedWonDeals.length === 0) {
        const totalOpps = dashboardData.summaryMetrics.totalOpportunities || 0;
        const message = totalOpps === 0 
            ? '<tr><td colspan="8" class="empty-state"><div class="empty-message"><strong>No closed won deals found</strong><br><span class="empty-subtext">This could mean:<ul><li>No partner-sourced deals have closed yet in 2026</li><li>Deals may be in earlier stages of the pipeline</li><li>Check that SQL queries are filtering for the correct date range</li></ul></span></div></td></tr>'
            : '<tr><td colspan="8" class="empty-state"><div class="empty-message"><strong>No closed won deals yet</strong><br><span class="empty-subtext">You have ' + totalOpps + ' active opportunities in the pipeline. Focus on moving deals through the stages.</span></div></td></tr>';
        tbody.innerHTML = message;
        return;
    }

    dashboardData.closedWonDeals.forEach(deal => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${deal.opportunityName}</td>
            <td>${deal.partner}</td>
            <td>${deal.account}</td>
            <td>${formatCurrency(deal.dealSize)}</td>
            <td>${formatDate(deal.closeDate)}</td>
            <td>${deal.salesCycleDays} days</td>
            <td>${deal.ae || '-'}</td>
            <td>${deal.inBob ? '✓' : '-'}</td>
        `;
    });
}

// Render active opportunities table
function renderActiveOpportunities() {
    const tbody = document.getElementById('opportunitiesTableBody');
    tbody.innerHTML = '';

    if (dashboardData.activeOpportunities.length === 0) {
        const lastUpdated = dashboardData.lastUpdated ? new Date(dashboardData.lastUpdated).toLocaleString() : 'Unknown';
        const message = '<tr><td colspan="12" class="empty-state"><div class="empty-message"><strong>No active opportunities found</strong><br><span class="empty-subtext">Last updated: ' + lastUpdated + '<br><br>Possible reasons:<ul><li>No partner-sourced opportunities meet upmarket criteria (ARR >= $12,000)</li><li>All opportunities may have been closed or lost</li><li>Date filters may exclude current opportunities</li><li>Check SQL query filters and date ranges</li></ul><br><strong>Next steps:</strong><ul><li>Verify Databricks queries are returning data</li><li>Check that partner referral data exists</li><li>Review upmarket qualification criteria</li></ul></span></div></td></tr>';
        tbody.innerHTML = message;
        return;
    }

    dashboardData.activeOpportunities.forEach(opp => {
        const row = tbody.insertRow();
        const sourceBadge = opp.source === 'Referral' ? 'badge-referral' : 'badge-managed';
        const riskBadge = opp.risk ? 'badge-risk' : '';
        const coSellBadge = opp.coSellStatus.includes('READY') ? 'badge-ready' : '';
        
        row.innerHTML = `
            <td>${opp.opportunityName}</td>
            <td>${opp.partner}</td>
            <td><span class="badge ${sourceBadge}">${opp.source}</span></td>
            <td>${opp.account}</td>
            <td>${opp.stage}</td>
            <td>${formatCurrency(opp.dealSize)}</td>
            <td>${formatCurrency(opp.weightedValue)}</td>
            <td>${opp.ae || '-'}</td>
            <td>${opp.inBob ? '✓' : '-'}</td>
            <td>${opp.activity30d}</td>
            <td>${opp.risk ? `<span class="badge ${riskBadge}">${opp.risk}</span>` : '-'}</td>
            <td><span class="badge ${coSellBadge}">${opp.coSellStatus}</span></td>
        `;
    });
}

// Render BoB overlaps table
function renderBoBOverlaps() {
    const tbody = document.getElementById('bobTableBody');
    tbody.innerHTML = '';

    if (dashboardData.bobOverlaps.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading">No BoB overlaps found</td></tr>';
        return;
    }

    dashboardData.bobOverlaps.forEach(overlap => {
        const row = tbody.insertRow();
        const matchBadge = overlap.matchStatus === 'MATCH FOUND' ? 'badge-match' : 'badge-no-match';
        
        row.innerHTML = `
            <td>${overlap.partnerDomain}</td>
            <td>${overlap.partner}</td>
            <td><span class="badge badge-referral">${overlap.source}</span></td>
            <td>${formatCurrency(overlap.accountArr)}</td>
            <td><span class="badge ${matchBadge}">${overlap.matchStatus}</span></td>
            <td>${overlap.aeName || '-'}</td>
            <td>${overlap.bobField || '-'}</td>
            <td>${overlap.coSellRouting}</td>
        `;
    });
}

// Populate filter dropdowns
function populateFilters() {
    const partnerFilter = document.getElementById('filterPartner');
    const partners = [...new Set(dashboardData.activeOpportunities.map(o => o.partner))];
    
    partners.forEach(partner => {
        const option = document.createElement('option');
        option.value = partner;
        option.textContent = partner;
        partnerFilter.appendChild(option);
    });
}

// Filter opportunities
function filterOpportunities() {
    const partnerFilter = document.getElementById('filterPartner').value;
    const stageFilter = document.getElementById('filterStage').value;
    const riskFilter = document.getElementById('filterRisk').value;
    const searchTerm = document.getElementById('searchOpportunities').value.toLowerCase();

    const tbody = document.getElementById('opportunitiesTableBody');
    tbody.innerHTML = '';

    const filtered = dashboardData.activeOpportunities.filter(opp => {
        const matchPartner = !partnerFilter || opp.partner === partnerFilter;
        const matchStage = !stageFilter || opp.stage === stageFilter;
        const matchRisk = !riskFilter || (opp.risk && opp.risk.includes(riskFilter));
        const matchSearch = !searchTerm || 
            opp.opportunityName.toLowerCase().includes(searchTerm) ||
            opp.account.toLowerCase().includes(searchTerm) ||
            (opp.partner && opp.partner.toLowerCase().includes(searchTerm));

        return matchPartner && matchStage && matchRisk && matchSearch;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" class="loading">No opportunities match the filters</td></tr>';
        return;
    }

    filtered.forEach(opp => {
        const row = tbody.insertRow();
        const sourceBadge = opp.source === 'Referral' ? 'badge-referral' : 'badge-managed';
        const riskBadge = opp.risk ? 'badge-risk' : '';
        const coSellBadge = opp.coSellStatus.includes('READY') ? 'badge-ready' : '';
        
        row.innerHTML = `
            <td>${opp.opportunityName}</td>
            <td>${opp.partner}</td>
            <td><span class="badge ${sourceBadge}">${opp.source}</span></td>
            <td>${opp.account}</td>
            <td>${opp.stage}</td>
            <td>${formatCurrency(opp.dealSize)}</td>
            <td>${formatCurrency(opp.weightedValue)}</td>
            <td>${opp.ae || '-'}</td>
            <td>${opp.inBob ? '✓' : '-'}</td>
            <td>${opp.activity30d}</td>
            <td>${opp.risk ? `<span class="badge ${riskBadge}">${opp.risk}</span>` : '-'}</td>
            <td><span class="badge ${coSellBadge}">${opp.coSellStatus}</span></td>
        `;
    });
}

// Utility functions
function formatCurrency(value, abbreviated = false) {
    if (abbreviated && value >= 1000000) {
        return (value / 1000000).toFixed(1) + 'M';
    } else if (abbreviated && value >= 1000) {
        return (value / 1000).toFixed(0) + 'K';
    }
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

