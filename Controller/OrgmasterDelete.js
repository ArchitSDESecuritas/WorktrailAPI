import { sql, pool, poolConnect } from '../DatabaseConfig/DB.js'

// POST API to "soft delete" an OrganizationMaster record by setting IsDeleted to 1, based on OrganizationID
export const OrgmasterDelete = async (req, res) => {
    // Extract OrganizationID from request body
    const { OrganizationID } = req.body;

    if (!OrganizationID) {
        return res.status(400).json({ message: 'OrganizationID is required.' });
    }

    try {
        await poolConnect;
        const request = pool.request();
        request.input('OrganizationID', sql.Int, OrganizationID);

        // Update the IsDeleted field to 1 for the specified OrganizationID
        const updateQuery = `
            UPDATE OrganizationMaster 
            SET IsDeleted = 1
            WHERE OrganizationID = @OrganizationID
        `;

        const result = await request.query(updateQuery);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                message: 'Organization not found or already deleted.',
                OrganizationID
            });
        }

        return res.status(200).json({ 
            message: 'Organization deleted (IsDeleted set to 1) successfully.',
            OrganizationID
        });
    } catch (error) {
        console.error('Database error while deleting organization:', error);
        return res.status(500).json({ message: 'Internal server error', error: error.message || error });
    }
}