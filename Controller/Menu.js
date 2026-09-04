import { sql, pool, poolConnect } from '../DatabaseConfig/DB.js'

export const MenuBar = async (req, res) => {
    const { Usertype } = req.body;
    if (!Usertype) {
        return res.status(400).json({ message: 'Usertype is required.' });
    }

    try {
        await poolConnect;
        const request = pool.request();
        request.input('Usertype', sql.VarChar, Usertype);
        const result = await request.query(
            'SELECT * FROM Worktrialroutes WHERE Usertype = @Usertype'
        );
        return res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Database error while fetching routes:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}