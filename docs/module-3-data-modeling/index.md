# Module 3: Data Modeling

## Learning Objectives

By the end of this module, you will be able to:

- Design comprehensive data models using TPC-H schema
- Implement complex multi-table joins and relationships
- Handle time-based data and date dimensions effectively
- Create reusable measures and calculated fields
- Apply data modeling best practices for scalable schemas

## Module Overview

**Duration**: 60 minutes  
**Format**: Theory (20 min) → Demo (15 min) → Hands-on Exercise (20 min) → Review (5 min)

This module builds a complete analytics schema using the TPC-H dataset, demonstrating real-world data modeling patterns you'll use with clients.

## Prerequisites

- Completed Module 2: Getting Started
- Working Cube Cloud deployment with nation and region models
- Basic understanding of SQL joins and relationships

## Video Demo Outline

*The following topics should be covered in the recorded video demonstration:*

### Data Modeling Approach (7 minutes)
- **Show**: TPC-H schema diagram and relationships
- **Explain**: Dimensional vs. fact table patterns
- **Demonstrate**: Planning cube relationships before coding
- **Highlight**: Common modeling mistakes to avoid

### Advanced Join Patterns (5 minutes)
- **Show**: Many-to-one and one-to-many relationships
- **Demonstrate**: Multi-hop joins across tables
- **Explain**: Join performance considerations
- **Highlight**: When to denormalize vs. normalize

### Time-Based Modeling (3 minutes)
- **Show**: Date dimension creation and time series
- **Demonstrate**: Time-based measures and calculations
- **Explain**: Granularity considerations for performance
- **Highlight**: Common time-based analytics patterns

## TPC-H Schema Overview

The TPC-H schema represents a simplified order management system with these entities:

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ Region  │◄──►│ Nation  │◄──►│Customer │◄──►│ Orders  │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
                                                   │
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────┴───┐
│ Part    │◄──►│LineItem │◄──►│PartSupp │◄──►│LineItem │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
                                   ▲
┌─────────┐    ┌─────────┐    ┌─────┴───┐
│ Nation  │◄──►│Supplier │◄──►│PartSupp │
└─────────┘    └─────────┘    └─────────┘
```

This represents:
- **Regional hierarchy**: Region → Nation → Customer/Supplier
- **Order lifecycle**: Customer → Orders → LineItems
- **Product catalog**: Parts with supplier relationships
- **Pricing data**: LineItems with detailed transaction information

## Hands-On Exercise: Building the Complete TPC-H Model

### Step 1: Create Customer Cube

Create `model/customer.yml`:

```yaml
cubes:
  - name: customer
    description: Customer information with geographic hierarchy
    
    sql_table: >
      SELECT * FROM read_csv_auto('https://cube-demo-tpch.s3.us-west-2.amazonaws.com/customer.csv')
    
    joins:
      - name: nation
        sql: "{CUBE}.c_nationkey = {nation}.nationkey"
        relationship: many_to_one
    
    dimensions:
      - name: custkey
        description: Unique customer identifier
        sql: c_custkey
        type: number
        primary_key: true
        
      - name: name
        description: Customer name
        sql: c_name
        type: string
        
      - name: address
        description: Customer address
        sql: c_address
        type: string
        
      - name: phone
        description: Customer phone number
        sql: c_phone
        type: string
        
      - name: acctbal
        description: Customer account balance
        sql: c_acctbal
        type: number
        format: currency
        
      - name: mktsegment
        description: Customer market segment
        sql: c_mktsegment
        type: string
        
      - name: comment
        description: Customer comments
        sql: c_comment
        type: string
        
      # Geographic dimensions via joins
      - name: nation_name
        description: Customer nation name
        sql: "{nation}.name"
        type: string
        
      - name: region_name
        description: Customer region name
        sql: "{nation.region}.name"
        type: string
    
    measures:
      - name: count
        description: Total number of customers
        sql: c_custkey
        type: count
        
      - name: total_acctbal
        description: Total customer account balance
        sql: c_acctbal
        type: sum
        format: currency
        
      - name: avg_acctbal
        description: Average customer account balance
        sql: c_acctbal
        type: avg
        format: currency
