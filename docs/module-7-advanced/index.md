# Module 7: Advanced Concepts

## Learning Objectives

By the end of this module, you will be able to:

- Implement period-over-period analysis and time-based calculations
- Build dynamic data models with runtime configurations
- Create complex analytical patterns for real-world scenarios
- Troubleshoot common production issues
- Design scalable architectures for enterprise deployments

## Module Overview

**Duration**: 45 minutes  
**Format**: Theory (15 min) → Demo (15 min) → Advanced Exercise (15 min)

This final module covers sophisticated analytics patterns and production-ready implementations that differentiate expert Cube partners.

## Prerequisites

- Completed all previous modules
- Working comprehensive TPC-H implementation
- Understanding of advanced SQL and analytics concepts

## Video Demo Outline

*The following topics should be covered in the recorded video demonstration:*

### Advanced Analytics Patterns (5 minutes)
- **Show**: Period-over-period calculations in action
- **Demonstrate**: Cohort analysis implementation
- **Explain**: Time-based aggregation strategies
- **Highlight**: Business intelligence use cases

### Dynamic Data Modeling (5 minutes)
- **Show**: Runtime schema generation
- **Demonstrate**: Multi-tenant dynamic cubes
- **Explain**: Configuration-driven modeling
- **Highlight**: Scaling considerations

### Production Troubleshooting (5 minutes)
- **Navigate**: Cube Cloud debugging tools
- **Demonstrate**: Common issue resolution
- **Show**: Performance optimization techniques
- **Explain**: Monitoring and alerting setup

## Advanced Analytics Patterns

### Period-over-Period Analysis

Create sophisticated time-based comparisons using TPC-H data:

```yaml
# model/advanced_orders.yml
cubes:
  - name: advanced_orders
    description: Orders with advanced time-based analytics
    
    sql_table: >
      SELECT 
        *,
        DATE(o_orderdate) as order_date,
        YEAR(o_orderdate) as order_year,
        MONTH(o_orderdate) as order_month,
        QUARTER(o_orderdate) as order_quarter,
        DAYNAME(o_orderdate) as order_day_name,
        WEEK(o_orderdate) as order_week
      FROM read_csv_auto('https://cube-demo-tpch.s3.us-west-2.amazonaws.com/orders.csv')
    
    joins:
      - name: customer
        sql: "{CUBE}.o_custkey = {customer}.custkey"
        relationship: many_to_one
    
    dimensions:
      - name: orderkey
        sql: o_orderkey
        type: number
        primary_key: true
        
      - name: orderdate
        sql: order_date
        type: time
        
      - name: order_year
        sql: order_year
        type: number
        
      - name: order_month
        sql: order_month
        type: number
        
      - name: order_quarter
        sql: order_quarter
        type: number
        
      - name: order_day_name
        sql: order_day_name
        type: string
        
      - name: customer_region
        sql: "{Customer}.region_name"
        type: string
    
    measures:
      - name: total_revenue
        sql: o_totalprice
        type: sum
        format: currency
        
      - name: count
        sql: o_orderkey
        type: count
        
      # Period-over-period measures
      - name: revenue_vs_previous_month
        sql: o_totalprice
        type: sum
        format: currency
        filters:
          - sql: >
              DATE_TRUNC('month', {CUBE}.order_date) = 
              DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
        
      - name: revenue_vs_previous_year
        sql: o_totalprice
        type: sum
        format: currency
        filters:
          - sql: >
              DATE_TRUNC('year', {CUBE}.order_date) = 
              DATE_TRUNC('year', CURRENT_DATE - INTERVAL '1 year')
        
      - name: month_over_month_growth
        description: "Month over month revenue growth percentage"
        sql: >
          CASE 
            WHEN LAG({total_revenue}) OVER (
              PARTITION BY {customer_region}
              ORDER BY {order_year}, {order_month}
            ) > 0
            THEN (
              {total_revenue} - LAG({total_revenue}) OVER (
                PARTITION BY {customer_region}
                ORDER BY {order_year}, {order_month}
              )
            ) / LAG({total_revenue}) OVER (
              PARTITION BY {customer_region}
              ORDER BY {order_year}, {order_month}
            ) * 100
            ELSE NULL
          END
        type: avg
        format: percent
        
      - name: year_over_year_growth
        description: "Year over year revenue growth percentage"
        sql: >
          CASE 
            WHEN LAG({total_revenue}, 12) OVER (
              PARTITION BY {customer_region}
              ORDER BY {order_year}, {order_month}
            ) > 0
            THEN (
              {total_revenue} - LAG({total_revenue}, 12) OVER (
                PARTITION BY {customer_region}
                ORDER BY {order_year}, {order_month}
              )
            ) / LAG({total_revenue}, 12) OVER (
              PARTITION BY {customer_region}
              ORDER BY {order_year}, {order_month}
            ) * 100
            ELSE NULL
          END
        type: avg
        format: percent
        
      # Rolling averages
      - name: rolling_3_month_avg
        description: "3-month rolling average revenue"
        sql: >
          AVG({total_revenue}) OVER (
            PARTITION BY {customer_region}
            ORDER BY {order_year}, {order_month}
            ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
          )
        type: avg
        format: currency
        
      - name: rolling_12_month_avg
        description: "12-month rolling average revenue"
        sql: >
          AVG({total_revenue}) OVER (
            PARTITION BY {customer_region}
            ORDER BY {order_year}, {order_month}
            ROWS BETWEEN 11 PRECEDING AND CURRENT ROW
          )
        type: avg
        format: currency
```

