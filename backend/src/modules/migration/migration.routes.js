import express from 'express';
import { Customer, Invoice, InvoiceItem, sequelize } from '../../services/sheetsModels.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

router.post('/import', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { invoices } = req.body; // Expecting a list of invoices with customer details embedded or separate

        if (!invoices || !Array.isArray(invoices)) {
            return res.status(400).json({ error: 'Invalid data format. Expected "invoices" array.' });
        }

        let importedCount = 0;
        let customerMap = new Map(); // Map customer name to ID to avoid duplicates

        // 1. First pass: Identify and create customers
        for (const inv of invoices) {
            if (!inv.customerName) continue;

            if (!customerMap.has(inv.customerName)) {
                // Check if exists in DB
                let customer = await Customer.findOne({ where: { name: inv.customerName } }, { transaction: t });

                if (!customer) {
                    customer = await Customer.create({
                        id: uuidv4(),
                        name: inv.customerName,
                        gstin: inv.gstin || '',
                        email: '',
                        balance: 0
                    }, { transaction: t });
                }
                customerMap.set(inv.customerName, customer.id);
            }
        }

        // 2. Second pass: Create Invoices
        for (const inv of invoices) {
            const customerId = customerMap.get(inv.customerName);

            const invoiceId = uuidv4();
            await Invoice.create({
                id: invoiceId,
                number: inv.number,
                date: inv.date,
                dueDate: inv.dueDate,
                customerId: customerId,
                customerName: inv.customerName,
                subTotal: inv.subTotal || 0,
                taxTotal: inv.taxTotal || 0,
                total: inv.total || 0,
                status: inv.status || 'Draft'
            }, { transaction: t });

            if (inv.items && inv.items.length > 0) {
                const items = inv.items.map(item => ({
                    id: uuidv4(),
                    invoiceId: invoiceId,
                    description: item.description || 'Item',
                    quantity: item.quantity || 1,
                    rate: item.rate || 0,
                    amount: item.amount || 0
                }));
                await InvoiceItem.bulkCreate(items, { transaction: t });
            }
            importedCount++;
        }

        await t.commit();
        res.json({ success: true, count: importedCount, message: `Successfully imported ${importedCount} invoices.` });

    } catch (error) {
        await t.rollback();
        console.error('Import failed:', error);
        res.status(500).json({ error: 'Import failed: ' + error.message });
    }
});

export default router;
