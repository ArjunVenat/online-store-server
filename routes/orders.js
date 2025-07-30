const express = require('express');
const Database = require('../utils/database');
const { authenticateToken, requireAdmin, requireOwnerOrAdmin } = require('../middleware/auth');

const router = express.Router();

// GET all orders (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orders = await Database.getCollection('orders');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET orders for a specific user (admin or owner)
router.get('/user/:username', authenticateToken, requireOwnerOrAdmin(), async (req, res) => {
  try {
    const orders = await Database.getCollection('orders');
    const userOrders = orders.filter(order => order.username === req.params.username);
    
    res.json(userOrders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user orders' });
  }
});

// GET single order (admin or owner)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const order = await Database.findById('orders', req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if user can access this order
    if (req.user.role !== 'admin' && req.user.username !== order.username) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// POST checkout - create new order
router.post('/checkout', authenticateToken, async (req, res) => {
  try {
    const { items, ship_address } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array required' });
    }

    if (!ship_address) {
      return res.status(400).json({ error: 'Shipping address required' });
    }

    // Validate items and calculate total
    const animals = await Database.getCollection('animals');
    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const { animal_id, quantity } = item;
      
      if (!animal_id || !quantity || quantity <= 0) {
        return res.status(400).json({ error: 'Invalid item data' });
      }

      const animal = animals.find(a => a.id === animal_id);
      if (!animal) {
        return res.status(404).json({ error: `Animal ${animal_id} not found` });
      }

      // For animals, typically quantity would be 1 (you can't buy half an animal)
      if (quantity !== 1) {
        return res.status(400).json({ error: 'Quantity must be 1 for animal purchases' });
      }

      const itemTotal = animal.price * quantity;
      totalAmount += itemTotal;

      orderItems.push({
        animal_id,
        quantity,
        price: animal.price
      });
    }

    // Simulate credit card processing (always succeeds for demo)
    const paymentSuccess = Math.random() > 0.1; // 90% success rate for demo
    
    if (!paymentSuccess) {
      return res.status(400).json({ error: 'Payment processing failed' });
    }

    // For animals, we might want to mark them as sold or remove them
    // For this example, we'll remove sold animals from the database
    const remainingAnimals = animals.filter(animal => 
      !orderItems.some(item => item.animal_id === animal.id)
    );
    await Database.updateCollection('animals', remainingAnimals);

    // Create order
    const newOrder = {
      id: `order_${Date.now()}`,
      username: req.user.username,
      order_date: new Date().toISOString(),
      ship_address,
      items: orderItems
    };

    await Database.addItem('orders', newOrder);

    res.status(201).json({
      message: 'Order placed successfully',
      order: newOrder,
      total_amount: totalAmount,
      payment_status: 'completed'
    });

  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Checkout failed' });
  }
});

// PATCH update order (admin only)
router.patch('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const updates = req.body;
    const allowedUpdates = ['ship_address', 'items'];
    const filteredUpdates = {};

    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    const updatedOrder = await Database.updateItem('orders', req.params.id, filteredUpdates);
    res.json(updatedOrder);
  } catch (error) {
    if (error.message === 'Item not found') {
      res.status(404).json({ error: 'Order not found' });
    } else {
      res.status(500).json({ error: 'Failed to update order' });
    }
  }
});

// DELETE order (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await Database.deleteItem('orders', req.params.id);
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    if (error.message === 'Item not found') {
      res.status(404).json({ error: 'Order not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete order' });
    }
  }
});

module.exports = router;