### Cohort Analysis Implementation

Create customer cohort analysis using order data:

```yaml
# model/customer_cohorts.yml
cubes:
  - name: customer_cohorts
    description: Customer cohort analysis for retention tracking
    
    sql_table: >
      WITH customer_first_order AS (
        SELECT 
          o_custkey,
          MIN(DATE(o_orderdate)) as first_order_date,
          DATE_TRUNC('month', MIN(DATE(o_orderdate))) as cohort_month
        FROM read_csv_auto('https://cube-demo-tpch.s3.us-west-2.amazonaws.com/orders.csv')
        GROUP BY o_custkey
      ),
      order_periods AS (
        SELECT 
          o.o_custkey,
          o.o_orderkey,
          DATE(o.o_orderdate) as order_date,
          DATE_TRUNC('month', DATE(o.o_orderdate)) as order_month,
          cfo.cohort_month,
          DATEDIFF('month', cfo.cohort_month, DATE_TRUNC('month', DATE(o.o_orderdate))) as period_number,
          o.o_totalprice
        FROM read_csv_auto('https://cube-demo-tpch.s3.us-west-2.amazonaws.com/orders.csv') o
        JOIN customer_first_order cfo ON o.o_custkey = cfo.o_custkey
      )
      SELECT * FROM order_periods
    
    joins:
      - name: customer
        sql: "{CUBE}.o_custkey = {customer}.custkey"
        relationship: many_to_one
    
    dimensions:
      - name: custkey
        sql: o_custkey
        type: number
        
      - name: cohort_month
        sql: cohort_month
        type: time
        
      - name: period_number
        sql: period_number
        type: number
        
      - name: order_month
        sql: order_month
        type: time
        
      - name: customer_segment
        sql: "{Customer}.mktsegment"
        type: string
        
      - name: customer_region
        sql: "{Customer}.region_name"
        type: string
    
    measures:
      - name: customers_in_cohort
        description: "Number of unique customers in cohort"
        sql: o_custkey
        type: count_distinct
        
      - name: revenue_in_period
        description: "Revenue generated in this period"
        sql: o_totalprice
        type: sum
        format: currency
        
      - name: orders_in_period
        description: "Number of orders in this period"
        sql: o_orderkey
        type: count
        
      - name: retention_rate
        description: "Customer retention rate by period"
        sql: >
          COUNT(DISTINCT CASE WHEN {period_number} > 0 THEN {custkey} END) * 100.0 /
          NULLIF(COUNT(DISTINCT CASE WHEN {period_number} = 0 THEN {custkey} END), 0)
        type: number
        format: percent
        
      - name: cumulative_revenue_per_customer
        description: "Cumulative revenue per customer"
        sql: >
          SUM({revenue_in_period}) OVER (
            PARTITION BY {cohort_month}, {custkey} 
            ORDER BY {period_number}
            ROWS UNBOUNDED PRECEDING
          ) / NULLIF({customers_in_cohort}, 0)
        type: avg
        format: currency
```

