# Module 2: Getting Started

## Learning Objectives

By the end of this module, you will be able to:

- Set up a Cube Cloud deployment with optimal configuration
- Connect to the TPC-H sample dataset using DuckDB
- Create your first Cube data models
- Understand the development workflow and best practices
- Generate and test your first API endpoints

## Module Overview

**Duration**: 45 minutes  
**Format**: Demo (15 min) → Hands-on Exercise (25 min) → Review (5 min)

This module gets you hands-on with Cube Cloud, using the TPC-H sample dataset to build your first working analytics API.

## Prerequisites

- Completed Module 1: Foundation
- Access to Cube Cloud account (free trial available)
- Basic understanding of SQL and data modeling concepts

## Video Demo Outline

*The following topics should be covered in the recorded video demonstration:*

### Cloud Setup Walkthrough (8 minutes)
- **Navigate**: Cube Cloud signup and account creation
- **Show**: Region selection considerations
- **Demonstrate**: Creating new deployment
- **Explain**: Development vs Production deployment types
- **Highlight**: Pricing tier selection

### First Data Connection (4 minutes)
- **Show**: DuckDB connector setup
- **Configure**: Connection to TPC-H S3 data
- **Test**: Connection validation
- **Explain**: Data source security best practices

### Development Workflow Introduction (3 minutes)
- **Navigate**: Cube Cloud IDE interface
- **Show**: File structure and schema organization
- **Demonstrate**: Hot reload and development mode
- **Explain**: Git integration and version control

## Hands-On Exercise: Your First Cube Deployment

### Step 1: Create Your Cube Cloud Deployment

