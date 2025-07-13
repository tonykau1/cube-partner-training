# Module 5: Performance & Caching

## Learning Objectives

By the end of this module, you will be able to:

- Implement pre-aggregations for optimal query performance
- Configure Cube Store caching strategies
- Monitor and troubleshoot performance issues
- Optimize data models for large-scale deployments
- Design refresh schedules for real-time vs batch analytics

## Module Overview

**Duration**: 30 minutes  
**Format**: Theory (10 min) → Demo (10 min) → Hands-on Exercise (10 min)

Performance is critical for user adoption. This module covers the essential optimization techniques that separate good implementations from great ones.

## Prerequisites

- Completed Module 4: Security & Access Control
- Working TPC-H data model with security controls
- Understanding of analytical query patterns

## Video Demo Outline

*The following topics should be covered in the recorded video demonstration:*

### Performance Fundamentals (3 minutes)
- **Show**: Query history and performance monitoring
- **Explain**: Query execution flow in Cube
- **Highlight**: Common performance bottlenecks
- **Demonstrate**: Using the query profiler

### Pre-aggregation Strategy (4 minutes)
- **Show**: Pre-aggregation configuration and build process
- **Demonstrate**: Automatic rollup selection
- **Explain**: Granularity and partitioning decisions
- **Highlight**: Storage and refresh trade-offs

### Monitoring and Optimization (3 minutes)
- **Navigate**: Cube Cloud performance dashboard
- **Show**: Cache hit rates and query metrics
- **Demonstrate**: Identifying and fixing slow queries
- **Explain**: Scaling strategies for growing data

## Performance Fundamentals

### Query Execution Flow

```
User Query → Cube API → Query Planner → Cache Check → Data Source
     ↑                                        ↓
Response ← Result Formatter ← Pre-aggregation ← Raw Data
```

Cube optimizes performance through:
1. **Query Planning**: Choosing optimal data sources
2. **Pre-aggregations**: Pre-calculated rollups for common queries
3. **Caching**: In-memory and persistent caching layers
4. **Parallel Processing**: Concurrent query execution

### Performance Bottlenecks

**Common Issues**:
- Large fact tables without pre-aggregations
- Complex joins across multiple tables  
- High-cardinality dimensions
- Real-time queries on historical data
- Missing indexes on source databases

**Solutions**:
- Strategic pre-aggregation design
- Optimized join patterns
- Appropriate granularity choices
- Hybrid real-time/batch architecture
- Database optimization

## Hands-On Exercise: Implementing Pre-aggregations

### Step 1: Analyze Current Performance

First, let's understand your current query patterns:

1. **Run some test queries** in the Playground:
   - Regional sales by month
   - Customer segmentation analysis
   - Product performance trends

2. **Check query execution times** in the Query History tab

3. **Identify patterns** that would benefit from pre-aggregation

### Step 2: Create Your First Pre-aggregation

Add pre-aggregations to your `orders` cube:

```yaml
# model/orders.yml
cubes:
  - name: orders
    description: Customer orders with performance optimizations
    
    # ... existing configuration ...
    
    pre_aggregations:
      # Monthly sales rollup
      - name: monthly_sales
        description: Monthly sales aggregated by region and segment
        measures:
          - total_revenue
          - count
          - avg_order_value
        dimensions:
          - customer_region
          - customer_segment
        time_dimension: orderdate
        granularity: month
        partition_granularity: year
        refresh_key:
          every: "1 hour"
        build_range_start:
          sql: SELECT DATE('2022-01-01')
        build_range_end:
          sql: SELECT DATE('2025-12-31')
      
      # Daily sales for recent data
      - name: daily_sales_recent
        description: Daily sales for the last 90 days
        measures:
          - total_revenue
          - count
          - avg_order_value
        dimensions:
          - customer_region
          - orderstatus
        time_dimension: orderdate
        granularity: day
        refresh_key:
          every: "10 minutes"
        build_range_start:
          sql: SELECT DATE('now', '-90 days')
        build_range_end:
          sql: SELECT DATE('now', '+1 day')
      
      # Customer segment analysis
      - name: customer_segment_rollup
        description: Customer segment performance metrics
        measures:
          - total_revenue
          - count
        dimensions:
          - customer_segment
          - customer_region
          - orderpriority
        refresh_key:
          every: "1 day"
```

### Step 3: Add LineItem Pre-aggregations

Update `model/line_item.yml` with performance-focused rollups:

