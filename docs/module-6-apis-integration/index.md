# Module 6: APIs & Integration

## Learning Objectives

By the end of this module, you will be able to:

- Connect popular BI tools (Tableau, Power BI, Excel) to Cube
- Build custom applications using REST and GraphQL APIs
- Implement embedded analytics in web applications
- Configure SQL API for broad tool compatibility
- Design integration patterns for different client scenarios

## Module Overview

**Duration**: 60 minutes  
**Format**: Demo (20 min) → Hands-on Exercise (35 min) → Integration Planning (5 min)

This module demonstrates Cube's flexibility by connecting it to multiple tools and building custom integrations using your TPC-H data model.

## Prerequisites

- Completed Module 5: Performance & Caching
- Working TPC-H data model with pre-aggregations
- Basic understanding of APIs and SQL

## Video Demo Outline

*The following topics should be covered in the recorded video demonstration:*

### API Overview (5 minutes)
- **Show**: All available Cube APIs (REST, GraphQL, SQL, MDX)
- **Explain**: When to use each API type
- **Demonstrate**: API documentation and testing
- **Highlight**: Authentication and security considerations

### BI Tool Connections (8 minutes)
- **Demonstrate**: Tableau connection via SQL API
- **Show**: Power BI integration with Excel add-in
- **Navigate**: Google Sheets connector setup
- **Explain**: MDX API for Excel pivot tables
- **Highlight**: Performance considerations for BI tools

### Custom Application Development (7 minutes)
- **Show**: REST API query building
- **Demonstrate**: GraphQL API advantages
- **Code**: Simple React dashboard example
- **Explain**: Real-time vs cached data strategies
- **Highlight**: Error handling and fallbacks

## Cube API Overview

Cube provides multiple APIs to serve different integration needs:

### REST API
- **Best for**: Custom applications, programmatic access
- **Endpoint**: `https://your-deployment.cubecloud.dev/cubejs-api/v1/load`
- **Format**: JSON queries and responses
- **Features**: Full query capabilities, metadata access

### GraphQL API  
- **Best for**: Modern web applications, type-safe clients
- **Endpoint**: `https://your-deployment.cubecloud.dev/cubejs-api/graphql`
- **Format**: GraphQL schema and queries
- **Features**: Type safety, query introspection

### SQL API
- **Best for**: BI tools, SQL-familiar users
- **Endpoint**: `https://your-deployment.cubecloud.dev/cubejs-api/sql`
- **Format**: Standard SQL queries
- **Features**: JDBC/ODBC compatibility, broad tool support

### MDX API (Cube Cloud)
- **Best for**: Excel, Power BI native connections
- **Endpoint**: `https://your-deployment.cubecloud.dev/mdx`
- **Format**: MDX (Multi-Dimensional Expressions)
- **Features**: OLAP-style querying, pivot table support

## Hands-On Exercise: Multi-Tool Integration

### Step 1: Test REST API

First, let's test the REST API with various query patterns:

```bash
# Basic query
curl -G "https://your-deployment.cubecloud.dev/cubejs-api/v1/load" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  --data-urlencode 'query={
    "measures": ["orders.total_revenue"],
    "dimensions": ["orders.customer_region"]
  }'

# Time series query
curl -G "https://your-deployment.cubecloud.dev/cubejs-api/v1/load" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  --data-urlencode 'query={
    "measures": ["orders.total_revenue", "orders.count"],
    "timeDimensions": [{
      "dimension": "orders.orderdate",
      "granularity": "month",
      "dateRange": ["2023-01-01", "2024-12-31"]
    }]
  }'

# Complex filtered query
curl -G "https://your-deployment.cubecloud.dev/cubejs-api/v1/load" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  --data-urlencode 'query={
    "measures": ["line_item.total_revenue"],
    "dimensions": ["orders.customer_segment", "part.brand"],
    "filters": [{
      "member": "orders.customer_region",
      "operator": "equals",
      "values": ["AMERICA"]
    }],
    "order": {
      "line_item.total_revenue": "desc"
    },
    "limit": 10
  }'
```

### Step 2: Build a Simple React Dashboard

Create a basic React application to visualize your data:

