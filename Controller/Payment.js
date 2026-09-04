import crypto from 'crypto';
import Razorpay from 'razorpay';
import { sql, pool, poolConnect } from '../DatabaseConfig/DB.js';

const getRequiredText = (value) => typeof value === 'string' && value.trim().length > 0;

const logErrorDetails = (label, error) => {
    console.error(label, {
        message: error?.message,
        code: error?.code,
        status: error?.statusCode || error?.response?.status,
        response: error?.response?.data,
        stack: error?.stack
    });
};

export const createPaymentOrder = async (req, res) => {
    const { candidateName, email, phone, organizationId, amount } = req.body;
    const numericAmount = Number(amount);

    console.log('[Payment/CreateOrder] Request JSON:', req.body);

    if (!getRequiredText(candidateName) || !Number.isFinite(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ message: 'Candidate name and a valid positive amount are required.' });
    }

    if (!process.env.RAZORPAY_API_KEY || !process.env.RAZORPAY_SECRET_KEY) {
        return res.status(500).json({ message: 'Payment gateway is not configured on the server.' });
    }

    const amountInPaise = Math.round(numericAmount * 100);
    if (amountInPaise < 100) {
        return res.status(400).json({ message: 'The minimum payment amount is INR 1.' });
    }

    try {
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_API_KEY,
            key_secret: process.env.RAZORPAY_SECRET_KEY
        });
        const razorpayOrderPayload = {
            amount: amountInPaise,
            currency: 'INR',
            receipt: `candidate_${Date.now()}`,
            notes: { candidateName: candidateName.trim() }
        };
        console.log('[Razorpay orders.create] Request JSON:', razorpayOrderPayload);
        const order = await razorpay.orders.create(razorpayOrderPayload);
        console.log('[Razorpay orders.create] Response JSON:', order);

        await poolConnect;
        const request = pool.request();
        request.input('CandidateName', sql.NVarChar(200), candidateName.trim());
        request.input('Email', sql.VarChar(255), getRequiredText(email) ? email.trim() : null);
        request.input('Phone', sql.VarChar(30), getRequiredText(phone) ? phone.trim() : null);
        request.input('OrganizationID', sql.Int, organizationId ? Number(organizationId) : null);
        request.input('Amount', sql.Decimal(18, 2), numericAmount.toFixed(2));
        request.input('Currency', sql.Char(3), 'INR');
        request.input('RazorpayOrderID', sql.VarChar(80), order.id);

        await request.query(`
            INSERT INTO PaymentTransactions
                (CandidateName, Email, Phone, OrganizationID, Amount, Currency, RazorpayOrderID, Status)
            VALUES
                (@CandidateName, @Email, @Phone, @OrganizationID, @Amount, @Currency, @RazorpayOrderID, 'Created')
        `);

        const responsePayload = {
            key: process.env.RAZORPAY_API_KEY,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            candidateName: candidateName.trim()
        };
        console.log('[Payment/CreateOrder] Response JSON:', responsePayload);
        return res.status(201).json(responsePayload);
    } catch (error) {
        logErrorDetails('[Payment/CreateOrder] Error:', error);
        return res.status(500).json({ message: 'Unable to create payment order.' });
    }
};

export const verifyPayment = async (req, res) => {
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;

    console.log('[Payment/Verify] Request JSON:', {
        ...req.body,
        razorpay_signature: signature ? '[REDACTED]' : signature
    });

    if (!orderId || !paymentId || !signature) {
        return res.status(400).json({ message: 'Payment verification details are required.' });
    }
    if (!process.env.RAZORPAY_SECRET_KEY) {
        return res.status(500).json({ message: 'Payment gateway is not configured on the server.' });
    }

    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_SECRET_KEY)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');
    const expectedSignatureBuffer = Buffer.from(expectedSignature);
    const receivedSignatureBuffer = Buffer.from(signature);
    const isValid = expectedSignatureBuffer.length === receivedSignatureBuffer.length &&
        crypto.timingSafeEqual(expectedSignatureBuffer, receivedSignatureBuffer);
    console.log('[Payment/Verify] Signature validation:', {
        orderId,
        paymentId,
        isValid
    });

    try {
        await poolConnect;
        const request = pool.request();
        request.input('RazorpayOrderID', sql.VarChar(80), orderId);
        request.input('RazorpayPaymentID', sql.VarChar(80), paymentId);
        request.input('RazorpaySignature', sql.VarChar(255), signature);
        request.input('Status', sql.VarChar(30), isValid ? 'Paid' : 'Failed');
        request.input('FailureReason', sql.NVarChar(500), isValid ? null : 'Invalid payment signature');

        const result = await request.query(`
            UPDATE PaymentTransactions
            SET RazorpayPaymentID = @RazorpayPaymentID,
                RazorpaySignature = @RazorpaySignature,
                Status = @Status,
                FailureReason = @FailureReason,
                PaidAt = CASE WHEN @Status = 'Paid' THEN GETDATE() ELSE PaidAt END,
                UpdatedAt = GETDATE()
            OUTPUT INSERTED.TransactionID, INSERTED.RazorpayOrderID, INSERTED.Status
            WHERE RazorpayOrderID = @RazorpayOrderID
        `);

        if (result.recordset.length === 0) {
            const responsePayload = { message: 'Payment order was not found.' };
            console.log('[Payment/Verify] Response JSON:', responsePayload);
            return res.status(404).json(responsePayload);
        }
        if (!isValid) {
            const responsePayload = { message: 'Payment verification failed.' };
            console.log('[Payment/Verify] Response JSON:', responsePayload);
            return res.status(400).json(responsePayload);
        }
        const responsePayload = { message: 'Payment verified successfully.', transaction: result.recordset[0] };
        console.log('[Payment/Verify] Response JSON:', responsePayload);
        return res.status(200).json(responsePayload);
    } catch (error) {
        logErrorDetails('[Payment/Verify] Error:', error);
        return res.status(500).json({ message: 'Unable to verify payment.' });
    }
};

export const getPaymentTransaction = async (req, res) => {
    console.log('[Payment/Transaction] Request JSON:', { orderId: req.params.orderId });
    try {
        await poolConnect;
        const request = pool.request();
        request.input('RazorpayOrderID', sql.VarChar(80), req.params.orderId);
        const result = await request.query(`
            SELECT TransactionID, CandidateName, Email, Phone, OrganizationID, Amount,
                   Currency, RazorpayOrderID, RazorpayPaymentID, Status, FailureReason,
                   CreatedAt, PaidAt, UpdatedAt
            FROM PaymentTransactions
            WHERE RazorpayOrderID = @RazorpayOrderID
        `);
        if (result.recordset.length === 0) {
            const responsePayload = { message: 'Payment transaction was not found.' };
            console.log('[Payment/Transaction] Response JSON:', responsePayload);
            return res.status(404).json(responsePayload);
        }
        const responsePayload = { data: result.recordset[0] };
        console.log('[Payment/Transaction] Response JSON:', responsePayload);
        return res.status(200).json(responsePayload);
    } catch (error) {
        logErrorDetails('[Payment/Transaction] Error:', error);
        return res.status(500).json({ message: 'Unable to retrieve payment transaction.' });
    }
};