### Advanced Segmentation

Create dynamic customer segmentation based on behavior:

```yaml
# model/customer_segments.yml
cubes:
  - name: customer_segments
    description: Dynamic customer segmentation based on purchase behavior
    
    sql_table: >
      WITH customer_metrics AS (
        SELECT 
          c.c_custkey,
          c.c_name,
          c.c_mktsegment,
          c.c_acctbal,
          COUNT(o.o_orderkey) as total_orders,
          SUM(o.o_totalprice) as total_spent,
          AVG(o.o_totalprice) as avg_order_value,
          MAX(DATE(o.o_orderdate)) as last_order_date,
          MIN(DATE(o.o_orderdate)) as first_order_date,
          DATEDIFF('day', MIN(DATE(o.o_orderdate)), MAX(DATE(o.o_orderdate))) as customer_lifespan_days
        FROM read_csv_auto('https://cube-demo-tpch.s3.us-west-2.amazonaws.com/customer.csv') c
        LEFT JOIN read_csv_auto('https://cube-demo-tpch.s3.us-west-2.amazonaws.com/orders.csv') o 
          ON c.c_custkey = o.o_custkey
        GROUP BY c.c_custkey, c.c_name, c.c_mktsegment, c.c_acctbal
      ),
      segmented_customers AS (
        SELECT 
          *,
          CASE 
            WHEN total_spent >= 500000 AND total_orders >= 10 THEN 'VIP'
            WHEN total_spent >= 200000 AND total_orders >= 5 THEN 'High Value'
            WHEN total_spent >= 50000 OR total_orders >= 3 THEN 'Regular'
            WHEN total_orders >= 1 THEN 'New'
            ELSE 'Prospect'
          END as value_segment,
          CASE 
            WHEN DATEDIFF('day', last_order_date, CURRENT_DATE) <= 90 THEN 'Active'
            WHEN DATEDIFF('day', last_order_date, CURRENT_DATE) <= 365 THEN 'At Risk'
            WHEN last_order_date IS NOT NULL THEN 'Churned'
            ELSE 'Never Purchased'
          END as activity_segment,
          CASE 
            WHEN avg_order_value >= 50000 THEN 'High AOV'
            WHEN avg_order_value >= 20000 THEN 'Medium AOV'
            WHEN avg_order_value > 0 THEN 'Low AOV'
            ELSE 'No Orders'
          END as aov_segment
        FROM customer_metrics
      )
      SELECT * FROM segmented_customers
    
    joins:
      - name: nation
        sql: "{CUBE}.c_nationkey = {nation}.nationkey"
        relationship: many_to_one
    
    dimensions:
      - name: custkey
        sql: c_custkey
        type: number
        primary_key: true
        
      - name: name
        sql: c_name
        type: string
        
      - name: value_segment
        sql: value_segment
        type: string
        
      - name: activity_segment
        sql: activity_segment
        type: string
        
      - name: aov_segment
        sql: aov_segment
        type: string
        
      - name: combined_segment
        description: "Combined value and activity segment"
        sql: >
          CONCAT({value_segment}, ' - ', {activity_segment})
        type: string
        
      - name: nation_name
        sql: "{Nation}.name"
        type: string
        
      - name: region_name
        sql: "{Nation.Region}.name"
        type: string
    
    measures:
      - name: customer_count
        sql: c_custkey
        type: count
        
      - name: total_customer_value
        sql: total_spent
        type: sum
        format: currency
        
      - name: avg_customer_value
        sql: total_spent
        type: avg
        format: currency
        
      - name: avg_customer_lifespan
        sql: customer_lifespan_days
        type: avg
        
      - name: total_orders_all_customers
        sql: total_orders
        type: sum
        
      - name: avg_orders_per_customer
        sql: total_orders
        type: avg
```

## Dynamic Data Modeling

### Runtime Schema Generation

Create flexible schemas that adapt to different client needs:

