# Module 4: Security & Access Control

## Learning Objectives

By the end of this module, you will be able to:

- Implement role-based access control (RBAC) in Cube Cloud
- Configure row-level security for multi-tenant applications
- Set up authentication and authorization patterns
- Design secure data access for different user types
- Apply enterprise security best practices

## Module Overview

**Duration**: 30 minutes  
**Format**: Theory (10 min) → Demo (10 min) → Hands-on Exercise (10 min)

Security is critical for enterprise client deployments. This module covers the essential security patterns you'll implement in production environments.

## Prerequisites

- Completed Module 3: Data Modeling
- Working TPC-H data model with all cubes
- Understanding of user roles and permissions concepts

## Video Demo Outline

*The following topics should be covered in the recorded video demonstration:*

### Security Overview (3 minutes)
- **Show**: Cube Cloud security dashboard
- **Explain**: Authentication vs. authorization concepts
- **Highlight**: Enterprise security requirements
- **Demonstrate**: Security audit logs and monitoring

### Access Control Configuration (4 minutes)
- **Navigate**: Cube Cloud access control interface
- **Show**: Creating user roles and permissions
- **Demonstrate**: API key management
- **Explain**: JWT token configuration

### Row-Level Security Implementation (3 minutes)
- **Show**: Code-based security context implementation
- **Demonstrate**: Dynamic filtering by user attributes
- **Explain**: Multi-tenant data isolation patterns
- **Highlight**: Performance considerations

## Core Security Concepts

### Authentication vs Authorization

**Authentication**: Verifying who the user is
- API keys for service-to-service communication
- JWT tokens for user sessions
- SSO integration (SAML, OAuth2)

**Authorization**: Determining what the user can access
- Role-based permissions
- Row-level security filters
- Column-level access controls

### Security Context

Cube uses a security context to pass user information and apply access controls:

```javascript
module.exports = {
  contextToAppId: ({ securityContext }) => 
    `CUBEJS_APP_${securityContext.tenant_id}`,
  
  contextToOrchestratorId: ({ securityContext }) =>
    `CUBEJS_APP_${securityContext.tenant_id}`,
    
  scheduledRefreshContexts: () => [
    { securityContext: { tenant_id: 'tenant1' } },
    { securityContext: { tenant_id: 'tenant2' } }
  ]
};
```

## Hands-On Exercise: Implementing Security Controls

### Step 1: Configure Security Context

Update your `cube.js` configuration:

```javascript
// cube.js
module.exports = {
  schemaPath: 'model',
  dbType: 'duckdb',
  
  // Security context extraction
  contextToAppId: ({ securityContext }) => {
    return `CUBEJS_APP_${securityContext.user_id || 'default'}`;
  },
  
  // JWT verification (for production)
  checkAuth: async (req, authorization) => {
    // In development, we'll simulate user context
    if (process.env.NODE_ENV === 'development') {
      return {
        user_id: req.headers['x-user-id'] || 'user1',
        role: req.headers['x-user-role'] || 'analyst',
        region: req.headers['x-user-region'] || null,
        tenant_id: req.headers['x-tenant-id'] || 'tenant1'
      };
    }
    
    // Production JWT verification would go here
    const jwt = require('jsonwebtoken');
    const token = authorization.replace('Bearer ', '');
    
    try {
      const decoded = jwt.verify(token, process.env.CUBEJS_API_SECRET);
      return {
        user_id: decoded.sub,
        role: decoded.role,
        region: decoded.region,
        tenant_id: decoded.tenant_id
      };
    } catch (err) {
      throw new Error('Invalid token');
    }
  },
  
  devMode: true,
  apiSecret: process.env.CUBEJS_API_SECRET,
};
```

### Step 2: Implement Row-Level Security

Create `model/security.js` for shared security functions:

```javascript
// model/security.js

// Regional access control
const regionalFilter = (CUBE) => ({
  sql: `${CUBE.customer_region} = {securityContext.region.unsafeValue()}`
});

// Multi-tenant isolation
const tenantFilter = (CUBE) => ({
  sql: `${CUBE.tenant_id} = {securityContext.tenant_id.unsafeValue()}`
});

// Role-based data restrictions
const roleBasedFilter = (CUBE, securityContext) => {
  const { role } = securityContext;
  
  if (role === 'executive') {
    // Executives see all data
    return {};
  } else if (role === 'regional_manager') {
    // Regional managers see only their region
    return regionalFilter(CUBE);
  } else if (role === 'analyst') {
    // Analysts see limited historical data
    return {
      sql: `${CUBE.order_date} >= DATE('now', '-2 years')`
    };
  }
  
  // Default: no access
  return { sql: '1 = 0' };
};

module.exports = {
  regionalFilter,
  tenantFilter,
  roleBasedFilter
};
```

