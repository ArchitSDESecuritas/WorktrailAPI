import { sql, pool, poolConnect } from '../DatabaseConfig/DB.js'

export const ContributorDelete = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    // id and activestatus come from API (req.body)
    const { id, activestatus } = req.body;

    if (!id || activestatus === undefined) {
        return res.status(400).json({
            message: "Missing required fields: id and activestatus must be provided in the request body."
        });
    }

    try {
        await poolConnect;
        const request = pool.request();
        request.input('id', sql.Int, id);
        request.input('activestatus', sql.VarChar(50), activestatus);

        const updateQuery = `
            UPDATE Worktrialusers
            SET activestatus = @activestatus
            WHERE id = @id
        `;

        const result = await request.query(updateQuery);

        if (result.rowsAffected && result.rowsAffected[0] > 0) {
            return res.status(200).json({
                message: 'Contributor user activestatus updated successfully.'
            });
        } else {
            return res.status(404).json({
                message: 'No user found with the provided id.'
            });
        }
    } catch (error) {
        console.error('Error updating contributor user activestatus:', error);
        return res.status(500).json({
            message: 'Internal server error',
            error: error.message || error
        });
    }
}