```javascript
// model/dynamic-schema.js
const generateDynamicCube = (config) => {
  const { 
    tableName, 
    cubeName, 
    dimensions = [], 
    measures = [],
    joins = [],
    security = {}
  } = config;

  return {
    cubes: [{
      name: cubeName,
      sql_table: tableName,
      
      dimensions: [
        // Always include primary key
        {
          name: 'id',
          sql: 'id',
          type: 'number',
          primary_key: true
        },
        // Add configured dimensions
        ...dimensions.map(dim => ({
          name: dim.name,
          sql: dim.sql || dim.name,
          type: dim.type || 'string',
          description: dim.description,
          shown: dim.shown !== false
        }))
      ],
      
      measures: [
        // Always include count
        {
          name: 'count',
          sql: 'id',
          type: 'count'
        },
        // Add configured measures
        ...measures.map(measure => ({
          name: measure.name,
          sql: measure.sql || measure.name,
          type: measure.type || 'sum',
          description: measure.description,
          format: measure.format,
          shown: measure.shown !== false
        }))
      ],
      
      joins: joins.map(join => ({
        name: join.cube,
        sql: join.sql,
        relationship: join.relationship || 'many_to_one'
      })),
      
      // Apply security if configured
      ...(security.sql_where && { sql_where: security.sql_where }),
      ...(security.shown && { shown: security.shown })
    }]
  };
};

// Usage examples
const ecommerceConfig = {
  tableName: 'orders',
  cubeName: 'EcommerceOrders',
  dimensions: [
    { name: 'customer_id', type: 'number' },
    { name: 'product_category', type: 'string' },
    { name: 'order_date', type: 'time' },
    { name: 'status', type: 'string' }
  ],
  measures: [
    { name: 'total_amount', type: 'sum', format: 'currency' },
    { name: 'avg_order_value', type: 'avg', format: 'currency' }
  ],
  security: {
    sql_where: "{SECURITY_CONTEXT.tenant_id.unsafeValue()} = tenant_id"
  }
};

const saasConfig = {
  tableName: 'usage_events',
  cubeName: 'SaasUsage',
  dimensions: [
    { name: 'user_id', type: 'number' },
    { name: 'feature_name', type: 'string' },
    { name: 'event_date', type: 'time' },
    { name: 'subscription_tier', type: 'string' }
  ],
  measures: [
    { name: 'event_count', sql: 'event_id', type: 'count' },
    { name: 'unique_users', sql: 'user_id', type: 'count_distinct' },
    { name: 'avg_session_duration', type: 'avg' }
  ]
};

module.exports = {
  generateDynamicCube,
  ecommerceConfig,
  saasConfig
};
```

### Configuration-Driven Modeling

```javascript
// cube.js - Dynamic schema loading
const { generateDynamicCube } = require('./model/dynamic-schema');

module.exports = {
  repositoryFactory: ({ securityContext }) => {
    // Load client-specific configuration
    const clientConfig = getClientConfig(securityContext.client_id);
    
    return {
      dataSchemaFiles: () => {
        // Generate schema based on client configuration
        const schemas = clientConfig.cubes.map(cubeConfig => 
          generateDynamicCube(cubeConfig)
        );
        
        // Return as virtual files
        return schemas.map((schema, index) => ({
          fileName: `generated-cube-${index}.js`,
          content: `module.exports = ${JSON.stringify(schema, null, 2)};`
        }));
      }
    };
  }
};

// Configuration management
const getClientConfig = (clientId) => {
  // This could load from database, config service, etc.
  const configs = {
    'client-ecommerce': {
      cubes: [ecommerceConfig]
    },
    'client-saas': {
      cubes: [saasConfig]
    }
  };
  
  return configs[clientId] || { cubes: [] };
};
```

## Advanced Exercise: Real-World Analytics Scenario

### Scenario: E-commerce Analytics Platform

Build a comprehensive analytics solution for an e-commerce client using advanced patterns:

