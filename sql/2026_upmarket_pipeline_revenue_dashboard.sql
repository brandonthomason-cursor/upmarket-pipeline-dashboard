-- 2026 Upmarket Pipeline and Revenue Dashboard
-- Main query for CFO-focused partner pipeline dashboard
-- Includes: Referral + Managed Revenue domains, BoB detection, upmarket qualification
-- Date: 2025-01-27

-- PART 1: Get upmarket-qualified referral accounts (ARR >= $12,000)
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
        AND r.account_arr >= 12000  -- Only Enterprise and Midmarket
        AND da.domain IS NOT NULL
        AND da.domain != ''
),

-- PART 2: Get upmarket-qualified managed revenue accounts
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
        -- Exclude accounts already in referral table (prioritize referral)
        AND NOT EXISTS (
            SELECT 1 FROM upmarket_referral_accounts ura
            WHERE ura.account_id = mr.account_id
        )
        -- Only include if ARR >= $12,000
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

-- PART 3: Combine all upmarket partner accounts
all_upmarket_partner_accounts AS (
    SELECT * FROM upmarket_referral_accounts
    UNION ALL
    SELECT * FROM upmarket_managed_revenue_accounts
),

-- PART 4: Get Book of Business assignments from HubSpot
book_of_business_check AS (
    SELECT DISTINCT
        c.record_id AS company_id,
        LOWER(c.company_domain_name) AS company_domain_name,
        c.company_name,
        -- Check all BoB fields
        c.company_owner,
        c.enterprise_bob,
        c.book_of_business,
        c.am_standard_bob,
        c.am_custom_bob,
        -- Determine if in BoB (TRUE if any field has assignment)
        CASE 
            WHEN c.company_owner IS NOT NULL AND c.company_owner != '' THEN TRUE
            WHEN c.enterprise_bob IS NOT NULL AND c.enterprise_bob != '' THEN TRUE
            WHEN c.book_of_business IS NOT NULL AND c.book_of_business != '' THEN TRUE
            WHEN c.am_standard_bob IS NOT NULL AND c.am_standard_bob != '' THEN TRUE
            WHEN c.am_custom_bob IS NOT NULL AND c.am_custom_bob != '' THEN TRUE
            ELSE FALSE
        END AS in_ae_bob,
        -- Get BoB AE name (prioritize company_owner, then others)
        COALESCE(
            c.company_owner,
            c.book_of_business,
            c.am_standard_bob,
            c.am_custom_bob,
            -- For enterprise_bob, may need lookup if it's numeric
            CASE 
                WHEN c.enterprise_bob IS NOT NULL AND c.enterprise_bob != '' THEN CONCAT('Enterprise BoB: ', c.enterprise_bob)
                ELSE NULL
            END
        ) AS bob_ae_name,
        -- Track which field matched
        CASE 
            WHEN c.company_owner IS NOT NULL AND c.company_owner != '' THEN 'company_owner'
            WHEN c.enterprise_bob IS NOT NULL AND c.enterprise_bob != '' THEN 'enterprise_bob'
            WHEN c.book_of_business IS NOT NULL AND c.book_of_business != '' THEN 'book_of_business'
            WHEN c.am_standard_bob IS NOT NULL AND am_standard_bob != '' THEN 'am_standard_bob'
            WHEN c.am_custom_bob IS NOT NULL AND c.am_custom_bob != '' THEN 'am_custom_bob'
            ELSE NULL
        END AS bob_field_source
    FROM production_refined.app_hubspot.companies c
    WHERE c.date_partition = (
        SELECT MAX(date_partition) 
        FROM production_refined.app_hubspot.companies
    )
        AND c.company_domain_name IS NOT NULL
        AND c.company_domain_name != ''
),

-- PART 5: Get HubSpot deals/opportunities
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
        d.date_partition
    FROM production_refined.app_hubspot.deals d
    WHERE d.date_partition = (
        SELECT MAX(date_partition) 
        FROM production_refined.app_hubspot.deals
    )
        AND LOWER(d.deal_stage) NOT IN ('closedwon', 'closedlost')
        AND d.associated_company_ids IS NOT NULL
),

-- PART 6: Get deal activities (last 30 days)
deal_activities AS (
    SELECT 
        e.associated_deal_ids AS deal_id,
        COUNT(DISTINCT CASE WHEN e.activity_type = 'CALL' THEN e.record_id END) AS call_count_30d,
        COUNT(DISTINCT CASE WHEN e.activity_type = 'EMAIL' THEN e.record_id END) AS email_count_30d,
        COUNT(DISTINCT CASE WHEN e.activity_type = 'MEETING' THEN e.record_id END) AS meeting_count_30d,
        MAX(e.activity_date) AS last_activity_date
    FROM production_refined.app_hubspot.engagements e
    WHERE e.date_partition = (
        SELECT MAX(date_partition) 
        FROM production_refined.app_hubspot.engagements
    )
        AND e.activity_date >= CURRENT_DATE - 30
        AND e.associated_deal_ids IS NOT NULL
        AND e.activity_type IN ('CALL', 'EMAIL', 'MEETING')
    GROUP BY e.associated_deal_ids
),

