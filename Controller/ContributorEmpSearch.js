import { sql, pool, poolConnect } from '../DatabaseConfig/DB.js'

export const ContributorEmpSearch = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    // Accept EmployeeCode, Contributor, and Name from request body
    const { EmployeeCode, Contributor, Name } = req.body;

    if (!EmployeeCode && !Contributor && !Name) {
        return res.status(400).json({ message: 'At least one of EmployeeCode, Contributor, or Name is required.' });
    }

    try {
        await poolConnect;
        const request = pool.request();

        let query = `
            SELECT 
                FirstName,
                MiddleName,
                LastName,
                Email,
                MobileNo,
                Department,
                FORMAT(DateOfJoining, 'yyyy-MM-dd') AS DateOfJoining,
                LastPositionHeld,
                FORMAT(DateOfLeaving, 'yyyy-MM-dd') AS DateOfLeaving,
                LastSalaryAnnual,
                EmployeeCode,
                ExitFormalities,
                EmploymentType,
                AnyBehaviourIssue,
                EligibilityToRehire,
                Contributor 
            FROM WorktrailcontributorData
        `;

        let whereClauses = [];
        if (EmployeeCode) {
            request.input('EmployeeCode', sql.VarChar(50), EmployeeCode);
            whereClauses.push('EmployeeCode = @EmployeeCode');
        }
        if (Contributor) {
            request.input('Contributor', sql.VarChar(500), Contributor);
            whereClauses.push('Contributor = @Contributor');
        }
        // Search Name in any of FirstName, MiddleName, LastName fields (partial, case-insensitive)
        if (Name) {
            request.input('Name', sql.VarChar(100), `%${Name}%`);
            whereClauses.push('(FirstName LIKE @Name OR MiddleName LIKE @Name OR LastName LIKE @Name)');
        }

        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        query += ' ORDER BY Createdat DESC';

        const result = await request.query(query);

        return res.status(200).json({
            message: 'Contributor data fetched successfully.',
            data: result.recordset
        });
    } catch (error) {
        console.error('Error fetching contributor data:', error);
        return res.status(500).json({
            message: 'Internal server error.',
            error: error.message || error
        });
    }
}