### Step 3: Apply Security to Customer Cube

Update `model/customer.yml` with security context:

```yaml
cubes:
  - name: customer
    description: Customer information with security controls
    
    sql_table: >
      SELECT 
        *,
        'tenant1' as tenant_id
      FROM read_csv_auto('https://cube-demo-tpch.s3.us-west-2.amazonaws.com/customer.csv')
    
    # Row-level security
    sql_where: >
      CASE 
        WHEN {SECURITY_CONTEXT.role.unsafeValue()} = 'executive' THEN 1 = 1
        WHEN {SECURITY_CONTEXT.role.unsafeValue()} = 'regional_manager' 
          AND {SECURITY_CONTEXT.region.unsafeValue()} IS NOT NULL 
        THEN {CUBE}.region_name = {SECURITY_CONTEXT.region.unsafeValue()}
        WHEN {SECURITY_CONTEXT.role.unsafeValue()} = 'analyst' THEN 1 = 1
        ELSE 1 = 0
      END
    
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
        # Hide sensitive data from analysts
        shown: >
          {SECURITY_CONTEXT.role.unsafeValue()} IN ('executive', 'regional_manager')
        
      - name: phone
        description: Customer phone number
        sql: c_phone
        type: string
        shown: >
          {SECURITY_CONTEXT.role.unsafeValue()} IN ('executive', 'regional_manager')
        
      - name: acctbal
        description: Customer account balance
        sql: c_acctbal
        type: number
        format: currency
        
      - name: mktsegment
        description: Customer market segment
        sql: c_mktsegment
        type: string
        
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
        # Only executives can see total balances
        shown: >
          {SECURITY_CONTEXT.role.unsafeValue()} = 'executive'
        
      - name: avg_acctbal
        description: Average customer account balance
        sql: c_acctbal
        type: avg
        format: currency
```

### Step 4: Apply Security to Orders

Update `model/orders.yml`:

```yaml
cubes:
  - name: orders
    description: Customer orders with time-based security
    
    sql_table: >
      SELECT 
        *,
        DATE(o_orderdate) as order_date,
        YEAR(o_orderdate) as order_year,
        MONTH(o_orderdate) as order_month,
        QUARTER(o_orderdate) as order_quarter,
        'tenant1' as tenant_id
      FROM read_csv_auto('https://cube-demo-tpch.s3.us-west-2.amazonaws.com/orders.csv')
    
    # Time-based and role-based security
    sql_where: >
      CASE 
        WHEN {SECURITY_CONTEXT.role.unsafeValue()} = 'executive' THEN 1 = 1
        WHEN {SECURITY_CONTEXT.role.unsafeValue()} = 'regional_manager' THEN 1 = 1
        WHEN {SECURITY_CONTEXT.role.unsafeValue()} = 'analyst' 
        THEN order_date >= DATE('now', '-2 years')
        ELSE 1 = 0
      END
    
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
        description: Order status
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
        shown: >
          {SECURITY_CONTEXT.role.unsafeValue()} IN ('executive', 'regional_manager')
        
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
```

### Step 5: Test Security Controls

Test your security implementation using different user contexts:

**Test as Executive**:
```bash
curl -H "x-user-role: executive" \
     -H "x-user-id: exec1" \
     -G "http://localhost:4000/cubejs-api/v1/load" \
     --data-urlencode 'query={"measures":["customer.total_acctbal"],"dimensions":["customer.region_name"]}'
```

**Test as Regional Manager**:
```bash
curl -H "x-user-role: regional_manager" \
     -H "x-user-region: AMERICA" \
     -H "x-user-id: manager1" \
     -G "http://localhost:4000/cubejs-api/v1/load" \
     --data-urlencode 'query={"measures":["customer.count"],"dimensions":["customer.region_name"]}'
```

**Test as Analyst**:
```bash
curl -H "x-user-role: analyst" \
     -H "x-user-id: analyst1" \
     -G "http://localhost:4000/cubejs-api/v1/load" \
     --data-urlencode 'query={"measures":["orders.count"],"dimensions":["orders.orderdate"],"timeDimensions":[{"dimension":"orders.orderdate","granularity":"month"}]}'
```

### Step 6: Implement Column-Level Security

Create a more sophisticated security model in `model/secure_customer.yml`:

