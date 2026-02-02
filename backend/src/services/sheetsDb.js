/**
 * Google Sheets Database Abstraction Layer
 * Provides a Sequelize-compatible API over Google Sheets
 */

import { google } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';

// Sheet ID from environment or default
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || '1KQOYka1O9OlO53qG9uSi9RykXCunjzqQutRbw84M4Ec';

let sheets = null;
let auth = null;

/**
 * Initialize Google Sheets API connection
 */
async function initSheets() {
  if (sheets) return sheets;

  try {
    const serviceKey = process.env.GOOGLE_SERVICE_KEY;
    if (!serviceKey) {
      throw new Error('GOOGLE_SERVICE_KEY environment variable is required');
    }

    const credentials = JSON.parse(serviceKey);

    auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    sheets = google.sheets({ version: 'v4', auth });
    console.log('✅ Google Sheets connection initialized');
    return sheets;
  } catch (error) {
    console.error('❌ Failed to initialize Google Sheets:', error.message);
    throw error;
  }
}

/**
 * Get or create a sheet by name
 */
async function ensureSheet(sheetName, headers) {
  const sheetsApi = await initSheets();

  try {
    // Get spreadsheet metadata to check if sheet exists
    const spreadsheet = await sheetsApi.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const existingSheet = spreadsheet.data.sheets.find(
      s => s.properties.title === sheetName
    );

    if (!existingSheet) {
      // Create the sheet
      await sheetsApi.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            addSheet: {
              properties: { title: sheetName }
            }
          }]
        }
      });

      // Add headers
      if (headers && headers.length > 0) {
        await sheetsApi.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${sheetName}!A1`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [headers]
          }
        });
      }
      console.log(`📋 Created sheet: ${sheetName}`);
    }

    return true;
  } catch (error) {
    console.error(`Error ensuring sheet ${sheetName}:`, error.message);
    throw error;
  }
}

/**
 * Read all rows from a sheet
 */
async function readSheet(sheetName) {
  const sheetsApi = await initSheets();

  try {
    const response = await sheetsApi.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:ZZ`,
    });

    const rows = response.data.values || [];
    if (rows.length < 2) return []; // No data rows (only header or empty)

    const headers = rows[0];
    const data = rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] !== undefined ? row[index] : null;
      });
      return obj;
    });

    return data;
  } catch (error) {
    if (error.code === 400 && error.message.includes('Unable to parse range')) {
      return []; // Sheet doesn't exist yet
    }
    throw error;
  }
}

/**
 * Append a row to a sheet
 */
async function appendRow(sheetName, headers, values) {
  const sheetsApi = await initSheets();

  // Ensure sheet exists with headers
  await ensureSheet(sheetName, headers);

  const row = headers.map(h => values[h] !== undefined ? values[h] : '');

  await sheetsApi.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:A`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [row]
    }
  });
}

/**
 * Update a row in a sheet
 */
async function updateRow(sheetName, headers, rowIndex, values) {
  const sheetsApi = await initSheets();

  const row = headers.map(h => values[h] !== undefined ? values[h] : '');

  await sheetsApi.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A${rowIndex + 2}`, // +2 for header row and 1-based index
    valueInputOption: 'RAW',
    requestBody: {
      values: [row]
    }
  });
}

/**
 * Delete a row from a sheet
 */
async function deleteRow(sheetName, rowIndex) {
  const sheetsApi = await initSheets();

  // Get sheet ID
  const spreadsheet = await sheetsApi.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
  if (!sheet) return;

  await sheetsApi.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheet.properties.sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex + 1, // +1 for header
            endIndex: rowIndex + 2
          }
        }
      }]
    }
  });
}

/**
 * Parse JSON fields from string
 */
function parseJsonFields(obj, jsonFields) {
  if (!jsonFields || !obj) return obj;

  const result = { ...obj };
  for (const field of jsonFields) {
    if (result[field] && typeof result[field] === 'string') {
      try {
        result[field] = JSON.parse(result[field]);
      } catch (e) {
        // Keep as string if not valid JSON
      }
    }
  }
  return result;
}

/**
 * Stringify JSON fields for storage
 */
function stringifyJsonFields(obj, jsonFields) {
  if (!jsonFields || !obj) return obj;

  const result = { ...obj };
  for (const field of jsonFields) {
    if (result[field] && typeof result[field] === 'object') {
      result[field] = JSON.stringify(result[field]);
    }
  }
  return result;
}

/**
 * Match a value against a where clause condition
 */
