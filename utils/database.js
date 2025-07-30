const fs = require('fs').promises;
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'database.json');

class Database {
  static async read() {
    try {
      const data = await fs.readFile(DB_PATH, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading database:', error);
      throw new Error('Database read error');
    }
  }

  static async write(data) {
    try {
      await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error writing database:', error);
      throw new Error('Database write error');
    }
  }

  static async getCollection(collectionName) {
    const db = await this.read();
    return db[collectionName] || [];
  }

  static async updateCollection(collectionName, data) {
    const db = await this.read();
    db[collectionName] = data;
    await this.write(db);
    return data;
  }

  static async findById(collectionName, id) {
    const collection = await this.getCollection(collectionName);
    return collection.find(item => item.id === id);
  }

  static async findByField(collectionName, field, value) {
    const collection = await this.getCollection(collectionName);
    return collection.find(item => item[field] === value);
  }

  static async addItem(collectionName, item) {
    const collection = await this.getCollection(collectionName);
    collection.push(item);
    return await this.updateCollection(collectionName, collection);
  }

  static async updateItem(collectionName, id, updates) {
    const collection = await this.getCollection(collectionName);
    const index = collection.findIndex(item => item.id === id);
    
    if (index === -1) {
      throw new Error('Item not found');
    }
    
    collection[index] = { ...collection[index], ...updates };
    await this.updateCollection(collectionName, collection);
    return collection[index];
  }

  static async deleteItem(collectionName, id) {
    const collection = await this.getCollection(collectionName);
    const filteredCollection = collection.filter(item => item.id !== id);
    
    if (filteredCollection.length === collection.length) {
      throw new Error('Item not found');
    }
    
    await this.updateCollection(collectionName, filteredCollection);
    return true;
  }
}

module.exports = Database;