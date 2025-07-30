const express = require('express');
const Database = require('../utils/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET all animals (public)
router.get('/', async (req, res) => {
  try {
    const animals = await Database.getCollection('animals');
    res.json(animals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch animals' });
  }
});

// Search animals by name or type (public)
router.get('/search', async (req, res) => {
  try {
    const { q, type, gender, min_age, max_age, min_weight, max_weight, min_price, max_price } = req.query;
    
    if (!q && !type && !gender && !min_age && !max_age && !min_weight && !max_weight && !min_price && !max_price) {
      return res.status(400).json({ error: 'At least one search parameter required' });
    }

    const animals = await Database.getCollection('animals');
    
    let filteredAnimals = animals;
    
    if (q) {
      filteredAnimals = filteredAnimals.filter(animal => 
        animal.animal_name.toLowerCase().includes(q.toLowerCase()) ||
        animal.animal_type.toLowerCase().includes(q.toLowerCase())
      );
    }
    
    if (type) {
      filteredAnimals = filteredAnimals.filter(animal => 
        animal.animal_type.toLowerCase() === type.toLowerCase()
      );
    }

    if (gender) {
      filteredAnimals = filteredAnimals.filter(animal => 
        animal.animal_gender.toLowerCase() === gender.toLowerCase()
      );
    }

    if (min_age) {
      filteredAnimals = filteredAnimals.filter(animal => animal.age >= parseInt(min_age));
    }

    if (max_age) {
      filteredAnimals = filteredAnimals.filter(animal => animal.age <= parseInt(max_age));
    }

    if (min_weight) {
      filteredAnimals = filteredAnimals.filter(animal => animal.weight >= parseFloat(min_weight));
    }

    if (max_weight) {
      filteredAnimals = filteredAnimals.filter(animal => animal.weight <= parseFloat(max_weight));
    }

    if (min_price) {
      filteredAnimals = filteredAnimals.filter(animal => animal.price >= parseFloat(min_price));
    }

    if (max_price) {
      filteredAnimals = filteredAnimals.filter(animal => animal.price <= parseFloat(max_price));
    }

    res.json(filteredAnimals);
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET single animal (public)
router.get('/:id', async (req, res) => {
  try {
    const animal = await Database.findById('animals', req.params.id);
    
    if (!animal) {
      return res.status(404).json({ error: 'Animal not found' });
    }

    res.json(animal);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch animal' });
  }
});

// POST new animal (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { animal_type, age, weight, price, animal_name, animal_gender } = req.body;

    if (!animal_type || !age || !weight || !price || !animal_name || !animal_gender) {
      return res.status(400).json({ error: 'Missing required fields: animal_type, age, weight, price, animal_name, animal_gender' });
    }

    // Validate that it's a farm animal
    const validFarmAnimals = ['cow', 'chicken', 'sheep', 'goat', 'horse', 'duck', 'turkey', 'goose', 'llama', 'alpaca', 'donkey', 'mule'];
    if (!validFarmAnimals.includes(animal_type.toLowerCase())) {
      return res.status(400).json({ 
        error: 'Invalid animal type. Must be a farm animal.',
        valid_types: validFarmAnimals
      });
    }

    // Validate gender
    if (!['male', 'female'].includes(animal_gender.toLowerCase())) {
      return res.status(400).json({ error: 'Animal gender must be either "male" or "female"' });
    }

    const newAnimal = {
      id: `animal_${Date.now()}`,
      timestamp: new Date().toISOString(),
      animal_type: animal_type.charAt(0).toUpperCase() + animal_type.slice(1).toLowerCase(),
      age: parseInt(age),
      weight: parseFloat(weight),
      price: parseFloat(price),
      animal_name,
      animal_gender: animal_gender.charAt(0).toUpperCase() + animal_gender.slice(1).toLowerCase()
    };

    await Database.addItem('animals', newAnimal);
    res.status(201).json(newAnimal);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create animal record' });
  }
});

// PATCH update animal (admin only)
router.patch('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const updates = req.body;
    const allowedUpdates = ['animal_type', 'age', 'weight', 'price', 'animal_name', 'animal_gender'];
    const filteredUpdates = {};

    // Filter only allowed updates
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        if (key === 'age') {
          filteredUpdates[key] = parseInt(updates[key]);
        } else if (key === 'weight' || key === 'price') {
          filteredUpdates[key] = parseFloat(updates[key]);
        } else if (key === 'animal_type') {
          // Validate farm animal type
          const validFarmAnimals = ['cow', 'chicken', 'sheep', 'goat', 'horse', 'duck', 'turkey', 'goose', 'llama', 'alpaca', 'donkey', 'mule'];
          if (!validFarmAnimals.includes(updates[key].toLowerCase())) {
            return res.status(400).json({ 
              error: 'Invalid animal type. Must be a farm animal.',
              valid_types: validFarmAnimals
            });
          }
          filteredUpdates[key] = updates[key].charAt(0).toUpperCase() + updates[key].slice(1).toLowerCase();
        } else if (key === 'animal_gender') {
          // Validate gender
          if (!['male', 'female'].includes(updates[key].toLowerCase())) {
            return res.status(400).json({ error: 'Animal gender must be either "male" or "female"' });
          }
          filteredUpdates[key] = updates[key].charAt(0).toUpperCase() + updates[key].slice(1).toLowerCase();
        } else {
          filteredUpdates[key] = updates[key];
        }
      }
    });

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    const updatedAnimal = await Database.updateItem('animals', req.params.id, filteredUpdates);
    res.json(updatedAnimal);
  } catch (error) {
    if (error.message === 'Item not found') {
      res.status(404).json({ error: 'Animal not found' });
    } else {
      res.status(500).json({ error: 'Failed to update animal' });
    }
  }
});

// DELETE animal (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await Database.deleteItem('animals', req.params.id);
    res.json({ message: 'Animal record deleted successfully' });
  } catch (error) {
    if (error.message === 'Item not found') {
      res.status(404).json({ error: 'Animal not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete animal record' });
    }
  }
});

module.exports = router;