```yaml
# model/line_item.yml
cubes:
  - name: line_item
    description: Line items with advanced pre-aggregations
    
    # ... existing configuration ...
    
    pre_aggregations:
      # Product performance rollup
      - name: product_performance
        description: Product sales and quantities by time
        measures:
          - total_revenue
          - total_quantity
          - count
        dimensions:
          - returnflag
          - linestatus
          - shipmode
        time_dimension: shipdate
        granularity: month
        partition_granularity: year
        refresh_key:
          every: "2 hours"
        build_range_start:
          sql: SELECT DATE('2022-01-01')
        build_range_end:
          sql: SELECT DATE('2025-12-31')
      
      # Real-time shipping metrics
      - name: shipping_metrics_realtime
        description: Recent shipping performance
        measures:
          - total_revenue
          - total_quantity
          - avg_discount
        dimensions:
          - shipmode
          - shipinstruct
        time_dimension: shipdate
        granularity: day
        refresh_key:
          every: "5 minutes"
        build_range_start:
          sql: SELECT DATE('now', '-30 days')
        build_range_end:
          sql: SELECT DATE('now', '+1 day')
      
      # Large historical rollup
      - name: historical_summary
        description: High-level historical trends
        measures:
          - total_revenue
          - total_quantity
        dimensions:
          - returnflag
        time_dimension: shipdate
        granularity: quarter
        partition_granularity: year
        refresh_key:
          every: "1 day"
        build_range_start:
          sql: SELECT DATE('2020-01-01')
        build_range_end:
          sql: SELECT DATE('now')
```

### Step 4: Configure Refresh Strategies

Create `model/refresh.js` for centralized refresh logic:

```javascript
// model/refresh.js

// Dynamic refresh based on data freshness
const dynamicRefreshKey = (tableName) => ({
  sql: `SELECT MAX(updated_at) FROM ${tableName}`
});

// Time-based refresh for different data types
const refreshStrategies = {
  realtime: { every: "1 minute" },
  operational: { every: "10 minutes" },
  analytical: { every: "1 hour" },
  historical: { every: "1 day" }
};

// Build ranges for different scenarios
const buildRanges = {
  recent: {
    start: () => ({ sql: "SELECT DATE('now', '-90 days')" }),
    end: () => ({ sql: "SELECT DATE('now', '+1 day')" })
  },
  
  currentYear: {
    start: () => ({ sql: "SELECT DATE('now', 'start of year')" }),
    end: () => ({ sql: "SELECT DATE('now', '+1 day')" })
  },
  
  historical: {
    start: () => ({ sql: "SELECT DATE('2020-01-01')" }),
    end: () => ({ sql: "SELECT DATE('now')" })
  }
};

module.exports = {
  dynamicRefreshKey,
  refreshStrategies,
  buildRanges
};
```

### Step 5: Monitor Pre-aggregation Performance

1. **Build your pre-aggregations**:
   - Navigate to "Pre-aggregations" in Cube Cloud
   - Trigger manual builds for testing
   - Monitor build progress and times

2. **Test query performance**:
   - Run the same queries from Step 1
   - Compare execution times before/after
   - Check cache hit rates in Query History

3. **Verify pre-aggregation usage**:
   - Look for "Pre-aggregation Hit" in query logs
   - Monitor cache hit ratios
   - Identify queries still hitting raw data

### Step 6: Advanced Optimization Patterns

#### Hierarchical Pre-aggregations

```yaml
pre_aggregations:
  # Base level - most granular
  - name: daily_base
    measures: [total_revenue, count]
    dimensions: [customer_region]
    time_dimension: orderdate
    granularity: day
    
  # Rollup level - built from base
  - name: monthly_rollup
    type: rollup
    measures: [total_revenue, count]
    dimensions: [customer_region]
    time_dimension: orderdate
    granularity: month
    use_original_sql_pre_aggregations: true
    rollup_references:
      - daily_base
```

#### Partitioned Pre-aggregations

```yaml
pre_aggregations:
  - name: partitioned_sales
    measures: [total_revenue, count]
    dimensions: [customer_region]
    time_dimension: orderdate
    granularity: day
    partition_granularity: month
    # Each month becomes a separate partition
    # Enables efficient incremental refresh
```

#### External Pre-aggregations

```yaml
pre_aggregations:
  - name: external_summary
    type: external
    # Store in your data warehouse instead of Cube Store
    external: true
    measures: [total_revenue]
    dimensions: [customer_region]
    time_dimension: orderdate
    granularity: month
```

## Advanced Performance Patterns

### 1. Lambda Architecture

Combine real-time and batch processing:

```yaml
# Real-time layer (last 24 hours)
- name: realtime_metrics
  measures: [total_revenue, count]
  time_dimension: orderdate
  granularity: hour
  refresh_key:
    every: "1 minute"
  build_range_start:
    sql: SELECT DATE('now', '-1 day')

# Batch layer (historical data)  
- name: batch_metrics
  measures: [total_revenue, count]
  time_dimension: orderdate
  granularity: day
  refresh_key:
    every: "1 day"
  build_range_end:
    sql: SELECT DATE('now', '-1 day')
```

