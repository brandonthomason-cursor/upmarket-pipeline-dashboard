-- 2026 Upmarket Pipeline and Revenue Dashboard
-- Summary Metrics Query (CFO-Focused KPIs)
-- Provides high-level pipeline health metrics
-- Date: 2025-01-27

WITH upmarket_referral_accounts AS (
    SELECT DISTINCT
        r.referred_account_id AS account_id,
        LOWER(da.domain) AS email_domain,
        da.company_name AS account_name,
        r.solution_partner_sk,
        r.account_arr,
        CASE 
            WHEN r.account_arr >= 50000 THEN 'Enterprise'
            WHEN r.account_arr >= 12000 AND r.account_arr < 50000 THEN 'Midmarket'
            ELSE 'SMB'
        END AS upmarket_segment,
        'Referral' AS source_type
    FROM production_modeled.public.fact_daily_solution_partner_account_referral r
    INNER JOIN production_modeled.public.dim_account da
        ON r.referred_account_id = da.account_id
        AND da.current_version = true
        AND da.deleted = false
    WHERE r.snapshot_date = (
        SELECT MAX(snapshot_date) 
        FROM production_modeled.public.fact_daily_solution_partner_account_referral
    )
        AND r.solution_partner_sk IS NOT NULL
        AND r.account_arr >= 12000
        AND da.domain IS NOT NULL
        AND da.domain != ''
),

upmarket_managed_revenue_accounts AS (
    SELECT DISTINCT
        mr.account_id,
        LOWER(da.domain) AS email_domain,
        da.company_name AS account_name,
        mr.solution_partner_magentrix_account_id AS solution_partner_sk,
        COALESCE(
            (SELECT MAX(total_arr_account) 
             FROM production_modeled.public.fact_daily_account_app_revenue 
             WHERE account_id = mr.account_id 
             AND date = (SELECT MAX(date) FROM production_modeled.public.fact_daily_account_app_revenue)),
            0
        ) AS account_arr,
        CASE 
            WHEN COALESCE(
                (SELECT MAX(total_arr_account) 
                 FROM production_modeled.public.fact_daily_account_app_revenue 
                 WHERE account_id = mr.account_id 
                 AND date = (SELECT MAX(date) FROM production_modeled.public.fact_daily_account_app_revenue)),
                0
            ) >= 50000 THEN 'Enterprise'
            WHEN COALESCE(
                (SELECT MAX(total_arr_account) 
                 FROM production_modeled.public.fact_daily_account_app_revenue 
                 WHERE account_id = mr.account_id 
                 AND date = (SELECT MAX(date) FROM production_modeled.public.fact_daily_account_app_revenue)),
                0
            ) >= 12000 THEN 'Midmarket'
            ELSE 'SMB'
        END AS upmarket_segment,
        'Managed Revenue' AS source_type
    FROM production_modeled.public.fact_daily_solution_partner_revenue mr
    INNER JOIN production_modeled.public.dim_account da
        ON mr.account_id = da.account_id
        AND da.current_version = true
        AND da.deleted = false
    WHERE mr.snapshot_date = (
        SELECT MAX(snapshot_date) 
        FROM production_modeled.public.fact_daily_solution_partner_revenue
    )
        AND NOT EXISTS (
            SELECT 1 FROM upmarket_referral_accounts ura
            WHERE ura.account_id = mr.account_id
        )
        AND COALESCE(
            (SELECT MAX(total_arr_account) 
             FROM production_modeled.public.fact_daily_account_app_revenue 
             WHERE account_id = mr.account_id 
             AND date = (SELECT MAX(date) FROM production_modeled.public.fact_daily_account_app_revenue)),
            0
        ) >= 12000
        AND da.domain IS NOT NULL
        AND da.domain != ''
),

all_upmarket_partner_accounts AS (
    SELECT * FROM upmarket_referral_accounts
    UNION ALL
    SELECT * FROM upmarket_managed_revenue_accounts
),