```yaml
cubes:
  - name: secure_customer
    description: Customer with advanced column-level security
    
    sql_table: >
      SELECT 
        c_custkey,
        c_name,
        CASE 
          WHEN {SECURITY_CONTEXT.role.unsafeValue()} IN ('executive', 'regional_manager')
          THEN c_address 
          ELSE 'REDACTED' 
        END as c_address,
        CASE 
          WHEN {SECURITY_CONTEXT.role.unsafeValue()} = 'executive'
          THEN c_phone 
          ELSE CONCAT(LEFT(c_phone, 3), '-XXX-XXXX')
        END as c_phone,
        CASE 
          WHEN {SECURITY_CONTEXT.role.unsafeValue()} = 'executive'
          THEN c_acctbal 
          ELSE NULL 
        END as c_acctbal,
        c_mktsegment,
        c_nationkey
      FROM read_csv_auto('https://cube-demo-tpch.s3.us-west-2.amazonaws.com/customer.csv')
    
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
        
      - name: address
        sql: c_address
        type: string
        
      - name: phone
        sql: c_phone
        type: string
        
      - name: acctbal
        sql: c_acctbal
        type: number
        format: currency
        
      - name: mktsegment
        sql: c_mktsegment
        type: string
        
      - name: nation_name
        sql: "{nation}.name"
        type: string
    
    measures:
      - name: count
        sql: c_custkey
        type: count
```

## Advanced Security Patterns

### 1. Dynamic Multi-Tenancy

```javascript
// cube.js
module.exports = {
  contextToAppId: ({ securityContext }) => 
    `CUBEJS_APP_${securityContext.tenant_id}`,
  
  contextToOrchestratorId: ({ securityContext }) =>
    `CUBEJS_APP_${securityContext.tenant_id}`,
    
  dbType: ({ securityContext }) => 'duckdb',
  
  // Different database per tenant
  driverFactory: ({ securityContext }) => {
    const tenantConfig = getTenantConfig(securityContext.tenant_id);
    return new Database(tenantConfig);
  }
};
```

### 2. Time-Based Access Control

```yaml
# In your cube definition
sql_where: >
  CASE 
    WHEN {SECURITY_CONTEXT.role.unsafeValue()} = 'intern' 
    THEN {CUBE}.order_date >= DATE('now', '-30 days')
    WHEN {SECURITY_CONTEXT.role.unsafeValue()} = 'analyst'
    THEN {CUBE}.order_date >= DATE('now', '-1 year')
    ELSE 1 = 1
  END
```

### 3. Hierarchical Security

```yaml
sql_where: >
  {CUBE}.sales_rep_id IN (
    SELECT emp_id 
    FROM employee_hierarchy 
    WHERE manager_id = {SECURITY_CONTEXT.user_id.unsafeValue()}
    OR emp_id = {SECURITY_CONTEXT.user_id.unsafeValue()}
  )
```

## Enterprise Security Checklist

### Authentication
- ✅ JWT token validation implemented
- ✅ API key management configured
- ✅ SSO integration planned (if required)
- ✅ Token expiration and refresh handled

### Authorization
- ✅ Role-based access control defined
- ✅ Row-level security implemented
- ✅ Column-level security applied
- ✅ Time-based restrictions configured

### Data Protection
- ✅ Sensitive data masked or hidden
- ✅ PII access controls implemented
- ✅ Audit logging enabled
- ✅ Data retention policies applied

### Compliance
- ✅ GDPR/privacy requirements addressed
- ✅ SOC2/ISO27001 controls implemented
- ✅ Access review processes defined
- ✅ Incident response procedures documented

## Best Practices

### Security Context Design
1. **Keep it simple**: Don't over-complicate the security context
2. **Performance-aware**: Security filters should be efficient
3. **Testable**: Easy to test different user scenarios
4. **Maintainable**: Clear patterns that team members can follow

### Production Considerations
1. **JWT validation**: Always verify tokens in production
2. **Error handling**: Don't leak sensitive information in errors
3. **Monitoring**: Log security events and access patterns
4. **Performance**: Monitor query performance with security filters

### Client Communication
1. **Security requirements**: Gather detailed security requirements early
2. **Compliance needs**: Understand regulatory requirements
3. **User roles**: Map business roles to technical permissions
4. **Testing**: Include security testing in your implementation plan

## Common Pitfalls

### 1. Security Context Leakage
**Problem**: Using `unsafeValue()` without proper validation
**Solution**: Always validate security context values

### 2. Performance Impact
**Problem**: Complex security filters slowing queries
**Solution**: Optimize filters and consider pre-aggregations

### 3. Over-Restrictive Access
**Problem**: Making data too hard to access for legitimate users
**Solution**: Balance security with usability

### 4. Inconsistent Enforcement
**Problem**: Different security rules across cubes
**Solution**: Create shared security functions and patterns

## Exercise Validation

By the end of this module, you should have:
- ✅ Security context configuration working
- ✅ Role-based access control implemented
- ✅ Row-level security filtering data correctly
- ✅ Column-level security hiding sensitive fields
- ✅ Different user roles tested and working
- ✅ Security patterns documented for team use

## Next Steps

In Module 5, we'll focus on performance optimization and caching strategies. You'll learn how to implement pre-aggregations, optimize query performance, and monitor your Cube deployment for production workloads.