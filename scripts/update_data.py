#!/usr/bin/env python3
"""
Update dashboard data.json from Databricks SQL queries
Used by GitHub Actions to periodically update the dashboard data
"""

import json
import os
import sys
from pathlib import Path
from datetime import datetime

# Add parent directory to path to import utilities
dashboard_dir = Path(__file__).parent.parent
mcp_dir = dashboard_dir.parent.parent
sys.path.insert(0, str(mcp_dir))

try:
    from databricks_sdk_utils import execute_databricks_sql
except ImportError:
    print("Warning: Could not import databricks_sdk_utils")
    execute_databricks_sql = None

def load_sql_query(filename):
    """Load SQL query from file"""
    # Try multiple locations for SQL files
    possible_locations = [
        dashboard_dir / 'sql' / filename,  # SQL in dashboard directory
        dashboard_dir.parent / 'sql' / filename,  # SQL in parent directory
        Path('sql') / filename,  # SQL in current directory
    ]
    
    for query_path in possible_locations:
        if query_path.exists():
            with open(query_path, 'r') as f:
                return f.read()
    
    print(f"Warning: SQL file not found: {filename}")
    return None

def transform_to_dashboard_format(opportunities, closed_won, summary, bob_overlaps):
    """Transform SQL query results to dashboard JSON format"""
    
    # Transform opportunities
    active_opportunities = []
    for opp in opportunities:
        active_opportunities.append({
            'opportunityName': opp.get('opportunity_name', ''),
            'partner': opp.get('partner_name', ''),
            'source': opp.get('source_type', ''),
            'account': opp.get('account_domain', ''),
            'stage': opp.get('hubspot_stage', ''),
            'dealSize': float(opp.get('deal_size', 0) or 0),
            'weightedValue': float(opp.get('weighted_value', 0) or 0),
            'ae': opp.get('deal_owner', ''),
            'inBob': bool(opp.get('in_ae_bob', False)),
            'activity30d': opp.get('activity_summary', ''),
            'risk': opp.get('risk_factor') if opp.get('risk_factor') else None,
            'coSellStatus': opp.get('co_sell_readiness', '')
        })
    
    # Transform closed won deals
    closed_won_deals = []
    for deal in closed_won:
        closed_won_deals.append({
            'opportunityName': deal.get('opportunity_name', ''),
            'partner': deal.get('partner_name', ''),
            'account': deal.get('account_domain', ''),
            'dealSize': float(deal.get('deal_size', 0) or 0),
            'closeDate': deal.get('close_date', ''),
            'salesCycleDays': int(deal.get('sales_cycle_days', 0) or 0),
            'ae': deal.get('deal_owner', ''),
            'inBob': bool(deal.get('in_ae_bob', False))
        })
    
    # Transform summary metrics
    summary_metrics = {
        'totalOpportunities': int(summary.get('total_opportunities', 0) or 0),
        'closedWonDeals': int(summary.get('closed_won_deals', 0) or 0),
        'closedWonRevenue': float(summary.get('closed_won_revenue', 0) or 0),
        'totalPipelineValue': float(summary.get('total_pipeline_value', 0) or 0),
        'weightedPipelineValue': float(summary.get('weighted_pipeline_value', 0) or 0),
        'avgDealSize': float(summary.get('avg_deal_size', 0) or 0),
        'stalledDeals': int(summary.get('stalled_deals_count', 0) or 0),
        'longSalesCycle': int(summary.get('long_sales_cycle_count', 0) or 0)
    }
    
    # Calculate pipeline progression metrics from opportunities
    stage_mapping = {
        'qualified': ['Qualified', 'Qualification'],
        'discovery': ['Discovery', 'Discovery Call', 'Discovery Meeting'],
        'proposal': ['Proposal', 'Proposal Sent', 'Proposal/Price Quote'],
        'negotiation': ['Negotiation', 'Negotiation/Review', 'Contract Sent']
    }
    
    qualified_count = 0
    qualified_value = 0.0
    discovery_count = 0
    discovery_value = 0.0
    proposal_count = 0
    proposal_value = 0.0
    negotiation_count = 0
    negotiation_value = 0.0
    
    for opp in active_opportunities:
        stage = str(opp.get('stage', '')).lower()
        deal_size = opp.get('dealSize', 0)
        weighted_value = opp.get('weightedValue', 0)
        
        if any(s in stage for s in stage_mapping['qualified']):
            qualified_count += 1
            qualified_value += weighted_value
        elif any(s in stage for s in stage_mapping['discovery']):
            discovery_count += 1
            discovery_value += weighted_value
        elif any(s in stage for s in stage_mapping['proposal']):
            proposal_count += 1
            proposal_value += weighted_value
        elif any(s in stage for s in stage_mapping['negotiation']):
            negotiation_count += 1
            negotiation_value += weighted_value
    
    # Add pipeline progression metrics
    summary_metrics.update({
        'qualifiedCount': qualified_count,
        'qualifiedValue': qualified_value,
        'discoveryCount': discovery_count,
        'discoveryValue': discovery_value,
        'proposalCount': proposal_count,
        'proposalValue': proposal_value,
        'negotiationCount': negotiation_count,
        'negotiationValue': negotiation_value,
        # Conversion rates (calculate from closed won vs qualified/discovery)
        'qualifiedToWonRate': (summary_metrics['closedWonDeals'] / max(qualified_count, 1)) * 100 if qualified_count > 0 else 0.0,
        'discoveryToWonRate': (summary_metrics['closedWonDeals'] / max(discovery_count, 1)) * 100 if discovery_count > 0 else 0.0,
        'pipelineConversionRate': (summary_metrics['closedWonDeals'] / max(summary_metrics['totalOpportunities'], 1)) * 100 if summary_metrics['totalOpportunities'] > 0 else 0.0,
        # Pacing metrics (assuming Q1 target = $2M, 13 weeks)
        'pipelinePacingPercent': (summary_metrics['weightedPipelineValue'] / 2000000.0) * 100.0,
        'activityPacingPercent': 0.0,  # Placeholder - needs activity data
        'dealVelocity': summary_metrics['totalOpportunities'] / 13.0 if summary_metrics['totalOpportunities'] > 0 else 0.0
    })
    
    # Transform BoB overlaps
    bob_overlaps_list = []
    for overlap in bob_overlaps:
        bob_overlaps_list.append({
            'partnerDomain': overlap.get('partner_domain', ''),
            'partner': overlap.get('partner_name', ''),
            'source': overlap.get('source_type', ''),
            'accountArr': float(overlap.get('partner_account_arr', 0) or 0),
            'matchStatus': overlap.get('match_status', ''),
            'aeName': overlap.get('ae_name', ''),
            'bobField': overlap.get('bob_field_source', ''),
            'coSellRouting': overlap.get('co_sell_routing', '')
        })
    
    # Calculate partner performance
    partner_performance = {}
    for opp in active_opportunities:
        partner = opp.get('partner', 'Unknown')
        if partner not in partner_performance:
            partner_performance[partner] = {'pipeline': 0, 'deals': 0, 'closedWon': 0}
        partner_performance[partner]['pipeline'] += opp.get('dealSize', 0)
        partner_performance[partner]['deals'] += 1
    
    for deal in closed_won_deals:
        partner = deal.get('partner', 'Unknown')
        if partner not in partner_performance:
            partner_performance[partner] = {'pipeline': 0, 'deals': 0, 'closedWon': 0}
        partner_performance[partner]['closedWon'] += deal.get('dealSize', 0)
    
    return {
        'quarterlyTarget': 2000000,  # TODO: Make this configurable
        'summaryMetrics': summary_metrics,
        'closedWonDeals': closed_won_deals,
        'activeOpportunities': active_opportunities,
        'bobOverlaps': bob_overlaps_list,
        'partnerPerformance': partner_performance,
        'lastUpdated': datetime.now().isoformat()
    }

