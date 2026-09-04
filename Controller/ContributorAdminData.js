import { sql, pool, poolConnect } from '../DatabaseConfig/DB.js'

export const ContributorAdminData = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        await poolConnect;
        const request = pool.request();

        // Get optional filter from query params
        const { companyName } = req.query;

        let query = `
            SELECT id,
                username, 
                password, 
                activestatus,
                Usertype,
                EmailID,
                UserMasterID
            FROM Worktrialusers
            WHERE activestatus = 1
        `;

        // If companyName is provided, filter by CompanyName and exclude UserMasterID = 2
        if (companyName && typeof companyName === "string" && companyName.trim() !== "") {
            query += " AND CompanyName = @CompanyName AND UserMasterID = 3";
            request.input('CompanyName', sql.VarChar, companyName.trim());
        } else {
            // Otherwise, filter for UserMasterID 2 or 3
            query += " AND UserMasterID IN (2, 3)";
        }

        const result = await request.query(query);

        return res.status(200).json({
            message: 'Admin users fetched successfully.',
            data: result.recordset
        });
    } catch (error) {
        console.error('Error fetching admin users:', error);
        return res.status(500).json({
            message: 'Internal server error',
            error: error.message || error
        });
    }
}