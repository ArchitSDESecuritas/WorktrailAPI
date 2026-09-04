import { sql, pool, poolConnect } from '../DatabaseConfig/DB.js'

// GET API to retrieve all OrganizationMaster records, ordered by first column descending
export const OrgmasterData = async (req, res) => {
    try {
        await poolConnect;
        const request = pool.request();

        const selectQuery = `
            select OrganizationID,OrganizationName from OrganizationMaster where IsDeleted='0' order by 1 desc
        `;

        const result = await request.query(selectQuery);

        return res.status(200).json({
            message: 'Organizations retrieved successfully.',
            data: result.recordset
        });
    } catch (error) {
        console.error('Database error while retrieving organizations:', error);
        return res.status(500).json({ message: 'Internal server error', error: error.message || error });
    }
}