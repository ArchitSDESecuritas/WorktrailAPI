import 'dotenv/config';
import express from 'express';
import { Login } from './Controller/Login.js';
import { MenuBar } from './Controller/Menu.js';
import { Register } from './Controller/Register.js';
import { ContributorData } from './Controller/ContributorData.js';
import { ContributorEmpSearch } from './Controller/ContributorEmpSearch.js';
import { Orgmastermanage } from './Controller/Orgmastermanage.js';
import { OrgmasterData } from './Controller/OrgmasterData.js';
import { OrgmasterDelete } from './Controller/OrgmasterDelete.js';
import { OrgmasterNameUpdate } from './Controller/OrgmasterNameupdate.js';
import { OrgmasterSearch } from './Controller/OrgmasterSearch.js';
import { ContributorAdminData } from './Controller/ContributorAdminData.js';
import { ContributorUpdate } from './Controller/ContributorUpdate.js';
import { ContributorDelete } from './Controller/ContributorDelete.js';
import { createPaymentOrder, verifyPayment, getPaymentTransaction } from './Controller/Payment.js';
import cors from 'cors';

const PORT = Number(process.env.PORT) || 3000;

const app =express();
app.use(express.json());
app.use(cors());

app.get('/',(req,res)=>{
    res.send("Hello world")
})

app.post('/Login',Login);
app.post('/Menu', MenuBar);
app.post('/Register', Register);
app.post('/ContributorData', ContributorData);
app.post('/ContributorEmpSearch', ContributorEmpSearch);
app.post('/Orgmastermanage',Orgmastermanage);
app.get('/OrgmasterData',OrgmasterData)
app.post('/OrgmasterDelete',OrgmasterDelete)
app.post('/OrgmasterNameUpdate',OrgmasterNameUpdate)
app.post('/OrgmasterSearch',OrgmasterSearch)
app.get('/ContributorAdminData',ContributorAdminData)
app.post('/ContributorUpdate',ContributorUpdate)
app.post('/ContributorDelete',ContributorDelete)
app.post('/Payment/CreateOrder', createPaymentOrder);
app.post('/Payment/Verify', verifyPayment);
app.get('/Payment/Transaction/:orderId', getPaymentTransaction);


app.listen(PORT,()=>{
    console.log(`Server is listening ${PORT}`);
    console.log('[Payment] Razorpay configuration:', {
        apiKeyPresent: Boolean(process.env.RAZORPAY_API_KEY),
        secretKeyPresent: Boolean(process.env.RAZORPAY_SECRET_KEY),
        database: process.env.DB_NAME || 'WorkTrailApp'
    });
});