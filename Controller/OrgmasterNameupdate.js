import { sql, pool, poolConnect } from '../DatabaseConfig/DB.js'

// POST API to update OrganizationName for a given OrganizationID
export const OrgmasterNameUpdate = async (req, res) => {
    // Extract OrganizationID and new OrganizationName from request body
    const { OrganizationID, OrganizationName } = req.body;

    if (!OrganizationID) {
        return res.status(400).json({ message: 'OrganizationID is required.' });
    }
    if (!OrganizationName) {
        return res.status(400).json({ message: 'OrganizationName is required.' });
    }

    try {
        await poolConnect;
        const request = pool.request();
        request.input('OrganizationID', sql.Int, OrganizationID);
        request.input('OrganizationName', sql.VarChar(150), OrganizationName);

        // Update the OrganizationName for the specified OrganizationID
        const updateQuery = `
            UPDATE OrganizationMaster 
            SET OrganizationName = @OrganizationName
            WHERE OrganizationID = @OrganizationID
        `;

        const result = await request.query(updateQuery);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                message: 'Organization not found.',
                OrganizationID
            });
        }

        return res.status(200).json({ 
            message: 'Organization name updated successfully.',
            OrganizationID,
            OrganizationName
        });
    } catch (error) {
        console.error('Database error while updating organization name:', error);
        return res.status(500).json({ message: 'Internal server error', error: error.message || error });
    }
}