function matchCondition(value, condition) {
  if (condition === null || condition === undefined) {
    return value === null || value === undefined || value === '';
  }

  if (typeof condition === 'object' && condition !== null) {
    // Handle Sequelize-like operators
    for (const [op, opValue] of Object.entries(condition)) {
      switch (op) {
        case 'eq':
        case '$eq':
          if (String(value) !== String(opValue)) return false;
          break;
        case 'ne':
        case '$ne':
          if (String(value) === String(opValue)) return false;
          break;
        case 'gt':
        case '$gt':
          if (Number(value) <= Number(opValue)) return false;
          break;
        case 'gte':
        case '$gte':
          if (Number(value) < Number(opValue)) return false;
          break;
        case 'lt':
        case '$lt':
          if (Number(value) >= Number(opValue)) return false;
          break;
        case 'lte':
        case '$lte':
          if (Number(value) > Number(opValue)) return false;
          break;
        case 'like':
        case '$like':
          const pattern = String(opValue).replace(/%/g, '.*');
          if (!new RegExp(`^${pattern}$`, 'i').test(String(value))) return false;
          break;
        case 'in':
        case '$in':
          if (!Array.isArray(opValue) || !opValue.map(String).includes(String(value))) return false;
          break;
        case 'notIn':
        case '$notIn':
          if (Array.isArray(opValue) && opValue.map(String).includes(String(value))) return false;
          break;
        case 'between':
        case '$between':
          if (!Array.isArray(opValue) || opValue.length !== 2) return false;
          const numVal = Number(value) || value;
          if (numVal < opValue[0] || numVal > opValue[1]) return false;
          break;
        default:
          // Unknown operator, try direct comparison
          if (String(value) !== String(opValue)) return false;
      }
    }
    return true;
  }

  // Direct comparison
  return String(value) === String(condition);
}

/**
 * Filter rows based on where clause
 */
function filterRows(rows, where) {
  if (!where || Object.keys(where).length === 0) return rows;

  return rows.filter(row => {
    for (const [field, condition] of Object.entries(where)) {
      // Handle $or operator
      if (field === '$or' || field === 'or') {
        const orConditions = Array.isArray(condition) ? condition : [condition];
        const orMatch = orConditions.some(orCond => {
          for (const [orField, orValue] of Object.entries(orCond)) {
            if (!matchCondition(row[orField], orValue)) return false;
          }
          return true;
        });
        if (!orMatch) return false;
        continue;
      }

      // Handle $and operator
      if (field === '$and' || field === 'and') {
        const andConditions = Array.isArray(condition) ? condition : [condition];
        const andMatch = andConditions.every(andCond => {
          for (const [andField, andValue] of Object.entries(andCond)) {
            if (!matchCondition(row[andField], andValue)) return false;
          }
          return true;
        });
        if (!andMatch) return false;
        continue;
      }

      if (!matchCondition(row[field], condition)) return false;
    }
    return true;
  });
}

/**
 * Sort rows based on order clause
 */
