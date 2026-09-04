import { sql, pool, poolConnect } from '../DatabaseConfig/DB.js'

// POST API handler for inserting or updating contributor records in WorktrailcontributorData, 
// and logging all submissions to WorktrailcontributorDataLog
export const ContributorData = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    // Support either a single object or an array of objects
    let contributors = req.body;
    if (!Array.isArray(contributors)) {
        contributors = [contributors];
    }

    // Validate all contributors
    let allMissingFields = [];
    let hasValidationError = false;

    contributors.forEach((contributor, idx) => {
        const missingFields = [];
        if (!contributor.FirstName) missingFields.push('FirstName');
        if (!contributor.LastName) missingFields.push('LastName');
        if (!contributor.Department) missingFields.push('Department');
        if (!contributor.DateOfJoining) missingFields.push('DateOfJoining');
        if (!contributor.LastPositionHeld) missingFields.push('LastPositionHeld');
        if (!contributor.DateOfLeaving) missingFields.push('DateOfLeaving');
        if (!contributor.EmployeeCode) missingFields.push('EmployeeCode');
        if (!contributor.Contributor) missingFields.push('Contributor');
        if (missingFields.length > 0) {
            allMissingFields.push({
                index: idx,
                missingFields
            });
            hasValidationError = true;
        }
    });

    if (hasValidationError) {
        return res.status(400).json({
            message: "Some contributor entries have missing required fields.",
            missingFields: allMissingFields
        });
    }

    try {
        await poolConnect;

        const results = [];
        for (let i = 0; i < contributors.length; i++) {
            const c = contributors[i];
            const now = new Date();

            // Always insert into the log table
            const logRequest = pool.request();
            logRequest.input('FirstName', sql.VarChar(100), c.FirstName);
            logRequest.input('MiddleName', sql.VarChar(100), c.MiddleName || null);
            logRequest.input('LastName', sql.VarChar(100), c.LastName);
            logRequest.input('Email', sql.VarChar(255), c.Email || null);
            logRequest.input('MobileNo', sql.VarChar(20), c.MobileNo || null);
            logRequest.input('Department', sql.VarChar(100), c.Department);
            logRequest.input('DateOfJoining', sql.Date, c.DateOfJoining);
            logRequest.input('LastPositionHeld', sql.VarChar(150), c.LastPositionHeld);
            logRequest.input('DateOfLeaving', sql.Date, c.DateOfLeaving);
            logRequest.input('LastSalaryAnnual', sql.Decimal(18, 2), c.LastSalaryAnnual || null);
            logRequest.input('EmployeeCode', sql.VarChar(50), c.EmployeeCode);
            logRequest.input('ExitFormalities', sql.VarChar(255), c.ExitFormalities || null);
            logRequest.input('EmploymentType', sql.VarChar(50), c.EmploymentType || null);
            logRequest.input('AnyBehaviourIssue', sql.VarChar(255), c.AnyBehaviourIssue || null);
            logRequest.input('EligibilityToRehire', sql.VarChar(50), c.EligibilityToRehire || null);
            logRequest.input('Contributor', sql.VarChar(500), c.Contributor);
            logRequest.input('CreatedAt', sql.DateTime, now);
            logRequest.input('CreatedBy', sql.VarChar(100), c.CreatedBy || null);

            const logInsertQuery = `
                INSERT INTO WorktrailcontributorDataLog (
                    FirstName, MiddleName, LastName, Email, MobileNo, Department,
                    DateOfJoining, LastPositionHeld, DateOfLeaving, LastSalaryAnnual,
                    EmployeeCode, ExitFormalities, EmploymentType, AnyBehaviourIssue, EligibilityToRehire, Contributor,
                    CreatedAt, CreatedBy
                )
                VALUES (
                    @FirstName, @MiddleName, @LastName, @Email, @MobileNo, @Department,
                    @DateOfJoining, @LastPositionHeld, @DateOfLeaving, @LastSalaryAnnual,
                    @EmployeeCode, @ExitFormalities, @EmploymentType, @AnyBehaviourIssue, @EligibilityToRehire, @Contributor,
                    @CreatedAt, @CreatedBy
                )
            `;
            try {
                await logRequest.query(logInsertQuery);
            } catch (logErr) {
                // Logging errors should not break main flow
                if (
                    logErr.originalError &&
                    logErr.originalError.info &&
                    logErr.originalError.info.number === 2627 // Duplicate (if log is not pure history)
                ) {
                    // Optional: silently ignore
                } else {
                    console.error("Error inserting into contributor log table", logErr);
                }
            }

            // New logic:
            // 1. Check if (EmployeeCode, Contributor) exists - update if so.
            // 2. Else, check if EmployeeCode exists (should be unique) - block if so.
            // 3. Else, insert (Contributor can be duplicate).

            let existsExact = false;
            let record = null;
            let conflictField = null;

            // 1. Check if both EmployeeCode and Contributor match exactly in a row
            let checkExactRequest = pool.request();
            checkExactRequest.input('EmployeeCode', sql.VarChar(50), c.EmployeeCode);
            checkExactRequest.input('Contributor', sql.VarChar(500), c.Contributor);
            const checkExactQuery = `
                SELECT TOP 1 * FROM WorktrailcontributorData WHERE EmployeeCode = @EmployeeCode AND Contributor = @Contributor
            `;
            try {
                const checkExactResult = await checkExactRequest.query(checkExactQuery);
                if (checkExactResult.recordset.length > 0) {
                    existsExact = true;
                    record = checkExactResult.recordset[0];
                }
            } catch (err) {
                results.push({
                    index: i,
                    status: 'fail',
                    message: "Failed to check for existing contributor data (EmployeeCode AND Contributor).",
                    error: err.message || err
                });
                continue;
            }

            const mainRequest = pool.request();
            mainRequest.input('FirstName', sql.VarChar(100), c.FirstName);
            mainRequest.input('MiddleName', sql.VarChar(100), c.MiddleName || null);
            mainRequest.input('LastName', sql.VarChar(100), c.LastName);
            mainRequest.input('Email', sql.VarChar(255), c.Email || null);
            mainRequest.input('MobileNo', sql.VarChar(20), c.MobileNo || null);
            mainRequest.input('Department', sql.VarChar(100), c.Department);
            mainRequest.input('DateOfJoining', sql.Date, c.DateOfJoining);
            mainRequest.input('LastPositionHeld', sql.VarChar(150), c.LastPositionHeld);
            mainRequest.input('DateOfLeaving', sql.Date, c.DateOfLeaving);
            mainRequest.input('LastSalaryAnnual', sql.Decimal(18, 2), c.LastSalaryAnnual || null);
            mainRequest.input('EmployeeCode', sql.VarChar(50), c.EmployeeCode);
            mainRequest.input('ExitFormalities', sql.VarChar(255), c.ExitFormalities || null);
            mainRequest.input('EmploymentType', sql.VarChar(50), c.EmploymentType || null);
            mainRequest.input('AnyBehaviourIssue', sql.VarChar(255), c.AnyBehaviourIssue || null);
            mainRequest.input('EligibilityToRehire', sql.VarChar(50), c.EligibilityToRehire || null);
            mainRequest.input('Contributor', sql.VarChar(500), c.Contributor);

            if (existsExact) {
                // Update using both EmployeeCode and Contributor
                const updateQuery = `
                    UPDATE WorktrailcontributorData SET
                        FirstName = @FirstName,
                        MiddleName = @MiddleName,
                        LastName = @LastName,
                        Email = @Email,
                        MobileNo = @MobileNo,
                        Department = @Department,
                        DateOfJoining = @DateOfJoining,
                        LastPositionHeld = @LastPositionHeld,
                        DateOfLeaving = @DateOfLeaving,
                        LastSalaryAnnual = @LastSalaryAnnual,
                        ExitFormalities = @ExitFormalities,
                        EmploymentType = @EmploymentType,
                        AnyBehaviourIssue = @AnyBehaviourIssue,
                        EligibilityToRehire = @EligibilityToRehire
                    WHERE 
                        EmployeeCode = @EmployeeCode AND Contributor = @Contributor
                `;
                try {
                    await mainRequest.query(updateQuery);
                    results.push({ index: i, status: 'updated_by_employeecode_contributor' });
                } catch (error) {
                    results.push({
                        index: i,
                        status: 'fail',
                        message: 'Failed to update contributor data (by EmployeeCode AND Contributor).',
                        error: error.message || error
                    });
                }
                continue;
            }

            // 2. Check if EmployeeCode exists in other row (which would violate unique constraint)
            let checkEmployeeCodeOnlyRequest = pool.request();
            checkEmployeeCodeOnlyRequest.input('EmployeeCode', sql.VarChar(50), c.EmployeeCode);
            const checkEmpCodeOnlyQuery = `
                SELECT TOP 1 * FROM WorktrailcontributorData WHERE EmployeeCode = @EmployeeCode
            `;
            let empCodeConflict = false;
            try {
                const empCodeOnlyResult = await checkEmployeeCodeOnlyRequest.query(checkEmpCodeOnlyQuery);
                if (empCodeOnlyResult.recordset.length > 0) {
                    empCodeConflict = true;
                }
            } catch (err) {
                // Give error but keep code robust
                results.push({
                    index: i,
                    status: 'fail',
                    message: "Failed to check for existing EmployeeCode.",
                    error: err.message || err
                });
                continue;
            }

            if (empCodeConflict) {
                results.push({
                    index: i,
                    status: 'fail',
                    message: `EmployeeCode already present, try a different one.`,
                    error: `Duplicate found on EmployeeCode.`
                });
                continue;
            }

            // 3. Now safe to insert even if Contributor is duplicate!
            const insertQuery = `
                INSERT INTO WorktrailcontributorData (
                    FirstName, MiddleName, LastName, Email, MobileNo, Department,
                    DateOfJoining, LastPositionHeld, DateOfLeaving, LastSalaryAnnual,
                    EmployeeCode, ExitFormalities, EmploymentType, AnyBehaviourIssue, EligibilityToRehire, Contributor
                )
                VALUES (
                    @FirstName, @MiddleName, @LastName, @Email, @MobileNo, @Department,
                    @DateOfJoining, @LastPositionHeld, @DateOfLeaving, @LastSalaryAnnual,
                    @EmployeeCode, @ExitFormalities, @EmploymentType, @AnyBehaviourIssue, @EligibilityToRehire, @Contributor
                );
            `;
            try {
                await mainRequest.query(insertQuery);
                results.push({ index: i, status: 'inserted' });
            } catch (error) {
                let errorMessage = 'Failed to insert contributor data.';
                if (
                    error.originalError &&
                    error.originalError.info &&
                    error.originalError.info.message &&
                    (
                        error.originalError.info.message.toLowerCase().includes('unique') ||
                        error.originalError.info.message.toLowerCase().includes('duplicate key')
                    )
                ) {
                    errorMessage = 'EmployeeCode already present, try a different one.';
                }
                results.push({
                    index: i,
                    status: 'fail',
                    message: errorMessage,
                    error: error.originalError?.info?.message || error.message || error
                });
            }
        }

        // Return response based on success/failure
        if (results.every(r => r.status && !r.status.startsWith('fail'))) {
            return res.status(201).json({ message: 'Contributor data successfully processed.', results });
        } else if (results.every(r => r.status && r.status.startsWith('fail'))) {
            return res.status(409).json({
                message: 'Failed to process any contributor data.',
                results
            });
        } else {
            // Partial success (some inserted/updated, some failed)
            return res.status(207).json({
                message: 'Some contributor entries were not processed.',
                results
            });
        }
    } catch (outerError) {
        console.error('Error processing contributors in bulk:', outerError);
        return res.status(500).json({
            message: 'Internal server error while processing contributor data.',
            error: outerError.message || outerError
        });
    }
}