1. **Sign up for Cube Cloud** at [cubecloud.dev](https://cubecloud.dev)
   - Use your business email for the trial
   - Select the region closest to your location

2. **Create a new deployment**:
   ```
   Deployment Name: tpch-training
   Deployment Type: Development
   Cloud Provider: AWS (recommended)
   Region: us-west-2 (or closest to you)
   ```

3. **Wait for deployment initialization** (typically 2-3 minutes)

### Step 2: Configure DuckDB Data Source

1. **Navigate to Settings → Data Sources**

2. **Add new data source**:
   ```yaml
   type: duckdb
   name: tpch_duckdb
   ```

3. **Configure the connection** in your `cube.js` file:

```javascript
// cube.js
module.exports = {
  schemaPath: 'model',
  dbType: 'duckdb',
  
  // External data source configuration
  externalDbType: 'duckdb',
  externalDriverFactory: () => require('duckdb'),
  
  driverFactory: () => require('duckdb'),
  
  // Development mode settings
  devMode: true,
  apiSecret: process.env.CUBEJS_API_SECRET,
};
```

### Step 3: Create Your First Cube Model

Create a new file `model/nation.yml` with our first data model:

```yaml
cubes:
  - name: nation
    description: Country information from TPC-H dataset
    
    sql_table: >
      SELECT * FROM read_csv_auto('https://cube-demo-tpch.s3.us-west-2.amazonaws.com/nation.csv')
    
    joins: []
    
    dimensions:
      - name: nationkey
        description: Unique identifier for the nation
        sql: nationkey
        type: number
        primary_key: true
        
      - name: name
        description: Nation name
        sql: name
        type: string
        
      - name: regionkey
        description: Foreign key to region
        sql: regionkey
        type: number
        
      - name: comment
        description: Nation description
        sql: comment
        type: string
    
    measures:
      - name: count
        description: Total number of nations
        sql: nationkey
        type: count
```

### Step 4: Test Your First Model

1. **Navigate to the Cube Cloud Playground**

2. **Build your first query**:
   - Select the `nation` cube
   - Add the `name` dimension
   - Add the `count` measure
   - Click "Run Query"

3. **Expected result**: You should see 25 nations with a count of 1 each

4. **Try the API**: Copy the generated API query and test it

### Step 5: Add Region Data Model

Create `model/region.yml`:

```yaml
cubes:
  - name: region
    description: Regional information from TPC-H dataset
    
    sql_table: >
      SELECT * FROM read_csv_auto('https://cube-demo-tpch.s3.us-west-2.amazonaws.com/region.csv')
    
    joins: []
    
    dimensions:
      - name: regionkey
        description: Unique identifier for the region
        sql: regionkey
        type: number
        primary_key: true
        
      - name: name
        description: Region name
        sql: name
        type: string
        
      - name: comment
        description: Region description
        sql: comment
        type: string
    
    measures:
      - name: count
        description: Total number of regions
        sql: regionkey
        type: count
```

### Step 6: Create Your First Join

Update `nation.yml` to include a join to region:

```yaml
cubes:
  - name: nation
    description: Country information from TPC-H dataset
    
    sql_table: >
      SELECT * FROM read_csv_auto('https://cube-demo-tpch.s3.us-west-2.amazonaws.com/nation.csv')
    
    joins:
      - name: region
        sql: "{CUBE}.regionkey = {region}.regionkey"
        relationship: many_to_one
    
    dimensions:
      - name: nationkey
        description: Unique identifier for the nation
        sql: nationkey
        type: number
        primary_key: true
        
      - name: name
        description: Nation name
        sql: name
        type: string
        
      - name: regionkey
        description: Foreign key to region
        sql: regionkey
        type: number
        
      - name: region_name
        description: Region name from joined table
        sql: "{region}.name"
        type: string
        
      - name: comment
        description: Nation description
        sql: comment
        type: string
    
    measures:
      - name: count
        description: Total number of nations
        sql: nationkey
        type: count
```

### Step 7: Test the Join

1. **Return to the Playground**
2. **Build a query using**:
   - `nation.region_name` dimension
   - `nation.count` measure
3. **Verify**: You should see nations grouped by their region names

## Key Concepts Learned

### DuckDB Integration
DuckDB provides an excellent development experience because:
- **No database setup required**: Works directly with CSV files
- **High performance**: Optimized for analytical workloads
- **S3 integration**: Can read directly from public S3 buckets
- **SQL compatibility**: Standard SQL syntax

### Cube Model Structure
Every Cube model includes:
- **sql_table**: The data source (can be table name or SQL query)
- **dimensions**: Attributes for grouping and filtering
- **measures**: Aggregatable metrics
- **joins**: Relationships between cubes

### Development Workflow
1. **Create/modify** YAML model files
2. **Hot reload** automatically updates the API
3. **Test** in the Playground
4. **Generate** API calls for frontend integration

## Common Issues & Solutions

### Connection Errors
**Problem**: "Cannot connect to DuckDB"
**Solution**: Verify the S3 URLs are accessible and CSV format is correct

### Schema Validation Errors
**Problem**: "Invalid YAML syntax"
**Solution**: Check indentation and YAML formatting in your model files

### Query Performance
**Problem**: Slow query responses
**Solution**: We'll cover pre-aggregations and optimization in Module 5

## Development Best Practices

### File Organization
```
model/
├── dimensions/     # Shared dimension definitions
├── measures/       # Shared measure definitions
├── nation.yml      # Individual cube files
├── region.yml
└── customer.yml
```

### Naming Conventions
- **Cubes**: snake_case (e.g., `customer_orders`)
- **Dimensions/Measures**: snake_case (e.g., `order_date`)
- **Files**: snake_case matching cube name

### Version Control
- Commit model changes frequently
- Use descriptive commit messages
- Test in development before promoting to production

## Next Steps

In Module 3, we'll expand your TPC-H data model to include customers, orders, and line items. You'll learn advanced modeling patterns, complex joins, and how to handle time-series data effectively.

## Exercise Validation

By the end of this exercise, you should have:
- ✅ Working Cube Cloud deployment
- ✅ Connected DuckDB data source
- ✅ Two cube models (nation and region)
- ✅ Functional join between cubes
- ✅ Tested queries in the Playground
- ✅ Generated API endpoints

If you're missing any of these, review the steps above or reach out for support.