book_of_business_check AS (
    SELECT DISTINCT
        c.record_id AS company_id,
        LOWER(c.company_domain_name) AS company_domain_name,
        c.company_name,
        COALESCE(
            c.company_owner,
            c.book_of_business,
            c.am_standard_bob,
            c.am_custom_bob,
            CASE 
                WHEN c.enterprise_bob IS NOT NULL AND c.enterprise_bob != '' THEN CONCAT('Enterprise BoB: ', c.enterprise_bob)
                ELSE NULL
            END
        ) AS bob_ae_name,
        CASE 
            WHEN c.company_owner IS NOT NULL AND c.company_owner != '' THEN TRUE
            WHEN c.enterprise_bob IS NOT NULL AND c.enterprise_bob != '' THEN TRUE
            WHEN c.book_of_business IS NOT NULL AND c.book_of_business != '' THEN TRUE
            WHEN c.am_standard_bob IS NOT NULL AND c.am_standard_bob != '' THEN TRUE
            WHEN c.am_custom_bob IS NOT NULL AND c.am_custom_bob != '' THEN TRUE
            ELSE FALSE
        END AS in_ae_bob
    FROM production_refined.app_hubspot.companies c
    WHERE c.date_partition = (
        SELECT MAX(date_partition) 
        FROM production_refined.app_hubspot.companies
    )
        AND c.company_domain_name IS NOT NULL
        AND c.company_domain_name != ''
),

hubspot_deals AS (
    SELECT 
        d.record_id AS deal_id,
        d.deal_name,
        d.amount AS deal_amount,
        d.deal_stage,
        d.deal_owner AS deal_owner_ae,
        d.associated_company_ids AS company_id,
        d.created_date AS deal_created_date,
        d.close_date,
        CASE 
            WHEN LOWER(d.deal_stage) = 'qualified' THEN 0.10
            WHEN LOWER(d.deal_stage) = 'discovery' THEN 0.25
            WHEN LOWER(d.deal_stage) = 'proposal' THEN 0.50
            WHEN LOWER(d.deal_stage) = 'negotiation' THEN 0.75
            WHEN LOWER(d.deal_stage) = 'closed won' THEN 1.00
            ELSE 0.05
        END AS stage_probability
    FROM production_refined.app_hubspot.deals d
    WHERE d.date_partition = (
        SELECT MAX(date_partition) 
        FROM production_refined.app_hubspot.deals
    )
        AND d.associated_company_ids IS NOT NULL
),

deal_activities AS (
    SELECT 
        e.associated_deal_ids AS deal_id,
        MAX(e.activity_date) AS last_activity_date,
        COUNT(DISTINCT e.record_id) AS total_activities_30d
    FROM production_refined.app_hubspot.engagements e
    WHERE e.date_partition = (
        SELECT MAX(date_partition) 
        FROM production_refined.app_hubspot.engagements
    )
        AND e.activity_date >= CURRENT_DATE - 30
        AND e.associated_deal_ids IS NOT NULL
    GROUP BY e.associated_deal_ids
),

pipeline_data AS (
    SELECT 
        apd.solution_partner_sk,
        apd.source_type,
        apd.upmarket_segment,
        apd.account_arr,
        bob.in_ae_bob,
        bob.bob_ae_name,
        hd.deal_id,
        hd.deal_amount,
        hd.deal_stage,
        hd.deal_owner_ae,
        hd.deal_created_date,
        hd.close_date,
        hd.stage_probability,
        hd.deal_amount * hd.stage_probability AS weighted_value,
        DATEDIFF(DAY, hd.deal_created_date, CURRENT_DATE) AS days_in_pipeline,
        da.last_activity_date,
        da.total_activities_30d,
        CASE 
            WHEN LOWER(hd.deal_stage) = 'closedwon' THEN TRUE
            ELSE FALSE
        END AS is_closed_won
    FROM all_upmarket_partner_accounts apd
    LEFT JOIN book_of_business_check bob
        ON LOWER(apd.email_domain) = LOWER(bob.company_domain_name)
    LEFT JOIN hubspot_deals hd
        ON bob.company_id = hd.company_id
    LEFT JOIN deal_activities da
        ON hd.deal_id = da.deal_id
)

