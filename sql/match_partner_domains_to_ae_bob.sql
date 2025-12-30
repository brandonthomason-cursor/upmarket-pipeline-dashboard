-- Match Partner Referral/Managed Revenue Domains to AE Book of Business
-- Purpose: Identify overlaps between partner-sourced domains and Andrés Herrera's team BoB
-- Date: 2025-01-27

-- PART 1: Get all partner referral domains (upmarket qualified: ARR >= $12,000)
WITH upmarket_referral_accounts AS (
    SELECT DISTINCT
        r.referred_account_id AS account_id,
        da.domain AS email_domain,
        da.company_name AS account_name,
        r.solution_partner_sk,
        r.account_arr,
        'Referral' AS source_type,
        CASE 
            WHEN r.account_arr >= 50000 THEN 'Enterprise'
            WHEN r.account_arr >= 12000 AND r.account_arr < 50000 THEN 'Midmarket'
            ELSE 'SMB'
        END AS upmarket_segment
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
        AND r.account_arr >= 12000  -- Only upmarket (Enterprise or Midmarket)
        AND da.domain IS NOT NULL
        AND da.domain != ''
),

-- PART 2: Get all partner managed revenue domains (upmarket qualified)
upmarket_managed_revenue_accounts AS (
    SELECT DISTINCT
        mr.account_id,
        da.domain AS email_domain,
        da.company_name AS account_name,
        mr.solution_partner_magentrix_account_id AS solution_partner_sk,  -- May need mapping
        COALESCE(
            (SELECT MAX(total_arr_account) 
             FROM production_modeled.public.fact_daily_account_app_revenue 
             WHERE account_id = mr.account_id 
             AND date = (SELECT MAX(date) FROM production_modeled.public.fact_daily_account_app_revenue)),
            0
        ) AS account_arr,
        'Managed Revenue' AS source_type,
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
        END AS upmarket_segment
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

-- PART 3: Combine all partner domains
all_partner_domains AS (
    SELECT 
        account_id,
        LOWER(email_domain) AS email_domain,
        account_name,
        solution_partner_sk,
        account_arr,
        source_type,
        upmarket_segment
    FROM upmarket_referral_accounts
    UNION ALL
    SELECT 
        account_id,
        LOWER(email_domain) AS email_domain,
        account_name,
        solution_partner_sk,
        account_arr,
        source_type,
        upmarket_segment
    FROM upmarket_managed_revenue_accounts
),

-- PART 4: Get all AE BoB companies from HubSpot (Andrés Herrera's team)
ae_bob_companies AS (
    SELECT DISTINCT
        record_id AS hubspot_company_id,
        company_name,
        LOWER(company_domain_name) AS company_domain_name,
        company_owner,
        enterprise_bob,
        book_of_business,
        am_standard_bob,
        am_custom_bob,
        number_of_employees,
        annual_revenue,
        industry,
        country_region,
        -- Determine which BoB field matched
        CASE 
            WHEN company_owner IN (
                'Emily Misurec', 'Varun Jiandani', 'John Connell', 'Vrijesh Patel',
                'Diego Valiente', 'Zeeshan Alam', 'Mitchell Kwan', 
                'Ashley O''Lear', 'Dave Soya', 'David Soya'
            ) THEN company_owner
            WHEN enterprise_bob IS NOT NULL AND enterprise_bob != '' THEN CONCAT('Enterprise BoB: ', enterprise_bob)
            WHEN book_of_business IS NOT NULL AND book_of_business != '' THEN CONCAT('Book of Business: ', book_of_business)
            WHEN am_standard_bob IS NOT NULL AND am_standard_bob != '' THEN CONCAT('AM Standard BoB: ', am_standard_bob)
            WHEN am_custom_bob IS NOT NULL AND am_custom_bob != '' THEN CONCAT('AM Custom BoB: ', am_custom_bob)
            ELSE NULL
        END AS bob_ae_name,
        CASE 
            WHEN company_owner IN (
                'Emily Misurec', 'Varun Jiandani', 'John Connell', 'Vrijesh Patel',
                'Diego Valiente', 'Zeeshan Alam', 'Mitchell Kwan', 
                'Ashley O''Lear', 'Dave Soya', 'David Soya'
            ) THEN 'company_owner'
            WHEN enterprise_bob IS NOT NULL AND enterprise_bob != '' THEN 'enterprise_bob'
            WHEN book_of_business IS NOT NULL AND book_of_business != '' THEN 'book_of_business'
            WHEN am_standard_bob IS NOT NULL AND am_standard_bob != '' THEN 'am_standard_bob'
            WHEN am_custom_bob IS NOT NULL AND am_custom_bob != '' THEN 'am_custom_bob'
            ELSE NULL
        END AS bob_field_source,
        -- Check if in any BoB
        CASE 
            WHEN company_owner IN (
                'Emily Misurec', 'Varun Jiandani', 'John Connell', 'Vrijesh Patel',
                'Diego Valiente', 'Zeeshan Alam', 'Mitchell Kwan', 
                'Ashley O''Lear', 'Dave Soya', 'David Soya'
            ) THEN TRUE
            WHEN enterprise_bob IS NOT NULL AND enterprise_bob != '' THEN TRUE
            WHEN book_of_business IS NOT NULL AND book_of_business != '' THEN TRUE
            WHEN am_standard_bob IS NOT NULL AND am_standard_bob != '' THEN TRUE
            WHEN am_custom_bob IS NOT NULL AND am_custom_bob != '' THEN TRUE
            ELSE FALSE
        END AS in_ae_bob
    FROM production_refined.app_hubspot.companies
    WHERE date_partition = (
        SELECT MAX(date_partition) 
        FROM production_refined.app_hubspot.companies
    )
        AND company_domain_name IS NOT NULL
        AND company_domain_name != ''
        AND (
            -- Check company_owner
            company_owner IN (
                'Emily Misurec', 'Varun Jiandani', 'John Connell', 'Vrijesh Patel',
                'Diego Valiente', 'Zeeshan Alam', 'Mitchell Kwan', 
                'Ashley O''Lear', 'Dave Soya', 'David Soya'
            )
            -- OR check enterprise_bob (may contain numeric IDs)
            OR enterprise_bob IS NOT NULL
            -- OR check other BoB fields (if they contain these AEs)
            OR book_of_business IS NOT NULL
            OR am_standard_bob IS NOT NULL
            OR am_custom_bob IS NOT NULL
        )
)

-- PART 5: Match partner domains to AE BoB companies
SELECT 
    -- Partner Domain Info
    apd.email_domain AS partner_domain,
    apd.account_name AS partner_account_name,
    apd.source_type,
    apd.upmarket_segment AS partner_segment,
    apd.account_arr AS partner_account_arr,
    apd.solution_partner_sk,
    
    -- Match Status
    CASE 
        WHEN bob.hubspot_company_id IS NOT NULL THEN 'MATCH FOUND'
        ELSE 'NO MATCH'
    END AS match_status,
    
    -- AE BoB Info (if matched)
    bob.company_name AS hubspot_company_name,
    bob.bob_ae_name AS ae_name,
    bob.bob_field_source AS bob_field_source,
    bob.company_owner,
    bob.enterprise_bob,
    bob.number_of_employees AS hubspot_employees,
    bob.annual_revenue AS hubspot_annual_revenue,
    bob.industry AS hubspot_industry,
    bob.country_region AS hubspot_country,
    
    -- Match Quality Indicators
    CASE 
        WHEN bob.hubspot_company_id IS NOT NULL AND apd.account_arr >= 12000 THEN 'Upmarket Qualified + In BoB'
        WHEN bob.hubspot_company_id IS NOT NULL THEN 'In BoB (Below Upmarket)'
        WHEN apd.account_arr >= 12000 THEN 'Upmarket Qualified (Not in BoB)'
        ELSE 'Below Upmarket'
    END AS match_category,
    
    -- Co-Sell Routing Recommendation
    CASE 
        WHEN bob.hubspot_company_id IS NOT NULL AND apd.account_arr >= 12000 THEN 'LOOP IN AE EARLY - Co-sell playbook Step 2'
        WHEN bob.hubspot_company_id IS NOT NULL THEN 'COORDINATION NEEDED - Account in BoB'
        WHEN apd.account_arr >= 12000 THEN 'PARTNER LEADS - Net-new account, Zapier supports after discovery'
        ELSE 'BELOW UPMARKET - Not qualified'
    END AS co_sell_routing

FROM all_partner_domains apd
LEFT JOIN ae_bob_companies bob
    ON LOWER(apd.email_domain) = LOWER(bob.company_domain_name)
    AND bob.in_ae_bob = TRUE

ORDER BY 
    match_status DESC,  -- Matches first
    apd.account_arr DESC,  -- Highest ARR first
    apd.source_type,  -- Referral then Managed Revenue
    bob.bob_ae_name;  -- Group by AE