def main():
    """Main update function"""
    print("Starting dashboard data update...")
    
    if not execute_databricks_sql:
        print("Error: Databricks SDK not available")
        sys.exit(1)
    
    # Load SQL queries
    opportunities_query = load_sql_query('2026_upmarket_pipeline_revenue_dashboard.sql')
    closed_won_query = load_sql_query('2026_upmarket_closed_won_deals.sql')
    summary_query = load_sql_query('2026_upmarket_pipeline_summary_metrics.sql')
    bob_query = load_sql_query('match_partner_domains_to_ae_bob.sql')
    
    # Execute queries
    opportunities_data = []
    closed_won_data = []
    summary_data = {}
    bob_data = []
    
    try:
        if opportunities_query:
            result = execute_databricks_sql(opportunities_query)
            if result.get('status') == 'success':
                opportunities_data = result.get('data', [])
                print(f"Loaded {len(opportunities_data)} opportunities")
        
        if closed_won_query:
            result = execute_databricks_sql(closed_won_query)
            if result.get('status') == 'success':
                closed_won_data = result.get('data', [])
                print(f"Loaded {len(closed_won_data)} closed won deals")
        
        if summary_query:
            result = execute_databricks_sql(summary_query)
            if result.get('status') == 'success':
                summary_rows = result.get('data', [])
                if summary_rows:
                    summary_data = summary_rows[0]
                    print("Loaded summary metrics")
        
        if bob_query:
            result = execute_databricks_sql(bob_query)
            if result.get('status') == 'success':
                bob_data = result.get('data', [])
                print(f"Loaded {len(bob_data)} BoB overlaps")
        
        # Transform to dashboard format
        dashboard_data = transform_to_dashboard_format(
            opportunities_data,
            closed_won_data,
            summary_data,
            bob_data
        )
        
        # Save to data.json
        output_path = dashboard_dir / 'data.json'
        with open(output_path, 'w') as f:
            json.dump(dashboard_data, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Dashboard data updated successfully: {output_path}")
        print(f"   Last updated: {dashboard_data.get('lastUpdated')}")
        
    except Exception as e:
        print(f"❌ Error updating dashboard data: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()

