import { sql, pool, poolConnect } from '../DatabaseConfig/DB.js'

export const ContributorUpdate = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { id, usertype, usermasterid } = req.body;

    if (!id || usertype === undefined || usermasterid === undefined) {
        return res.status(400).json({
            message: "Missing required fields: id, usertype, and usermasterid must be provided in the request body."
        });
    }

    try {
        await poolConnect;
        const request = pool.request();
        request.input('id', sql.Int, id);
        request.input('usertype', sql.VarChar(255), usertype);
        request.input('usermasterid', sql.Int, usermasterid);

        const updateQuery = `
            UPDATE Worktrialusers
            SET UserMasterID = @usermasterid,
                Usertype = @usertype
            WHERE id = @id
        `;

        const result = await request.query(updateQuery);

        if (result.rowsAffected && result.rowsAffected[0] > 0) {
            return res.status(200).json({
                message: 'Contributor user updated successfully.'
            });
        } else {
            return res.status(404).json({
                message: 'No user found with the provided id.'
            });
        }
    } catch (error) {
        console.error('Error updating contributor user:', error);
        return res.status(500).json({
            message: 'Internal server error',
            error: error.message || error
        });
    }
}