```yaml
# model/ecommerce_analytics.yml
cubes:
  - name: ecommerce_analytics
    description: Comprehensive e-commerce analytics with advanced calculations
    
    sql_table: >
      WITH order_metrics AS (
        SELECT 
          o.*,
          li.l_quantity,
          li.l_extendedprice,
          li.l_discount,
          li.l_extendedprice * (1 - li.l_discount) as net_revenue,
          c.c_mktsegment,
          n.name as nation_name,
          r.name as region_name,
          DATE(o.o_orderdate) as order_date,
          EXTRACT(YEAR FROM DATE(o.o_orderdate)) as order_year,
          EXTRACT(MONTH FROM DATE(o.o_orderdate)) as order_month,
          EXTRACT(DOW FROM DATE(o.o_orderdate)) as order_dow,
          CASE 
            WHEN EXTRACT(DOW FROM DATE(o.o_orderdate)) IN (0, 6) THEN 'Weekend'
            ELSE 'Weekday'
          END as day_type,
          ROW_NUMBER() OVER (
            PARTITION BY o.o_custkey 
            ORDER BY o.o_orderdate
          ) as customer_order_sequence
        FROM read_csv_auto('https://cube-demo-tpch.s3.us-west-2.amazonaws.com/orders.csv') o
        JOIN read_csv_auto('https://cube-demo-tpch.s3.us-west-2.amazonaws.com/lineitem.csv') li 
          ON o.o_orderkey = li.l_orderkey
        JOIN read_csv_auto('https://cube-demo-tpch.s3.us-west-2.amazonaws.com/customer.csv') c 
          ON o.o_custkey = c.c_custkey
        JOIN read_csv_auto('https://cube-demo-tpch.s3.us-west-2.amazonaws.com/nation.csv') n 
          ON c.c_nationkey = n.nationkey
        JOIN read_csv_auto('https://cube-demo-tpch.s3.us-west-2.amazonaws.com/region.csv') r 
          ON n.regionkey = r.regionkey
      )
      SELECT * FROM order_metrics
    
    dimensions:
      - name: order_date
        sql: order_date
        type: time
        
      - name: order_year
        sql: order_year
        type: number
        
      - name: order_month
        sql: order_month
        type: number
        
      - name: day_type
        sql: day_type
        type: string
        
      - name: customer_segment
        sql: c_mktsegment
        type: string
        
      - name: region_name
        sql: region_name
        type: string
        
      - name: nation_name
        sql: nation_name
        type: string
        
      - name: order_status
        sql: o_orderstatus
        type: string
        
      - name: customer_order_sequence
        sql: customer_order_sequence
        type: number
        
      - name: is_first_order
        sql: >
          CASE WHEN {customer_order_sequence} = 1 THEN 'First Order' 
               ELSE 'Repeat Order' END
        type: string
        
      - name: order_priority
        sql: o_orderpriority
        type: string
    
    measures:
      # Revenue metrics
      - name: gross_revenue
        sql: l_extendedprice
        type: sum
        format: currency
        
      - name: net_revenue
        sql: net_revenue
        type: sum
        format: currency
        
      - name: total_discount
        sql: l_extendedprice * l_discount
        type: sum
        format: currency
        
      - name: discount_rate
        sql: l_discount
        type: avg
        format: percent
        
      # Volume metrics
      - name: total_quantity
        sql: l_quantity
        type: sum
        
      - name: order_count
        sql: o_orderkey
        type: count_distinct
        
      - name: customer_count
        sql: o_custkey
        type: count_distinct
        
      # Average metrics
      - name: avg_order_value
        sql: net_revenue
        type: avg
        format: currency
        
      - name: avg_items_per_order
        sql: l_quantity
        type: avg
        
      - name: avg_revenue_per_customer
        sql: >
          SUM({net_revenue}) / COUNT(DISTINCT {o_custkey})
        type: number
        format: currency
        
      # Growth metrics
      - name: revenue_growth_mom
        description: "Month-over-month revenue growth"
        sql: >
          (SUM({net_revenue}) - LAG(SUM({net_revenue})) OVER (
            ORDER BY {order_year}, {order_month}
          )) / NULLIF(LAG(SUM({net_revenue})) OVER (
            ORDER BY {order_year}, {order_month}
          ), 0) * 100
        type: number
        format: percent
        
      - name: customer_growth_mom
        description: "Month-over-month customer growth"
        sql: >
          (COUNT(DISTINCT {o_custkey}) - LAG(COUNT(DISTINCT {o_custkey})) OVER (
            ORDER BY {order_year}, {order_month}
          )) / NULLIF(LAG(COUNT(DISTINCT {o_custkey})) OVER (
            ORDER BY {order_year}, {order_month}
          ), 0) * 100
        type: number
        format: percent
        
      # Repeat purchase metrics
      - name: first_time_customer_revenue
        sql: >
          CASE WHEN {customer_order_sequence} = 1 THEN {net_revenue} END
        type: sum
        format: currency
        
      - name: repeat_customer_revenue
        sql: >
          CASE WHEN {customer_order_sequence} > 1 THEN {net_revenue} END
        type: sum
        format: currency
        
      - name: repeat_purchase_rate
        description: "Percentage of customers who make repeat purchases"
        sql: >
          COUNT(DISTINCT CASE WHEN {customer_order_sequence} > 1 THEN {o_custkey} END) * 100.0 /
          NULLIF(COUNT(DISTINCT {o_custkey}), 0)
        type: number
        format: percent
        
    pre_aggregations:
      # Daily summary for real-time dashboards
      - name: daily_summary
        measures:
          - net_revenue
          - order_count
          - customer_count
          - avg_order_value
        dimensions:
          - region_name
          - customer_segment
          - day_type
        time_dimension: order_date
        granularity: day
        refresh_key:
          every: "10 minutes"
        build_range_start:
          sql: SELECT DATE('now', '-90 days')
        build_range_end:
          sql: SELECT DATE('now', '+1 day')
          
      # Monthly rollup for historical analysis
      - name: monthly_rollup
        measures:
          - net_revenue
          - order_count
          - customer_count
          - repeat_purchase_rate
        dimensions:
          - region_name
          - customer_segment
        time_dimension: order_date
        granularity: month
        partition_granularity: year
        refresh_key:
          every: "1 hour"
        build_range_start:
          sql: SELECT DATE('2020-01-01')
        build_range_end:
          sql: SELECT DATE('now')
```