```

### Step 2: Create Orders Cube

Create `model/orders.yml`:

```yaml
cubes:
  - name: orders
    description: Customer orders with time dimensions
    
    sql_table: >
      SELECT 
        *,
        DATE(o_orderdate) as order_date,
        YEAR(o_orderdate) as order_year,
        MONTH(o_orderdate) as order_month,
        QUARTER(o_orderdate) as order_quarter
      FROM read_csv_auto('https://cube-demo-tpch.s3.us-west-2.amazonaws.com/orders.csv')
    
    joins:
      - name: customer
        sql: "{CUBE}.o_custkey = {customer}.custkey"
        relationship: many_to_one
    
    dimensions:
      - name: orderkey
        description: Unique order identifier
        sql: o_orderkey
        type: number
        primary_key: true
        
      - name: custkey
        description: Customer key for this order
        sql: o_custkey
        type: number
        
      - name: orderstatus
        description: Order status (O, F, P)
        sql: o_orderstatus
        type: string
        
      - name: totalprice
        description: Total order value
        sql: o_totalprice
        type: number
        format: currency
        
      - name: orderdate
        description: Order date
        sql: order_date
        type: time
        
      - name: orderpriority
        description: Order priority level
        sql: o_orderpriority
        type: string
        
      - name: clerk
        description: Order clerk name
        sql: o_clerk
        type: string
        
      - name: shippriority
        description: Shipping priority
        sql: o_shippriority
        type: number
        
      - name: comment
        description: Order comments
        sql: o_comment
        type: string
        
      # Time dimensions
      - name: order_year
        description: Order year
        sql: order_year
        type: number
        
      - name: order_month
        description: Order month
        sql: order_month
        type: number
        
      - name: order_quarter
        description: Order quarter
        sql: order_quarter
        type: number
        
      # Customer dimensions via join
      - name: customer_name
        description: Customer name
        sql: "{customer}.name"
        type: string
        
      - name: customer_segment
        description: Customer market segment
        sql: "{customer}.mktsegment"
        type: string
        
      - name: customer_nation
        description: Customer nation
        sql: "{customer}.nation_name"
        type: string
        
      - name: customer_region
        description: Customer region
        sql: "{customer}.region_name"
        type: string
    
    measures:
      - name: count
        description: Total number of orders
        sql: o_orderkey
        type: count
        
      - name: total_revenue
        description: Total order revenue
        sql: o_totalprice
        type: sum
        format: currency
        
      - name: avg_order_value
        description: Average order value
        sql: o_totalprice
        type: avg
        format: currency
        
      - name: min_order_value
        description: Minimum order value
        sql: o_totalprice
        type: min
        format: currency
        
      - name: max_order_value
        description: Maximum order value
        sql: o_totalprice
        type: max
        format: currency