function sortRows(rows, order) {
  if (!order || !Array.isArray(order) || order.length === 0) return rows;

  return [...rows].sort((a, b) => {
    for (const orderItem of order) {
      let field, direction;

      if (Array.isArray(orderItem)) {
        [field, direction] = orderItem;
      } else if (typeof orderItem === 'string') {
        field = orderItem;
        direction = 'ASC';
      } else {
        continue;
      }

      const aVal = a[field];
      const bVal = b[field];

      let comparison = 0;
      if (aVal === bVal) comparison = 0;
      else if (aVal === null || aVal === undefined) comparison = 1;
      else if (bVal === null || bVal === undefined) comparison = -1;
      else if (!isNaN(Number(aVal)) && !isNaN(Number(bVal))) {
        comparison = Number(aVal) - Number(bVal);
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      if (direction && direction.toUpperCase() === 'DESC') {
        comparison = -comparison;
      }

      if (comparison !== 0) return comparison;
    }
    return 0;
  });
}

/**
 * SheetsModel class - Sequelize-compatible model over Google Sheets
 */
class SheetsModel {
  constructor(sheetName, schema, options = {}) {
    this.sheetName = sheetName;
    this.schema = schema;
    this.headers = Object.keys(schema);
    this.jsonFields = options.jsonFields || [];
    this.associations = {};
    this.defaultValues = {};

    // Extract default values from schema
    for (const [field, config] of Object.entries(schema)) {
      if (config && typeof config === 'object' && 'defaultValue' in config) {
        this.defaultValues[field] = config.defaultValue;
      }
    }

    // Add timestamps
    if (!this.headers.includes('createdAt')) {
      this.headers.push('createdAt');
    }
    if (!this.headers.includes('updatedAt')) {
      this.headers.push('updatedAt');
    }
  }

  /**
   * Define associations (for includes)
   */
  hasMany(targetModel, options) {
    const alias = options.as || targetModel.sheetName;
    this.associations[alias] = {
      type: 'hasMany',
      model: targetModel,
      foreignKey: options.foreignKey,
      as: alias
    };
  }

  belongsTo(targetModel, options) {
    const alias = options.as || targetModel.sheetName;
    this.associations[alias] = {
      type: 'belongsTo',
      model: targetModel,
      foreignKey: options.foreignKey,
      as: alias
    };
  }

  belongsToMany(targetModel, options) {
    const alias = options.as || targetModel.sheetName;
    this.associations[alias] = {
      type: 'belongsToMany',
      model: targetModel,
      through: options.through,
      foreignKey: options.foreignKey,
      as: alias
    };
  }

  /**
   * Find all records
   */
  async findAll(options = {}) {
    let rows = await readSheet(this.sheetName);

    // Apply where clause
    if (options.where) {
      rows = filterRows(rows, options.where);
    }

    // Apply ordering
    if (options.order) {
      rows = sortRows(rows, options.order);
    }

    // Apply limit and offset
    if (options.offset) {
      rows = rows.slice(options.offset);
    }
    if (options.limit) {
      rows = rows.slice(0, options.limit);
    }

    // Parse JSON fields
    rows = rows.map(row => parseJsonFields(row, this.jsonFields));

    // Handle includes
    if (options.include) {
      rows = await this._resolveIncludes(rows, options.include);
    }

    // Wrap in model-like objects
    return rows.map(row => this._wrapRow(row));
  }

  /**
   * Find one record
   */
  async findOne(options = {}) {
    const results = await this.findAll({ ...options, limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Find by primary key
   */
  async findByPk(id, options = {}) {
    return this.findOne({ ...options, where: { id } });
  }

  /**
   * Create a new record
   */
  async create(data, options = {}) {
    const now = new Date().toISOString();
    const id = data.id || uuidv4();

    // Apply default values
    const record = { ...this.defaultValues, ...data, id };

    // Add timestamps
    record.createdAt = now;
    record.updatedAt = now;

    // Stringify JSON fields
    const storageData = stringifyJsonFields(record, this.jsonFields);

    await appendRow(this.sheetName, this.headers, storageData);

    return this._wrapRow(record);
  }

  /**
   * Bulk create records
   */
  async bulkCreate(dataArray, options = {}) {
    const results = [];
    for (const data of dataArray) {
      const result = await this.create(data, options);
      results.push(result);
    }
    return results;
  }

  /**
   * Update records
   */
  async update(data, options = {}) {
    const rows = await readSheet(this.sheetName);
    const filteredIndices = [];

    rows.forEach((row, index) => {
      if (!options.where || Object.keys(options.where).length === 0) {
        filteredIndices.push(index);
      } else {
        let match = true;
        for (const [field, condition] of Object.entries(options.where)) {
          if (!matchCondition(row[field], condition)) {
            match = false;
            break;
          }
        }
        if (match) filteredIndices.push(index);
      }
    });

    const now = new Date().toISOString();

    for (const index of filteredIndices) {
      const updatedRow = { ...rows[index], ...data, updatedAt: now };
      const storageData = stringifyJsonFields(updatedRow, this.jsonFields);
      await updateRow(this.sheetName, this.headers, index, storageData);
    }

    return [filteredIndices.length];
  }

  /**
   * Delete records
   */
  async destroy(options = {}) {
    const rows = await readSheet(this.sheetName);
    const indicesToDelete = [];

    rows.forEach((row, index) => {
      if (!options.where || Object.keys(options.where).length === 0) {
        indicesToDelete.push(index);
      } else {
        let match = true;
        for (const [field, condition] of Object.entries(options.where)) {
          if (!matchCondition(row[field], condition)) {
            match = false;
            break;
          }
        }
        if (match) indicesToDelete.push(index);
      }
    });

    // Delete from bottom to top to maintain indices
    for (const index of indicesToDelete.reverse()) {
      await deleteRow(this.sheetName, index);
    }

    return indicesToDelete.length;
  }

  /**
   * Count records
   */
  async count(options = {}) {
    let rows = await readSheet(this.sheetName);

    if (options.where) {
      rows = filterRows(rows, options.where);
    }

    return rows.length;
  }

  /**
   * Find or create a record
   */
  async findOrCreate(options = {}) {
    let record = await this.findOne({ where: options.where });
    let created = false;

    if (!record) {
      record = await this.create({ ...options.where, ...options.defaults });
      created = true;
    }

    return [record, created];
  }

  /**
   * Resolve includes (relationships)
   */
  async _resolveIncludes(rows, includes) {
    for (const include of includes) {
      const modelOrConfig = typeof include === 'object' ? include : { model: include };
      const { model, as, where: includeWhere, required } = modelOrConfig;

      // Find the association
      let association = null;
      const alias = as || model?.sheetName;

      for (const [assocAlias, assoc] of Object.entries(this.associations)) {
        if (assoc.model === model || assocAlias === alias) {
          association = assoc;
          break;
        }
      }

      if (!association) {
        // Try to infer from model directly
        if (model) {
          for (const row of rows) {
            const foreignKey = modelOrConfig.foreignKey || `${this.sheetName.replace(/s$/, '')}Id`;
            const targetKey = modelOrConfig.targetKey || 'id';

            let relatedRows = await model.findAll({
              where: { [foreignKey]: row.id, ...includeWhere }
            });

            row[alias || model.sheetName] = relatedRows.map(r => r.dataValues || r);
          }
        }
        continue;
      }

      // Resolve based on association type
      if (association.type === 'hasMany') {
        for (const row of rows) {
          let relatedRows = await association.model.findAll({
            where: { [association.foreignKey]: row.id, ...includeWhere }
          });
          row[association.as] = relatedRows.map(r => r.dataValues || r);
        }
      } else if (association.type === 'belongsTo') {
        for (const row of rows) {
          const foreignKeyValue = row[association.foreignKey];
          if (foreignKeyValue) {
            const relatedRow = await association.model.findByPk(foreignKeyValue);
            row[association.as] = relatedRow ? (relatedRow.dataValues || relatedRow) : null;
          } else {
            row[association.as] = null;
          }
        }
      }
    }

    return rows;
  }

  /**
   * Wrap a row in a model-like object with save/destroy methods
   */
  _wrapRow(row) {
    const model = this;
    const wrappedRow = {
      ...row,
      dataValues: row,
      get(field) {
        return this[field];
      },
      async save() {
        const updateData = {};
        for (const field of model.headers) {
          if (this[field] !== undefined) {
            updateData[field] = this[field];
          }
        }
        await model.update(updateData, { where: { id: this.id } });
        return this;
      },
      async destroy() {
        await model.destroy({ where: { id: this.id } });
      },
      toJSON() {
        const json = {};
        for (const key of Object.keys(row)) {
          json[key] = this[key];
        }
        return json;
      }
    };
    return wrappedRow;
  }

  /**
   * Initialize the sheet with headers
   */
  async sync() {
    await ensureSheet(this.sheetName, this.headers);
  }
}

/**
 * Transaction support (simplified - Google Sheets doesn't support true transactions)
 */
class SheetsTransaction {
  constructor() {
    this.operations = [];
    this.committed = false;
    this.rolledBack = false;
  }

  async commit() {
    this.committed = true;
    // Operations are already executed in Sheets
  }

  async rollback() {
    this.rolledBack = true;
    // Note: True rollback not possible with Sheets
    console.warn('Warning: Transaction rollback requested but Sheets does not support true transactions');
  }
}

/**
 * Sequelize-like interface
 */
const sheetsDb = {
  models: {},

  async transaction(callback) {
    const t = new SheetsTransaction();
    try {
      if (callback) {
        const result = await callback(t);
        await t.commit();
        return result;
      }
      return t;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async authenticate() {
    await initSheets();
    console.log('✅ Google Sheets authentication successful');
  },

  async sync(options = {}) {
    await initSheets();
    for (const model of Object.values(this.models)) {
      await model.sync();
    }
    console.log('📋 All sheets synchronized');
  },

  getDialect() {
    return 'google-sheets';
  },

  define(name, schema, options = {}) {
    const model = new SheetsModel(name, schema, options);
    this.models[name] = model;
    return model;
  },

  // Raw query support (limited)
  async query(sql) {
    console.warn('Warning: Raw SQL queries are not supported with Google Sheets');
    return [[], null];
  }
};

export {
  sheetsDb,
  SheetsModel,
  initSheets,
  ensureSheet,
  readSheet,
  SPREADSHEET_ID
};

export default sheetsDb;