## Production Troubleshooting

### Common Issues and Solutions

#### 1. Query Performance Problems

**Symptoms:**
- Slow query response times
- High CPU usage
- Memory issues

**Diagnosis:**
```sql
-- Check query execution plans
EXPLAIN ANALYZE 
SELECT customer_region, SUM(total_revenue) 
FROM Orders 
GROUP BY customer_region;

-- Monitor pre-aggregation usage
SELECT 
  query_hash,
  avg_execution_time,
  pre_aggregation_hit,
  COUNT(*) as query_count
FROM query_history 
GROUP BY query_hash, avg_execution_time, pre_aggregation_hit
ORDER BY avg_execution_time DESC;
```

**Solutions:**
- Add targeted pre-aggregations
- Optimize SQL in cube definitions
- Review join patterns and cardinality
- Scale infrastructure resources

#### 2. Pre-aggregation Build Failures

**Symptoms:**
- Failed pre-aggregation builds
- Stale data in dashboards
- Build timeouts

**Common Causes:**
```yaml
# Problematic pre-aggregation
pre_aggregations:
  - name: problematic_rollup
    # Issue: Too many high-cardinality dimensions
    dimensions:
      - customer_name      # High cardinality
      - product_sku        # High cardinality  
      - order_number       # Unique values
    # Issue: Too wide date range
    build_range_start:
      sql: SELECT DATE('1990-01-01')  # 30+ years of data
```

**Solutions:**
```yaml
# Optimized pre-aggregation
pre_aggregations:
  - name: optimized_rollup
    # Use lower cardinality dimensions
    dimensions:
      - customer_segment   # Low cardinality
      - product_category   # Low cardinality
    # Reasonable date range
    build_range_start:
      sql: SELECT DATE('now', '-2 years')
    # Partition by time for incremental builds
    partition_granularity: month
```

#### 3. Security Context Issues

**Problem:** Users seeing data they shouldn't access

**Diagnosis:**
```javascript
// Debug security context
module.exports = {
  checkAuth: async (req, authorization) => {
    const context = extractSecurityContext(req);
    
    // Log security context for debugging
    console.log('Security Context:', JSON.stringify(context, null, 2));
    
    return context;
  }
};
```

**Solution:**
```yaml
# Verify security filters
sql_where: >
  {SECURITY_CONTEXT.tenant_id.unsafeValue()} = tenant_id
  AND (
    {SECURITY_CONTEXT.role.unsafeValue()} = 'admin' 
    OR {SECURITY_CONTEXT.user_id.unsafeValue()} = user_id
  )
```

