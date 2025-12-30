-- 2026 Upmarket Pipeline and Revenue Dashboard
-- Closed Won Deals Query
-- Shows partner-sourced upmarket deals that are closed and won
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
        c.company_owner,
        c.enterprise_bob,
        c.book_of_business,
        c.am_standard_bob,
        c.am_custom_bob,
        CASE 
            WHEN c.company_owner IS NOT NULL AND c.company_owner != '' THEN TRUE
            WHEN c.enterprise_bob IS NOT NULL AND c.enterprise_bob != '' THEN TRUE
            WHEN c.book_of_business IS NOT NULL AND c.book_of_business != '' THEN TRUE
            WHEN c.am_standard_bob IS NOT NULL AND c.am_standard_bob != '' THEN TRUE
            WHEN c.am_custom_bob IS NOT NULL AND c.am_custom_bob != '' THEN TRUE
            ELSE FALSE
        END AS in_ae_bob,
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
            WHEN c.company_owner IS NOT NULL AND c.company_owner != '' THEN 'company_owner'
            WHEN c.enterprise_bob IS NOT NULL AND c.enterprise_bob != '' THEN 'enterprise_bob'
            WHEN c.book_of_business IS NOT NULL AND c.book_of_business != '' THEN 'book_of_business'
            WHEN c.am_standard_bob IS NOT NULL AND c.am_standard_bob != '' THEN 'am_standard_bob'
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

hubspot_closed_won_deals AS (
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
        AND LOWER(d.deal_stage) = 'closedwon'
        AND d.associated_company_ids IS NOT NULL
        AND d.close_date >= DATE('2026-01-01')  -- Only 2026 deals
)

SELECT 
    -- Deal Info
    hd.deal_id,
    hd.deal_name AS opportunity_name,
    hd.deal_amount AS deal_size,
    hd.deal_created_date,
    hd.close_date,
    DATEDIFF(DAY, hd.deal_created_date, hd.close_date) AS sales_cycle_days,
    
    -- Partner Info
    CASE 
        WHEN apd.solution_partner_sk = '15f48c334aae6a13a097cef7f52c6e9f' THEN 'XrayTech'
        WHEN apd.solution_partner_sk = 'cfca3f8ab9561f90f29c648652158716' THEN 'Pyxis'
        WHEN apd.solution_partner_sk = '6adaa04a5b4277b44a438af3a0c86db1' THEN 'iZeno'
        WHEN apd.solution_partner_sk = 'ca86cdb46fd4c3ffacbdda278db5653b' THEN 'Orium'
        ELSE CONCAT('Partner: ', LEFT(apd.solution_partner_sk, 8), '...')
    END AS partner_name,
    apd.solution_partner_sk,
    apd.source_type,
    
    -- Account Info
    apd.partner_account_name AS account_name,
    apd.email_domain AS account_domain,
    apd.upmarket_segment,
    apd.account_arr,
    
    -- HubSpot Company Info
    bob.hubspot_company_name,
    bob.company_id AS hubspot_company_id,
    
    -- Book of Business Info
    bob.in_ae_bob,
    bob.bob_ae_name,
    bob.bob_field_source,
    
    -- Account Executive Info
    hd.deal_owner_ae AS deal_owner

FROM all_upmarket_partner_accounts apd
LEFT JOIN book_of_business_check bob
    ON LOWER(apd.email_domain) = LOWER(bob.company_domain_name)
INNER JOIN hubspot_closed_won_deals hd
    ON bob.company_id = hd.company_id

ORDER BY hd.close_date DESC, hd.deal_amount DESC;

