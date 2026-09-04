import { sql, pool, poolConnect } from '../DatabaseConfig/DB.js'

// POST API to search OrganizationMaster by OrganizationName (LIKE)
export const OrgmasterSearch = async (req, res) => {
    // Extract OrganizationName from request body
    const { OrganizationName } = req.body;

    if (!OrganizationName) {
        return res.status(400).json({ message: 'OrganizationName is required.' });
    }

    try {
        await poolConnect;
        const request = pool.request();
        // Prepare for LIKE search with wildcards and incoming value
        request.input('OrganizationName', sql.VarChar(150), `%${OrganizationName}%`);
        
        // Query to search for OrganizationID and OrganizationName where OrganizationName LIKE '%OrganizationName%'
        const selectQuery = `
            SELECT OrganizationID, OrganizationName 
            FROM OrganizationMaster 
            WHERE OrganizationName LIKE @OrganizationName
        `;

        const result = await request.query(selectQuery);

        // If no records found, inform user
        if (result.recordset.length === 0) {
            return res.status(404).json({
                message: 'No organizations found matching the provided OrganizationName.',
                OrganizationName
            });
        }

        // Return found organizations
        return res.status(200).json({ 
            message: 'Organizations found successfully.',
            organizations: result.recordset
        });
    } catch (error) {
        console.error('Database error while searching organization name:', error);
        return res.status(500).json({ message: 'Internal server error', error: error.message || error });
    }
}