### 2. Multi-Tenant Optimization

```yaml
pre_aggregations:
  - name: tenant_optimized
    measures: [total_revenue]
    dimensions: [customer_region]
    time_dimension: orderdate
    granularity: day
    # Separate pre-aggs per tenant
    partition_granularity: month
    # Use security context for partitioning
    sql_where: >
      tenant_id = {SECURITY_CONTEXT.tenant_id.unsafeValue()}
```

### 3. Conditional Pre-aggregations

```yaml
pre_aggregations:
  - name: conditional_rollup
    measures: [total_revenue]
    dimensions: [customer_region]
    time_dimension: orderdate
    granularity: month
    # Only build if data volume is high
    sql_where: >
      {CUBE}.order_count > 1000
```

## Performance Monitoring

### Key Metrics to Track

**Query Performance**:
- Average query response time
- 95th percentile response time
- Cache hit rate
- Pre-aggregation usage rate

**Pre-aggregation Health**:
- Build success rate
- Build duration trends
- Storage utilization
- Refresh lag

**System Resources**:
- CPU utilization
- Memory usage
- Disk I/O patterns
- Network throughput

### Cube Cloud Monitoring

1. **Performance Dashboard**: Real-time metrics and alerts
2. **Query History**: Detailed execution analysis
3. **Pre-aggregation Status**: Build monitoring and troubleshooting
4. **Usage Analytics**: Query patterns and optimization opportunities

### Custom Monitoring

```javascript
// cube.js - Add custom telemetry
module.exports = {
  telemetry: true,
  
  orchestratorOptions: {
    telemetry: {
      agent: 'your-monitoring-service',
      apiKey: process.env.MONITORING_API_KEY
    }
  },
  
  // Custom query logging
  queryTransformer: (query, { securityContext }) => {
    console.log('Query executed:', {
      user: securityContext.user_id,
      query: JSON.stringify(query),
      timestamp: new Date().toISOString()
    });
    return query;
  }
};
```

## Troubleshooting Common Issues

### Pre-aggregation Build Failures

**Symptoms**: Pre-aggregations not building or failing
**Diagnosis**: Check build logs and error messages
**Solutions**:
- Verify SQL syntax in measures and dimensions
- Check data source connectivity
- Validate time ranges and partitioning
- Monitor memory usage during builds

### Cache Miss Issues

**Symptoms**: Queries not using pre-aggregations
**Diagnosis**: Query doesn't match pre-aggregation definition
**Solutions**:
- Adjust pre-aggregation dimensions/measures
- Check time granularity alignment
- Verify security context compatibility
- Review query patterns in logs

### Performance Degradation

**Symptoms**: Increasing query response times
**Diagnosis**: Monitor system metrics and query patterns
**Solutions**:
- Scale infrastructure resources
- Optimize slow queries
- Add targeted pre-aggregations
- Review and clean up unused pre-aggregations

## Best Practices

### Pre-aggregation Design

1. **Start simple**: Begin with obvious rollups, add complexity gradually
2. **Monitor usage**: Track which pre-aggregations are actually used
3. **Size appropriately**: Balance storage cost vs query speed
4. **Plan partitioning**: Use time-based partitioning for large datasets

### Refresh Strategy

1. **Match business needs**: Real-time vs batch refresh requirements
2. **Stagger schedules**: Avoid resource contention
3. **Monitor freshness**: Alert on stale data
4. **Handle failures**: Implement retry logic and fallbacks

### Resource Management

1. **Right-size infrastructure**: Match resources to workload patterns
2. **Use auto-scaling**: Let Cube Cloud handle traffic spikes
3. **Monitor costs**: Track pre-aggregation storage and compute costs
4. **Regular cleanup**: Remove unused or outdated pre-aggregations

## Client Success Patterns

### Implementation Strategy

1. **Profile first**: Understand query patterns before optimizing
2. **Iterative approach**: Implement, measure, optimize, repeat
3. **User testing**: Validate performance improvements with end users
4. **Documentation**: Document optimization decisions for maintenance

### Capacity Planning

1. **Data growth**: Plan for increasing data volumes
2. **User growth**: Scale for more concurrent users
3. **Query complexity**: Account for evolving analytics needs
4. **Geographic distribution**: Consider multi-region deployments

## Exercise Validation

By the end of this module, you should have:
- ✅ Pre-aggregations configured and building successfully
- ✅ Improved query performance (measure before/after)
- ✅ Monitoring dashboard understanding
- ✅ Refresh strategies implemented
- ✅ Performance troubleshooting skills
- ✅ Optimization roadmap for client projects

## Next Steps

In Module 6, we'll explore APIs and integrations. You'll learn how to connect your optimized Cube deployment to various BI tools, build custom applications, and create embedded analytics solutions.