```jsx
// components/SalesDashboard.jsx
import React, { useState, useEffect } from 'react';
import cubejs from '@cubejs-client/core';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const cubeApi = cubejs(
  'YOUR_API_TOKEN',
  { apiUrl: 'https://your-deployment.cubecloud.dev/cubejs-api/v1' }
);

export default function SalesDashboard() {
  const [salesData, setSalesData] = useState([]);
  const [regionData, setRegionData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Monthly sales trend
      const salesQuery = {
        measures: ['orders.total_revenue', 'orders.count'],
        timeDimensions: [{
          dimension: 'orders.orderdate',
          granularity: 'month',
          dateRange: ['2023-01-01', '2024-12-31']
        }]
      };

      // Regional breakdown
      const regionQuery = {
        measures: ['orders.total_revenue'],
        dimensions: ['orders.customer_region']
      };

      const [salesResult, regionResult] = await Promise.all([
        cubeApi.load(salesQuery),
        cubeApi.load(regionQuery)
      ]);

      setSalesData(salesResult.tablePivot());
      setRegionData(regionResult.tablePivot());
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div className="dashboard">
      <h1>Sales Analytics Dashboard</h1>
      
      <div className="charts-container">
        <div className="chart">
          <h2>Monthly Sales Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="orders.orderdate.month" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="orders.total_revenue" 
                stroke="#8884d8" 
                strokeWidth={2} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart">
          <h2>Sales by Region</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={regionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="orders.customer_region" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="orders.total_revenue" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
```

```jsx
// App.js
import React from 'react';
import SalesDashboard from './components/SalesDashboard';
import './App.css';

function App() {
  return (
    <div className="App">
      <SalesDashboard />
    </div>
  );
}

export default App;
```

```css
/* App.css */
.dashboard {
  padding: 20px;
  font-family: Arial, sans-serif;
}

.charts-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-top: 20px;
}

.chart {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  background: white;
}

.chart h2 {
  margin-top: 0;
  color: #333;
}

@media (max-width: 768px) {
  .charts-container {
    grid-template-columns: 1fr;
  }
}
```

### Step 3: Connect to Tableau

1. **Enable SQL API** in your Cube Cloud deployment:
   - Navigate to Settings → SQL API
   - Enable the SQL API endpoint
   - Note the connection details

2. **Configure Tableau connection**:
   ```
   Server: your-deployment.cubecloud.dev
   Port: 443
   Database: cube
   Authentication: Username and Password
   Username: cube
   Password: YOUR_API_TOKEN
   Require SSL: Yes
   ```

3. **Create a Tableau workbook**:
   - Connect to the Cube SQL API
   - Import your cubes as tables
   - Build visualizations using familiar Tableau interface

4. **Sample Tableau calculations**:
   ```sql
   -- Custom field for growth rate
   (SUM([orders total_revenue]) - LOOKUP(SUM([orders total_revenue]), -1)) 
   / LOOKUP(SUM([orders total_revenue]), -1)
   
   -- Year-over-year comparison
   SUM([orders total_revenue]) - 
   SUM(IF YEAR([orders orderdate]) = YEAR(TODAY()) - 1 
       THEN [orders total_revenue] END)
   ```

### Step 4: Excel Integration

1. **Install Cube Excel Add-in** (if available) or use SQL connection

2. **Connect via SQL**:
   - Data → Get Data → From Other Sources → From ODBC
   - Use Cube Cloud SQL API connection string
   - Import your cubes as Excel tables

3. **Create pivot tables**:
   ```
   Data Source: Cube Cloud SQL API
   Rows: Customer Region
   Columns: Order Year
   Values: Total Revenue (Sum)
   Filters: Customer Segment
   ```

4. **Power Query example**:
   ```sql
   -- Custom Power Query for Excel
   SELECT 
     customer_region,
     DATE_TRUNC('month', orderdate) as order_month,
     SUM(total_revenue) as monthly_revenue
   FROM orders
   WHERE orderdate >= DATE('2023-01-01')
   GROUP BY customer_region, DATE_TRUNC('month', orderdate)
   ORDER BY order_month DESC
   ```

### Step 5: Power BI Integration

