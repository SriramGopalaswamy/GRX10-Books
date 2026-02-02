import express from 'express';
import { Invoice, InvoiceItem, Customer } from '../../services/sheetsModels.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// --- Invoices ---

router.get('/invoices', async (req, res) => {
    try {
        const invoices = await Invoice.findAll({
            include: [{ model: InvoiceItem, as: 'items' }, Customer]
        });
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/invoices', async (req, res) => {
    try {
        const { number, date, dueDate, customerId, items, subTotal, taxTotal, total } = req.body;

        const invoice = await Invoice.create({
            id: uuidv4(),
            number,
            date,
            dueDate,
            customerId,
            subTotal,
            taxTotal,
            total,
            status: 'Draft'
        });

        if (items && items.length > 0) {
            const invoiceItems = items.map((item) => ({
                id: uuidv4(),
                invoiceId: invoice.id,
                ...item
            }));
            await InvoiceItem.bulkCreate(invoiceItems);
        }

        // Fetch complete invoice with items
        const createdInvoice = await Invoice.findByPk(invoice.id, {
            include: [{ model: InvoiceItem, as: 'items' }]
        });

        res.json(createdInvoice);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