```

### Step 3: Create LineItem Cube (Fact Table)

Create `model/line_item.yml`:

```yaml
cubes:
  - name: line_item
    description: Order line items - the main fact table
    
    sql_table: >
      SELECT 
        *,
        l_extendedprice * (1 - l_discount) as revenue,
        l_extendedprice * (1 - l_discount) * (1 + l_tax) as total_amount,
        DATE(l_shipdate) as ship_date,
        DATE(l_commitdate) as commit_date,
        DATE(l_receiptdate) as receipt_date
      FROM read_csv_auto('https://cube-demo-tpch.s3.us-west-2.amazonaws.com/lineitem.csv')
    
    joins:
      - name: orders
        sql: "{CUBE}.l_orderkey = {orders}.orderkey"
        relationship: many_to_one
        
      - name: part
        sql: "{CUBE}.l_partkey = {part}.partkey"
        relationship: many_to_one
        
      - name: supplier
        sql: "{CUBE}.l_suppkey = {supplier}.suppkey"
        relationship: many_to_one
    
    dimensions:
      - name: orderkey
        description: Order key
        sql: l_orderkey
        type: number
        
      - name: partkey
        description: Part key
        sql: l_partkey
        type: number
        
      - name: suppkey
        description: Supplier key
        sql: l_suppkey
        type: number
        
      - name: linenumber
        description: Line item number within order
        sql: l_linenumber
        type: number
        
      - name: quantity
        description: Quantity ordered
        sql: l_quantity
        type: number
        
      - name: extendedprice
        description: Extended price (quantity * list price)
        sql: l_extendedprice
        type: number
        format: currency
        
      - name: discount
        description: Discount percentage
        sql: l_discount
        type: number
        format: percent
        
      - name: tax
        description: Tax percentage
        sql: l_tax
        type: number
        format: percent
        
      - name: returnflag
        description: Return flag
        sql: l_returnflag
        type: string
        
      - name: linestatus
        description: Line status
        sql: l_linestatus
        type: string
        
      - name: shipdate
        description: Ship date
        sql: ship_date
        type: time
        
      - name: commitdate
        description: Commit date
        sql: commit_date
        type: time
        
      - name: receiptdate
        description: Receipt date
        sql: receipt_date
        type: time
        
      - name: shipinstruct
        description: Shipping instructions
        sql: l_shipinstruct
        type: string
        
      - name: shipmode
        description: Shipping mode
        sql: l_shipmode
        type: string
        
      # Calculated dimensions
      - name: revenue
        description: Revenue (price after discount)
        sql: revenue
        type: number
        format: currency
        
      - name: total_amount
        description: Total amount (after discount and tax)
        sql: total_amount
        type: number
        format: currency
        
      # Dimensions from joined tables
      - name: order_date
        description: Order date
        sql: "{orders}.orderdate"
        type: time
        
      - name: order_status
        description: Order status
        sql: "{orders}.orderstatus"
        type: string
        
      - name: customer_segment
        description: Customer segment
        sql: "{orders}.customer_segment"
        type: string
        
      - name: customer_region
        description: Customer region
        sql: "{orders}.customer_region"
        type: string
    
    measures:
      - name: count
        description: Total number of line items
        sql: l_linenumber
        type: count
        
      - name: total_quantity
        description: Total quantity ordered
        sql: l_quantity
        type: sum
        
      - name: total_revenue
        description: Total revenue (after discounts)
        sql: revenue
        type: sum
        format: currency
        
      - name: total_amount
        description: Total amount (after discounts and tax)
        sql: total_amount
        type: sum
        format: currency
        
      - name: avg_discount
        description: Average discount percentage
        sql: l_discount
        type: avg
        format: percent
        
      - name: avg_quantity
        description: Average quantity per line item
        sql: l_quantity
        type: avg
        
      - name: avg_extendedprice
        description: Average extended price
        sql: l_extendedprice
        type: avg
        format: currency
```

### Step 4: Create Supporting Cubes

Create `model/part.yml`:

```yaml
cubes:
  - name: part
    description: Parts catalog information
    
    sql_table: >
      SELECT * FROM read_csv_auto('https://cube-demo-tpch.s3.us-west-2.amazonaws.com/part.csv')
    
    dimensions:
      - name: partkey
        description: Unique part identifier
        sql: p_partkey
        type: number
        primary_key: true
        
      - name: name
        description: Part name
        sql: p_name
        type: string
        
      - name: mfgr
        description: Manufacturer
        sql: p_mfgr
        type: string
        
      - name: brand
        description: Part brand
        sql: p_brand
        type: string
        
      - name: type
        description: Part type
        sql: p_type
        type: string
        
      - name: size
        description: Part size
        sql: p_size
        type: number
        
      - name: container
        description: Container type
        sql: p_container
        type: string
        
      - name: retailprice
        description: Retail price
        sql: p_retailprice
        type: number
        format: currency
        
      - name: comment
        description: Part comments
        sql: p_comment
        type: string
    
    measures:
      - name: count
        description: Total number of parts
        sql: p_partkey
        type: count
        
      - name: avg_retailprice
        description: Average retail price
        sql: p_retailprice
        type: avg
        format: currency
```

Create `model/supplier.yml`:

```yaml
cubes:
  - name: supplier
    description: Supplier information
    
    sql_table: >
      SELECT * FROM read_csv_auto('https://cube-demo-tpch.s3.us-west-2.amazonaws.com/supplier.csv')
    
    joins:
      - name: nation
        sql: "{CUBE}.s_nationkey = {nation}.nationkey"
        relationship: many_to_one
    
    dimensions:
      - name: suppkey
        description: Unique supplier identifier
        sql: s_suppkey
        type: number
        primary_key: true
        
      - name: name
        description: Supplier name
        sql: s_name
        type: string
        
      - name: address
        description: Supplier address
        sql: s_address
        type: string
        
      - name: phone
        description: Supplier phone
        sql: s_phone
        type: string
        
      - name: acctbal
        description: Supplier account balance
        sql: s_acctbal
        type: number
        format: currency
        
      - name: comment
        description: Supplier comments
        sql: s_comment
        type: string
        
      - name: nation_name
        description: Supplier nation
        sql: "{nation}.name"
        type: string
        
      - name: region_name
        description: Supplier region
        sql: "{nation.region}.name"
        type: string
    
    measures:
      - name: count
        description: Total number of suppliers
        sql: s_suppkey
        type: count
        
      - name: total_acctbal
        description: Total supplier account balance
        sql: s_acctbal
        type: sum
        format: currency
