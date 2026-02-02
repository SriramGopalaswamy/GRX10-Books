import express from 'express';
import { Customer } from '../../services/sheetsModels.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// --- Customers ---

router.get('/customers', async (req, res) => {
    try {
        const customers = await Customer.findAll();
        res.json(customers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/customers', async (req, res) => {
    try {
        const { name, gstin, email, balance } = req.body;
        const customer = await Customer.create({
            id: uuidv4(),
            name,
            gstin,
            email,
            balance
        });
        res.json(customer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