-- SUMMARY METRICS
SELECT 
    -- Pipeline Totals
    COUNT(DISTINCT CASE WHEN deal_id IS NOT NULL THEN deal_id END) AS total_opportunities,
    COUNT(DISTINCT CASE WHEN is_closed_won = TRUE THEN deal_id END) AS closed_won_deals,
    SUM(CASE WHEN deal_id IS NOT NULL THEN deal_amount ELSE 0 END) AS total_pipeline_value,
    SUM(CASE WHEN deal_id IS NOT NULL THEN weighted_value ELSE 0 END) AS weighted_pipeline_value,
    SUM(CASE WHEN is_closed_won = TRUE THEN deal_amount ELSE 0 END) AS closed_won_revenue,
    
    -- Pipeline Health
    ROUND(
        SUM(CASE WHEN deal_id IS NOT NULL THEN weighted_value ELSE 0 END) / 
        NULLIF(SUM(CASE WHEN is_closed_won = TRUE THEN deal_amount ELSE 0 END), 0),
        2
    ) AS pipeline_coverage_ratio,
    
    -- Deal Counts by Stage
    COUNT(DISTINCT CASE WHEN LOWER(deal_stage) = 'qualified' THEN deal_id END) AS qualified_count,
    COUNT(DISTINCT CASE WHEN LOWER(deal_stage) = 'discovery' THEN deal_id END) AS discovery_count,
    COUNT(DISTINCT CASE WHEN LOWER(deal_stage) = 'proposal' THEN deal_id END) AS proposal_count,
    COUNT(DISTINCT CASE WHEN LOWER(deal_stage) = 'negotiation' THEN deal_id END) AS negotiation_count,
    
    -- Average Deal Size
    ROUND(AVG(CASE WHEN deal_id IS NOT NULL THEN deal_amount END), 2) AS avg_deal_size,
    ROUND(AVG(CASE WHEN is_closed_won = TRUE THEN deal_amount END), 2) AS avg_closed_won_deal_size,
    
    -- Sales Cycle
    ROUND(AVG(CASE WHEN is_closed_won = TRUE THEN DATEDIFF(DAY, deal_created_date, close_date) END), 1) AS avg_sales_cycle_days,
    
    -- Risk Indicators
    COUNT(DISTINCT CASE 
        WHEN deal_id IS NOT NULL 
            AND (last_activity_date IS NULL OR last_activity_date < CURRENT_DATE - 30)
        THEN deal_id 
    END) AS stalled_deals_count,
    
    COUNT(DISTINCT CASE 
        WHEN deal_id IS NOT NULL 
            AND days_in_pipeline > 60
        THEN deal_id 
    END) AS long_sales_cycle_count,
    
    COUNT(DISTINCT CASE 
        WHEN deal_id IS NOT NULL 
            AND deal_amount < 10000
        THEN deal_id 
    END) AS small_deal_count,
    
    COUNT(DISTINCT CASE 
        WHEN deal_id IS NOT NULL 
            AND (total_activities_30d IS NULL OR total_activities_30d < 2)
        THEN deal_id 
    END) AS low_activity_count,
    
    -- Partner Distribution
    COUNT(DISTINCT solution_partner_sk) AS unique_partners_count,
    COUNT(DISTINCT CASE WHEN source_type = 'Referral' THEN solution_partner_sk END) AS referral_partners_count,
    COUNT(DISTINCT CASE WHEN source_type = 'Managed Revenue' THEN solution_partner_sk END) AS managed_revenue_partners_count,
    
    -- Upmarket Segment Distribution
    COUNT(DISTINCT CASE WHEN upmarket_segment = 'Enterprise' THEN deal_id END) AS enterprise_deals_count,
    COUNT(DISTINCT CASE WHEN upmarket_segment = 'Midmarket' THEN deal_id END) AS midmarket_deals_count,
    
    -- BoB Distribution
    COUNT(DISTINCT CASE WHEN in_ae_bob = TRUE THEN deal_id END) AS deals_in_ae_bob_count,
    COUNT(DISTINCT CASE WHEN in_ae_bob = FALSE THEN deal_id END) AS net_new_deals_count,
    
    -- Account Executive Distribution
    COUNT(DISTINCT deal_owner_ae) AS unique_aes_count

FROM pipeline_data;