1. **Connect to Cube via SQL API**:
   - Get Data → More → Database → ODBC
   - Use Cube Cloud connection details
   - Import mode vs DirectQuery considerations

2. **Create Power BI measures**:
   ```dax
   # Total Revenue
   Total Revenue = SUM(orders[total_revenue])
   
   # Previous Month Revenue
   Previous Month Revenue = 
   CALCULATE(
     [Total Revenue],
     PREVIOUSMONTH(orders[orderdate])
   )
   
   # Revenue Growth %
   Revenue Growth % = 
   DIVIDE([Total Revenue] - [Previous Month Revenue], [Previous Month Revenue], 0)
   
   # Top 10 Customers
   Top 10 Customers Revenue = 
   CALCULATE(
     [Total Revenue],
     TOPN(10, VALUES(customer[name]), [Total Revenue])
   )
   ```

3. **Build Power BI dashboard**:
   - Sales trend line chart
   - Regional performance map
   - Customer segment donut chart
   - KPI cards for key metrics

### Step 6: GraphQL API Usage

Test the GraphQL API for type-safe queries:

```graphql
# Get available cubes and their measures
query GetSchema {
  cubes {
    name
    measures {
      name
      type
      description
    }
    dimensions {
      name
      type
      description
    }
  }
}

# Sales data with GraphQL
query GetSalesData {
  cube(
    measures: ["orders.total_revenue", "orders.count"]
    dimensions: ["orders.customer_region"]
    timeDimensions: [{
      dimension: "orders.orderdate"
      granularity: "month"
      dateRange: ["2023-01-01", "2024-12-31"]
    }]
  ) {
    tablePivot {
      orders__customer_region
      orders__orderdate__month
      orders__total_revenue
      orders__count
    }
  }
}
```

### Step 7: Embedded Analytics Component

Create a reusable analytics component:

```jsx
// components/EmbeddedAnalytics.jsx
import React, { useState, useEffect } from 'react';
import cubejs from '@cubejs-client/core';

const EmbeddedAnalytics = ({ 
  query, 
  chartType = 'table',
  apiToken,
  apiUrl 
}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cubeApi = cubejs(apiToken, { apiUrl });

  useEffect(() => {
    loadData();
  }, [query]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await cubeApi.load(query);
      setData(result.tablePivot());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderChart = () => {
    switch (chartType) {
      case 'table':
        return (
          <table className="analytics-table">
            <thead>
              <tr>
                {Object.keys(data[0] || {}).map(key => (
                  <th key={key}>{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index}>
                  {Object.values(row).map((value, i) => (
                    <td key={i}>{value}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        );
      
      case 'kpi':
        const kpiValue = data[0] && Object.values(data[0])[0];
        return (
          <div className="kpi-card">
            <div className="kpi-value">{kpiValue}</div>
            <div className="kpi-label">{query.measures[0]}</div>
          </div>
        );
      
      default:
        return <div>Chart type not supported</div>;
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data.length) return <div>No data available</div>;

  return (
    <div className="embedded-analytics">
      {renderChart()}
    </div>
  );
};

// Usage example
const CustomerDashboard = () => {
  const queries = {
    totalRevenue: {
      measures: ['orders.total_revenue']
    },
    monthlyTrend: {
      measures: ['orders.total_revenue'],
      timeDimensions: [{
        dimension: 'orders.orderdate',
        granularity: 'month'
      }]
    },
    topRegions: {
      measures: ['orders.total_revenue'],
      dimensions: ['orders.customer_region'],
      order: { 'orders.total_revenue': 'desc' },
      limit: 5
    }
  };

  return (
    <div className="customer-dashboard">
      <h1>Customer Analytics</h1>
      
      <div className="kpi-section">
        <EmbeddedAnalytics 
          query={queries.totalRevenue}
          chartType="kpi"
          apiToken="YOUR_TOKEN"
          apiUrl="https://your-deployment.cubecloud.dev/cubejs-api/v1"
        />
      </div>
      
      <div className="table-section">
        <h2>Top Regions by Revenue</h2>
        <EmbeddedAnalytics 
          query={queries.topRegions}
          chartType="table"
          apiToken="YOUR_TOKEN"
          apiUrl="https://your-deployment.cubecloud.dev/cubejs-api/v1"
        />
      </div>
    </div>
  );
};

export default EmbeddedAnalytics;
```