```

### Step 5: Test Complex Queries

Now test some comprehensive analytics queries in the Playground:

**1. Regional Sales Analysis**:
- Dimensions: `orders.customer_region`, `orders.order_year`
- Measures: `orders.total_revenue`, `orders.count`

**2. Product Performance**:
- Dimensions: `part.brand`, `part.type`
- Measures: `line_item.total_revenue`, `line_item.total_quantity`

**3. Time Series Analysis**:
- Dimensions: `orders.orderdate` (by month)
- Measures: `orders.total_revenue`, `orders.avg_order_value`

**4. Customer Segmentation**:
- Dimensions: `customer.mktsegment`, `customer.region_name`
- Measures: `customer.count`, `customer.avg_acctbal`

## Advanced Modeling Patterns

### 1. Calculated Dimensions
```yaml
- name: profit_margin
  description: Calculated profit margin percentage
  sql: >
    CASE 
      WHEN {extendedprice} > 0 
      THEN (({revenue} - {cost}) / {extendedprice}) * 100
      ELSE 0 
    END
  type: number
  format: percent
```

### 2. Conditional Measures
```yaml
- name: high_value_orders
  description: Count of orders over $10,000
  sql: >
    CASE 
      WHEN {totalprice} > 10000 THEN {orderkey}
      ELSE NULL 
    END
  type: count
```

### 3. Time-Based Calculations
```yaml
- name: days_to_ship
  description: Days between order and ship date
  sql: "DATE_DIFF('day', {orderdate}, {shipdate})"
  type: number
```

### 4. Hierarchical Dimensions
```yaml
# In a real implementation, you might create a Geography cube
- name: geography_hierarchy
  description: Full geographic hierarchy
  sql: >
    CONCAT(
      {region_name}, ' > ', 
      {nation_name}, ' > ', 
      {city}
    )
  type: string
```

## Best Practices Learned

### 1. Schema Design
- **Start with facts**: Begin with transaction/event tables
- **Add dimensions**: Build supporting reference data
- **Plan joins carefully**: Understand cardinality and performance impact

### 2. Naming Conventions
- **Consistent prefixes**: Use table prefixes in source data
- **Descriptive names**: Clear dimension and measure names
- **Avoid abbreviations**: Spell out business terms

### 3. Performance Considerations
- **Limit join depth**: Avoid too many chained joins
- **Consider denormalization**: Sometimes flattening improves performance
- **Use appropriate data types**: Match SQL types to business needs

### 4. Maintainability
- **Document everything**: Use descriptions on all fields
- **Organize logically**: Group related cubes and measures
- **Version control**: Track all schema changes

## Common Pitfalls to Avoid

### 1. Over-joining
**Problem**: Creating joins that aren't needed for analysis
**Solution**: Only join tables that add analytical value

### 2. Inconsistent Granularity
**Problem**: Mixing different levels of detail in one cube
**Solution**: Keep facts at consistent grain, aggregate in measures

### 3. Poor Time Handling
**Problem**: Not properly parsing or formatting date fields
**Solution**: Always convert to proper date types and add time dimensions

### 4. Missing Business Context
**Problem**: Technical field names without business meaning
**Solution**: Always add descriptions and use business-friendly names

## Exercise Validation

By the end of this module, you should have:
- ✅ Complete TPC-H schema with 7 cubes
- ✅ Multi-table joins working correctly
- ✅ Time-based analysis capabilities
- ✅ Calculated measures and dimensions
- ✅ Tested complex analytical queries
- ✅ Geographic hierarchy (region → nation → customer)

## Next Steps

In Module 4, we'll add security and access controls to your data model. You'll learn how to implement row-level security, role-based access, and multi-tenant patterns that are essential for client deployments.