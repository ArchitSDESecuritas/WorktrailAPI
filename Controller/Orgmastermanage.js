import { sql, pool, poolConnect } from '../DatabaseConfig/DB.js'

// POST API to insert new OrganizationMaster record
export const Orgmastermanage = async (req, res) => {
    // Extract OrganizationName and IsDeleted from request body
    const { OrganizationName, IsDeleted } = req.body;

    // Validate required fields
    if (!OrganizationName) {
        return res.status(400).json({ message: 'OrganizationName is required.' });
    }

    // Use provided IsDeleted value or default to 0 (active, not deleted)
    const isDeletedValue = typeof IsDeleted === "undefined" ? 0 : IsDeleted ? 1 : 0;

    try {
        await poolConnect;
        const request = pool.request();
        request.input('OrganizationName', sql.VarChar(150), OrganizationName);
        request.input('IsDeleted', sql.Bit, isDeletedValue);

        // Insert OrganizationMaster record
        // CreatedDateTime will be set automatically (by default value)
        const insertQuery = `
            INSERT INTO OrganizationMaster (OrganizationName, IsDeleted)
            VALUES (@OrganizationName, @IsDeleted)
        `;
        await request.query(insertQuery);

        return res.status(201).json({ 
            message: 'Organization created successfully.',
            OrganizationName,
            IsDeleted: isDeletedValue
        });
    } catch (error) {
        // If error is duplicate PK or other violation
        if (error.number === 2627) {
            return res.status(409).json({ 
                message: 'An organization with the given name already exists.',
                error: error.message || error
            });
        }
        console.error('Database error while creating organization:', error);
        return res.status(500).json({ message: 'Internal server error', error: error.message || error });
    }
}