## Integration Patterns

### 1. Real-time Dashboards

```javascript
// WebSocket integration for real-time updates
import io from 'socket.io-client';

const RealtimeDashboard = () => {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    const socket = io('wss://your-deployment.cubecloud.dev');
    
    socket.on('dataUpdate', (newData) => {
      setData(prevData => [...prevData, newData]);
    });
    
    return () => socket.disconnect();
  }, []);

  // Component implementation
};
```

### 2. Multi-tenant Embedded Analytics

```jsx
// Tenant-aware analytics component
const TenantAnalytics = ({ tenantId, userRole }) => {
  const cubeApi = cubejs(
    apiToken,
    { 
      apiUrl: 'https://your-deployment.cubecloud.dev/cubejs-api/v1',
      headers: {
        'x-tenant-id': tenantId,
        'x-user-role': userRole
      }
    }
  );

  // Component uses tenant-specific security context
};
```

### 3. API Rate Limiting and Caching

```javascript
// Client-side caching strategy
import LRU from 'lru-cache';

const queryCache = new LRU({
  max: 100,
  maxAge: 1000 * 60 * 5 // 5 minutes
});

const cachedCubeApi = {
  load: async (query) => {
    const queryKey = JSON.stringify(query);
    
    if (queryCache.has(queryKey)) {
      return queryCache.get(queryKey);
    }
    
    const result = await cubeApi.load(query);
    queryCache.set(queryKey, result);
    return result;
  }
};
```

## Integration Best Practices

### API Usage

1. **Authentication**: Always use secure token management
2. **Error handling**: Implement robust error handling and retries
3. **Caching**: Cache responses appropriately for your use case
4. **Rate limiting**: Respect API rate limits and implement backoff

### Performance

1. **Query optimization**: Use filters and limits to reduce data transfer
2. **Pre-aggregations**: Leverage pre-aggregations for better performance
3. **Pagination**: Implement pagination for large datasets
4. **Compression**: Enable gzip compression for API responses

### Security

1. **Token security**: Store API tokens securely, rotate regularly
2. **HTTPS only**: Always use HTTPS for API communications
3. **Input validation**: Validate all user inputs before sending to API
4. **Access control**: Implement proper user authorization

### Monitoring

1. **API metrics**: Monitor API usage, response times, error rates
2. **User analytics**: Track which queries and dashboards are most used
3. **Performance monitoring**: Monitor client-side performance
4. **Error tracking**: Implement comprehensive error logging

## Client Integration Scenarios

### Scenario 1: BI Tool Migration

**Client**: Large enterprise moving from legacy BI to modern stack
**Solution**: 
- SQL API for existing Tableau/Power BI dashboards
- Gradual migration with parallel systems
- Training on new Cube-powered features

### Scenario 2: Embedded Analytics Product

**Client**: SaaS company adding analytics to their application
**Solution**:
- REST/GraphQL API integration
- Multi-tenant security implementation
- White-label dashboard components

### Scenario 3: Self-Service Analytics

**Client**: Organization wanting to democratize data access
**Solution**:
- SQL API for business users
- Excel/Google Sheets integrations
- Self-service dashboard builder

### Scenario 4: Real-time Operations Dashboard

**Client**: Operations team needing real-time monitoring
**Solution**:
- WebSocket or polling-based updates
- Custom React/Vue.js dashboard
- Mobile-responsive design

## Exercise Validation

By the end of this module, you should have:
- ✅ Successfully connected to all major APIs (REST, GraphQL, SQL)
- ✅ Built a working React dashboard component
- ✅ Connected at least one BI tool (Tableau, Power BI, or Excel)
- ✅ Implemented basic error handling and caching
- ✅ Understanding of integration patterns for different scenarios
- ✅ API security and authentication working correctly

## Next Steps

In Module 7, we'll explore advanced concepts including dynamic data modeling, complex analytics patterns, and real-world implementation strategies that will prepare you to handle sophisticated client requirements.