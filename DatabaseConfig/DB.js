import mssql from 'mssql';

// Database configuration
const dbConfig = {
    user: 'sa',
    password: 'Securitas@1234',
    server: 'BGV_NOI_C006232',
    database: 'WorkTrailApp',
    options: {
        encrypt: false, // Set to true if you are using Azure
        trustServerCertificate: true // change to false for production
    }
};

// Create a database connection pool
const pool = new mssql.ConnectionPool(dbConfig);
const poolConnect = pool.connect();

poolConnect.then(() => {
    console.log('Connected to the MSSQL database');
}).catch(err => {
    console.error('Error connecting to the MSSQL database:', err);
});

// Export the pool for use in other files (ESM syntax)
export { mssql as sql, pool, poolConnect };