-- PART 7: Match partner accounts to HubSpot companies and deals
partner_deals_matched AS (
    SELECT 
        apd.account_id,
        apd.email_domain,
        apd.account_name AS partner_account_name,
        apd.solution_partner_sk,
        apd.account_arr,
        apd.upmarket_segment,
        apd.source_type,
        -- Match to HubSpot company
        bob.company_id AS hubspot_company_id,
        bob.company_name AS hubspot_company_name,
        bob.in_ae_bob,
        bob.bob_ae_name,
        bob.bob_field_source,
        -- Match to HubSpot deals
        hd.deal_id,
        hd.deal_name,
        hd.deal_amount,
        hd.deal_stage,
        hd.deal_owner_ae,
        hd.deal_created_date,
        hd.close_date,
        -- Stage probability
        CASE 
            WHEN LOWER(hd.deal_stage) = 'qualified' THEN 0.10
            WHEN LOWER(hd.deal_stage) = 'discovery' THEN 0.25
            WHEN LOWER(hd.deal_stage) = 'proposal' THEN 0.50
            WHEN LOWER(hd.deal_stage) = 'negotiation' THEN 0.75
            WHEN LOWER(hd.deal_stage) = 'closed won' THEN 1.00
            ELSE 0.05
        END AS stage_probability,
        -- Activity data
        COALESCE(da.call_count_30d, 0) AS call_count_30d,
        COALESCE(da.email_count_30d, 0) AS email_count_30d,
        COALESCE(da.meeting_count_30d, 0) AS meeting_count_30d,
        da.last_activity_date,
        -- Days in pipeline
        DATEDIFF(DAY, hd.deal_created_date, CURRENT_DATE) AS days_in_pipeline
    FROM all_upmarket_partner_accounts apd
    -- Match to HubSpot companies by domain
    LEFT JOIN book_of_business_check bob
        ON LOWER(apd.email_domain) = LOWER(bob.company_domain_name)
    -- Match to HubSpot deals via company
    LEFT JOIN hubspot_deals hd
        ON bob.company_id = hd.company_id
    -- Get activities for deals
    LEFT JOIN deal_activities da
        ON hd.deal_id = da.deal_id
    WHERE hd.deal_id IS NOT NULL  -- Only include deals (not just accounts)
)

-- FINAL OUTPUT: Dashboard-ready data
SELECT 
    -- Deal/Opportunity Info
    pdm.deal_id,
    pdm.deal_name AS opportunity_name,
    pdm.deal_stage AS hubspot_stage,
    pdm.deal_amount AS deal_size,
    pdm.deal_amount * pdm.stage_probability AS weighted_value,
    pdm.deal_created_date,
    pdm.close_date,
    pdm.days_in_pipeline,
    
    -- Partner Info
    CASE 
        WHEN pdm.solution_partner_sk = '15f48c334aae6a13a097cef7f52c6e9f' THEN 'XrayTech'
        WHEN pdm.solution_partner_sk = 'cfca3f8ab9561f90f29c648652158716' THEN 'Pyxis'
        WHEN pdm.solution_partner_sk = '6adaa04a5b4277b44a438af3a0c86db1' THEN 'iZeno'
        WHEN pdm.solution_partner_sk = 'ca86cdb46fd4c3ffacbdda278db5653b' THEN 'Orium'
        ELSE CONCAT('Partner: ', LEFT(pdm.solution_partner_sk, 8), '...')
    END AS partner_name,
    pdm.solution_partner_sk,
    pdm.source_type,  -- Referral or Managed Revenue
    
    -- Account Info
    pdm.partner_account_name AS account_name,
    pdm.email_domain AS account_domain,
    pdm.upmarket_segment,  -- Enterprise or Midmarket
    pdm.account_arr,
    
    -- HubSpot Company Info
    pdm.hubspot_company_name,
    pdm.hubspot_company_id,
    
    -- Book of Business Info
    pdm.in_ae_bob,
    pdm.bob_ae_name,
    pdm.bob_field_source,
    
    -- Account Executive Info
    pdm.deal_owner_ae AS deal_owner,
    
    -- Activity Info
    pdm.call_count_30d,
    pdm.email_count_30d,
    pdm.meeting_count_30d,
    pdm.last_activity_date,
    CONCAT(
        pdm.call_count_30d, ' calls, ',
        pdm.email_count_30d, ' emails, ',
        pdm.meeting_count_30d, ' meetings in last 30 days'
    ) AS activity_summary,
    
    -- Risk Factors
    CASE 
        WHEN pdm.last_activity_date IS NULL OR pdm.last_activity_date < CURRENT_DATE - 30 THEN 'Stalled'
        WHEN pdm.days_in_pipeline > 60 THEN 'Long Sales Cycle'
        WHEN pdm.deal_amount < 10000 THEN 'Small Deal Size'
        WHEN (pdm.call_count_30d + pdm.email_count_30d + pdm.meeting_count_30d) < 2 THEN 'Low Activity'
        WHEN pdm.source_type = 'Referral' AND pdm.in_ae_bob = TRUE THEN 'BoB Conflict - Needs Coordination'
        ELSE NULL
    END AS risk_factor,
    
    -- Co-Sell Readiness
    CASE 
        WHEN pdm.account_arr >= 12000 
            AND pdm.in_ae_bob = TRUE 
            AND pdm.hubspot_company_id IS NOT NULL
        THEN 'READY FOR CO-SELL (IN AE BOOK - LOOP IN AE EARLY)'
        WHEN pdm.account_arr >= 12000 
            AND pdm.in_ae_bob = FALSE 
            AND pdm.hubspot_company_id IS NOT NULL
        THEN 'READY FOR CO-SELL (NET-NEW - PARTNER LEADS)'
        WHEN pdm.account_arr >= 12000 
            AND pdm.hubspot_company_id IS NULL
        THEN 'QUALIFIED BUT NEEDS REVIEW'
        ELSE 'NOT READY'
    END AS co_sell_readiness

FROM partner_deals_matched pdm

ORDER BY 
    pdm.deal_amount * pdm.stage_probability DESC,  -- Highest weighted value first
    pdm.account_arr DESC;  -- Then by account ARR