### Monitoring and Alerting

```javascript
// cube.js - Production monitoring
module.exports = {
  // Custom telemetry
  telemetry: {
    agent: 'datadog',  // or your monitoring service
    apiKey: process.env.MONITORING_API_KEY
  },
  
  // Query middleware for custom logging
  queryTransformer: (query, { securityContext }) => {
    // Log slow queries
    const startTime = Date.now();
    
    return {
      ...query,
      metadata: {
        startTime,
        userId: securityContext.user_id,
        tenantId: securityContext.tenant_id
      }
    };
  },
  
  // Error handling
  orchestratorOptions: {
    errorHandler: (error, { query, securityContext }) => {
      // Send to error tracking service
      console.error('Cube Query Error:', {
        error: error.message,
        query: JSON.stringify(query),
        user: securityContext.user_id,
        timestamp: new Date().toISOString()
      });
      
      // Re-throw to maintain normal error flow
      throw error;
    }
  }
};
```

## Enterprise Architecture Patterns

### Multi-Region Deployment

```javascript
// Multi-region configuration
const getRegionalConfig = (region) => ({
  'us-east-1': {
    dbHost: 'cube-db-east.company.com',
    cacheRedis: 'cube-cache-east.company.com',
    cubeStore: 's3://cube-store-east/'
  },
  'eu-west-1': {
    dbHost: 'cube-db-eu.company.com', 
    cacheRedis: 'cube-cache-eu.company.com',
    cubeStore: 's3://cube-store-eu/'
  }
});

module.exports = {
  driverFactory: ({ securityContext }) => {
    const region = securityContext.region || 'us-east-1';
    const config = getRegionalConfig(region);
    
    return createDatabaseConnection(config);
  }
};
```

### Microservices Integration

```javascript
// Service mesh integration
module.exports = {
  contextToAppId: ({ securityContext }) => 
    `cube-${securityContext.service_name}`,
    
  externalDriverFactory: async ({ securityContext }) => {
    // Service discovery for data sources
    const serviceConfig = await discoverService(
      securityContext.data_service
    );
    
    return createExternalConnection(serviceConfig);
  }
};
```

## Best Practices Summary

### Development Workflow

1. **Start Simple**: Begin with basic cubes, add complexity incrementally
2. **Test Thoroughly**: Validate security, performance, and accuracy
3. **Document Everything**: Maintain clear documentation for maintenance
4. **Version Control**: Use proper Git workflow for schema changes

### Performance Optimization

1. **Pre-aggregation Strategy**: Plan rollups based on query patterns
2. **Monitor Usage**: Track which cubes and measures are actually used
3. **Optimize Incrementally**: Make small changes and measure impact
4. **Scale Appropriately**: Right-size infrastructure for workload

### Security Implementation

1. **Defense in Depth**: Multiple layers of security controls
2. **Principle of Least Privilege**: Give minimum necessary access
3. **Regular Audits**: Review and validate security configurations
4. **Compliance**: Ensure adherence to regulatory requirements

### Client Success

1. **Understand Business Needs**: Map technical features to business value
2. **Iterative Delivery**: Show progress early and often
3. **User Training**: Ensure end users can effectively use the system
4. **Ongoing Support**: Plan for maintenance and enhancement

## Exercise Validation

By the end of this module, you should have:
- ✅ Implemented period-over-period analysis
- ✅ Created cohort analysis for customer retention
- ✅ Built dynamic segmentation logic
- ✅ Understanding of production troubleshooting
- ✅ Knowledge of enterprise architecture patterns
- ✅ Comprehensive real-world analytics implementation

## Congratulations!

You've completed the Cube Partner Training Program. You now have the knowledge and practical experience to:

- **Implement** Cube solutions for diverse client needs
- **Optimize** performance for production workloads  
- **Secure** deployments with enterprise-grade controls
- **Integrate** with popular BI tools and custom applications
- **Troubleshoot** common issues and optimize performance
- **Scale** implementations for growing data and user needs

## Next Steps

1. **Practice** with your own client scenarios
2. **Join** the Cube community for ongoing support
3. **Contribute** to the training program with your experiences
4. **Build** your Cube practice and grow your expertise

Welcome to the Cube partner ecosystem!