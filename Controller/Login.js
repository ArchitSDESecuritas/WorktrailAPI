import express from 'express'
import { sql, pool, poolConnect } from '../DatabaseConfig/DB.js'
import jwt from 'jsonwebtoken'

const JWT_SECRET = 'your_jwt_secret_key' // Replace with environment variable in production

export const Login = async (req, res) => {
    const { EmailID, password } = req.body;
    if (!EmailID || !password) {
        return res.status(400).json({ 
            message: 'EmailID and password are required.', 
            loginStatus: false 
        });
    }
    try {
        await poolConnect;
        const request = pool.request();
        request.input('EmailID', sql.VarChar, EmailID);
        request.input('password', sql.VarChar, password);
        // Assuming Worktrialusers table with columns: EmailID and password
        const result = await request.query(
            'SELECT * FROM Worktrialusers WHERE EmailID = @EmailID AND password = @password'
        );
        if (result.recordset.length > 0) {
            // Generate JWT token valid for 10 minutes
            const payload = { userId: result.recordset[0].id, EmailID: result.recordset[0].EmailID };
            const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '10m' });
            return res.status(200).json({ 
                message: 'Login successful', 
                user: { 
                    Usertype: result.recordset[0].Usertype, 
                    activestatus: result.recordset[0].activestatus ,
                    CompanyName : result.recordset[0].CompanyName,
                    CompanyCode : result.recordset[0].CompanyCode,
                    username : result.recordset[0].username,
                    UserMasterID : result.recordset[0].UserMasterID,
                    OrgMasterID : result.recordset[0].OrgMasterID
                }, 
                token, 
                loginStatus: true 
            });
       
        } else {
            return res.status(401).json({ 
                message: 'Invalid EmailID or password',
                loginStatus: false
            });
        }
    } catch (error) {
        console.error('Database error during login:', error);
        return res.status(500).json({ 
            message: 'Internal server error',
            loginStatus: false
        });
    }
}