import { sql, pool, poolConnect } from '../DatabaseConfig/DB.js'

export const Register = async (req, res) => {
    const {
        username,
        password,
        UserType,
        EmailID,
        FirstName,
        LastName,
        CompanyName,
        CompanyCode,
        GSTNumber,
        Address,
        City,
        State,
        Country,
        ZIPcode,
        OrgMasterID,
        UserMasterID
    } = req.body;

    // Basic validation
    if (!username || !password || !UserType) {
        return res.status(400).json({ message: 'Username, password, and UserType are required.' });
    }

    try {
        await poolConnect;
        const request = pool.request();
        request.input('username', sql.VarChar, username);
        request.input('password', sql.VarChar, password);
        request.input('Usertype', sql.VarChar, UserType);
        request.input('EmailID', sql.VarChar, EmailID || null);
        request.input('FirstName', sql.VarChar, FirstName || null);
        request.input('LastName', sql.VarChar, LastName || null);
        request.input('CompanyName', sql.VarChar, CompanyName || null);
        request.input('CompanyCode', sql.VarChar, CompanyCode || null);
        request.input('GSTNumber', sql.VarChar, GSTNumber || null);
        request.input('Address', sql.VarChar, Address || null);
        request.input('City', sql.VarChar, City || null);
        request.input('State', sql.VarChar, State || null);
        request.input('Country', sql.VarChar, Country || null);
        request.input('ZIPcode', sql.VarChar, ZIPcode || null);
        request.input('OrgMasterID', sql.Int, typeof OrgMasterID !== 'undefined' ? OrgMasterID : null);
        request.input('UserMasterID', sql.Int, typeof UserMasterID !== 'undefined' ? UserMasterID : null);

        // Insert query (assumes the primary key [id] is auto-increment)
        // Added new fields OrgMasterID and UserMasterID to the insert list
        const insertQuery = `
            INSERT INTO Worktrialusers 
            (username, password, Usertype, EmailID, FirstName, LastName, CompanyName, CompanyCode, GSTNumber, Address, City, State, Country, ZIPcode, OrgMasterID, UserMasterID, created_at, activestatus)
            VALUES (
                @username, @password, @Usertype, @EmailID, @FirstName, @LastName, @CompanyName, @CompanyCode, @GSTNumber, @Address, @City, @State, @Country, @ZIPcode, 
                @OrgMasterID, @UserMasterID, GETDATE(), 1
            )
        `;

        await request.query(insertQuery);

        return res.status(201).json({ message: 'User registered successfully.' });
    } catch (error) {
        console.error('Database error during registration:', error);
        // Respond with the actual error message for transparency
        return res.status(500).json({ 
            message: 'Error during registration',
            error: error.message || error 
        });
    }
}