const inventoryRepository = require('../repositories/inventoryRepository');
const { db } = require('../config/firestore');
const { logAudit } = require('../middleware/audit');
const aggregateService = require('../services/aggregateService');

const getInventory = async (req, res) => {
  try {
    const items = await inventoryRepository.findAll();
    res.json(items);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
};

const createInventoryItem = async (req, res) => {
  try {
    const { sku, name, category, description, quantity, minimumStock, unitPrice, partType, location } = req.body;

    if (!sku || !name || unitPrice === undefined) {
      return res.status(400).json({ error: 'SKU, Name, and Unit Price are required' });
    }

    const existing = await inventoryRepository.findBySku(sku);
    if (existing) {
      return res.status(400).json({ error: 'Item with this SKU already exists' });
    }

    const item = await db.runTransaction(async (transaction) => {
      const newItem = await inventoryRepository.create({
        sku,
        name,
        category: category || 'General',
        description: description || null,
        quantity: parseInt(quantity || 0, 10),
        minimumStock: parseInt(minimumStock || 5, 10),
        unitPrice: parseFloat(unitPrice),
        partType: partType || 'REGULAR',
        location: location || 'Main Shelf'
      }, transaction);

      await logAudit({
        userId: req.user ? req.user.id : null,
        action: 'INVENTORY_ITEM_CREATED',
        entity: 'InventoryItem',
        entityId: newItem.id,
        inventoryItemId: newItem.id,
        details: `Created SKU ${sku} (${name}) [Type: ${newItem.partType || 'REGULAR'}] with initial stock ${newItem.quantity}`
      }, transaction);

      return newItem;
    });

    // Update aggregate stats
    aggregateService.recalculateDashboardAggregates().catch(() => {});

    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating inventory item:', error);
    res.status(500).json({ error: 'Failed to create inventory item' });
  }
};

const updateInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, description, quantity, minimumStock, unitPrice, partType, location } = req.body;

    const currentItem = await inventoryRepository.findById(id);
    if (!currentItem) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    const updatedItem = await db.runTransaction(async (transaction) => {
      const item = await inventoryRepository.updatePart(id, {
        name: name || currentItem.name,
        category: category || currentItem.category,
        description: description !== undefined ? description : currentItem.description,
        quantity: quantity !== undefined ? parseInt(quantity, 10) : currentItem.quantity,
        minimumStock: minimumStock !== undefined ? parseInt(minimumStock, 10) : currentItem.minimumStock,
        unitPrice: unitPrice !== undefined ? parseFloat(unitPrice) : currentItem.unitPrice,
        partType: partType || currentItem.partType || 'REGULAR',
        location: location || currentItem.location
      }, transaction);

      await logAudit({
        userId: req.user ? req.user.id : null,
        action: 'INVENTORY_ITEM_UPDATED',
        entity: 'InventoryItem',
        entityId: item.id,
        inventoryItemId: item.id,
        details: `Updated ${item.name} [Type: ${item.partType}]. Stock: ${item.quantity}, Price: ₹${item.unitPrice}`
      }, transaction);

      return item;
    });

    aggregateService.recalculateDashboardAggregates().catch(() => {});

    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating inventory item:', error);
    res.status(500).json({ error: 'Failed to update inventory item' });
  }
};

const updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { delta, reason } = req.body;

    if (delta === undefined || isNaN(delta)) {
      return res.status(400).json({ error: 'Valid delta quantity is required' });
    }

    const quantityChange = parseInt(delta, 10);

    const updatedItem = await db.runTransaction(async (transaction) => {
      const currentItem = await inventoryRepository.findById(id, transaction);
      if (!currentItem) {
        throw new Error('ITEM_NOT_FOUND');
      }

      const newQuantity = currentItem.quantity + quantityChange;
      if (newQuantity < 0) {
        throw new Error('INSUFFICIENT_STOCK');
      }

      const item = await inventoryRepository.updateQuantity(id, newQuantity, transaction);

      await logAudit({
        userId: req.user ? req.user.id : null,
        action: 'STOCK_MUTATION',
        entity: 'InventoryItem',
        entityId: item.id,
        inventoryItemId: item.id,
        details: `Stock ${quantityChange >= 0 ? '+' : ''}${quantityChange} (Previous: ${currentItem.quantity}, New: ${newQuantity}). Reason: ${reason || 'Manual Adjustment'}`
      }, transaction);

      return item;
    });

    aggregateService.recalculateDashboardAggregates().catch(() => {});

    res.json(updatedItem);
  } catch (error) {
    if (error.message === 'ITEM_NOT_FOUND') {
      return res.status(404).json({ error: 'Inventory item not found' });
    }
    if (error.message === 'INSUFFICIENT_STOCK') {
      return res.status(400).json({ error: 'Cannot reduce stock below zero' });
    }
    console.error('Error updating stock:', error);
    res.status(500).json({ error: 'Failed to update stock' });
  }
};

module.exports = {
  getInventory,
  createInventoryItem,
  updateInventoryItem,
  updateStock
};
