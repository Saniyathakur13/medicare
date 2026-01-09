// Simple MediCare Backend Server
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// File paths
const MEDICINES_FILE = path.join(__dirname, 'medicines.json');
const USERS_FILE = path.join(__dirname, 'users.json');

// Initialize files if they don't exist
if (!fs.existsSync(MEDICINES_FILE)) {
    fs.writeFileSync(MEDICINES_FILE, JSON.stringify([], null, 2));
}
if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
}

// ========== MEDICINE ENDPOINTS ==========

// GET all medicines (with pagination)
app.get('/api/medicines', (req, res) => {
    try {
        const data = fs.readFileSync(MEDICINES_FILE, 'utf8');
        let medicines = JSON.parse(data);
        
        const { page = 1, limit = 20, search = '', category = '' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        
        // Apply filters
        if (search) {
            const searchLower = search.toLowerCase();
            medicines = medicines.filter(med => 
                med.name.toLowerCase().includes(searchLower) ||
                med.generic.toLowerCase().includes(searchLower) ||
                med.uses.toLowerCase().includes(searchLower)
            );
        }
        
        if (category) {
            medicines = medicines.filter(med => med.category === category);
        }
        
        // Pagination
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = pageNum * limitNum;
        const paginatedMedicines = medicines.slice(startIndex, endIndex);
        
        res.json({
            success: true,
            data: paginatedMedicines,
            total: medicines.length,
            page: pageNum,
            totalPages: Math.ceil(medicines.length / limitNum)
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET single medicine
app.get('/api/medicines/:id', (req, res) => {
    try {
        const data = fs.readFileSync(MEDICINES_FILE, 'utf8');
        const medicines = JSON.parse(data);
        const medicine = medicines.find(m => m.id == req.params.id);
        
        if (medicine) {
            res.json({ success: true, data: medicine });
        } else {
            res.status(404).json({ success: false, error: 'Medicine not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST - Add new medicine
app.post('/api/medicines', (req, res) => {
    try {
        const data = fs.readFileSync(MEDICINES_FILE, 'utf8');
        const medicines = JSON.parse(data);
        
        const newMedicine = {
            id: Date.now(), // Simple ID generation
            ...req.body,
            createdAt: new Date().toISOString()
        };
        
        medicines.push(newMedicine);
        fs.writeFileSync(MEDICINES_FILE, JSON.stringify(medicines, null, 2));
        
        res.status(201).json({ success: true, data: newMedicine });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT - Update medicine
app.put('/api/medicines/:id', (req, res) => {
    try {
        const data = fs.readFileSync(MEDICINES_FILE, 'utf8');
        let medicines = JSON.parse(data);
        const index = medicines.findIndex(m => m.id == req.params.id);
        
        if (index !== -1) {
            medicines[index] = { ...medicines[index], ...req.body, updatedAt: new Date().toISOString() };
            fs.writeFileSync(MEDICINES_FILE, JSON.stringify(medicines, null, 2));
            res.json({ success: true, data: medicines[index] });
        } else {
            res.status(404).json({ success: false, error: 'Medicine not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE - Remove medicine
app.delete('/api/medicines/:id', (req, res) => {
    try {
        const data = fs.readFileSync(MEDICINES_FILE, 'utf8');
        let medicines = JSON.parse(data);
        const filtered = medicines.filter(m => m.id != req.params.id);
        
        if (filtered.length < medicines.length) {
            fs.writeFileSync(MEDICINES_FILE, JSON.stringify(filtered, null, 2));
            res.json({ success: true, message: 'Medicine deleted' });
        } else {
            res.status(404).json({ success: false, error: 'Medicine not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== DISEASE ENDPOINTS ==========

// GET medicines by disease
app.get('/api/diseases/:disease/medicines', (req, res) => {
    const diseaseMap = {
        'hypertension': ['Lisinopril', 'Amlodipine', 'Hydrochlorothiazide', 'Metoprolol'],
        'diabetes': ['Metformin', 'Insulin', 'Glipizide', 'Empagliflozin'],
        'depression': ['Sertraline', 'Escitalopram', 'Fluoxetine', 'Venlafaxine'],
        'asthma': ['Albuterol', 'Fluticasone', 'Montelukast', 'Prednisone'],
        'arthritis': ['Ibuprofen', 'Naproxen', 'Methotrexate', 'Adalimumab'],
        'infection': ['Amoxicillin', 'Azithromycin', 'Ciprofloxacin', 'Doxycycline'],
        'cholesterol': ['Atorvastatin', 'Rosuvastatin', 'Simvastatin', 'Ezetimibe'],
        'pain': ['Ibuprofen', 'Acetaminophen', 'Naproxen', 'Tramadol'],
        'acid-reflux': ['Omeprazole', 'Pantoprazole', 'Ranitidine', 'Famotidine'],
        'allergy': ['Cetirizine', 'Loratadine', 'Fexofenadine', 'Diphenhydramine']
    };
    
    const disease = req.params.disease.toLowerCase();
    const medicines = diseaseMap[disease] || [];
    
    res.json({ success: true, data: medicines });
});

// ========== USER ENDPOINTS ==========

// User registration
app.post('/api/register', (req, res) => {
    try {
        const { email, password, name } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password required' });
        }
        
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        const users = JSON.parse(data);
        
        // Check if user exists
        if (users.find(u => u.email === email)) {
            return res.status(400).json({ success: false, error: 'User already exists' });
        }
        
        const newUser = {
            id: Date.now(),
            email,
            password, // In real app, hash this!
            name,
            createdAt: new Date().toISOString()
        };
        
        users.push(newUser);
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        
        // Remove password from response
        const { password: _, ...userWithoutPassword } = newUser;
        res.status(201).json({ success: true, data: userWithoutPassword });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// User login
app.post('/api/login', (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password required' });
        }
        
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        const users = JSON.parse(data);
        const user = users.find(u => u.email === email && u.password === password);
        
        if (user) {
            const { password: _, ...userWithoutPassword } = user;
            res.json({ success: true, data: userWithoutPassword });
        } else {
            res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== HEALTH CHECK ==========
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'MediCare API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// ========== START SERVER ==========
app.listen(PORT, () => {
    console.log(`🚀 MediCare Backend running at http://localhost:${PORT}`);
    console.log(`📋 API Endpoints:`);
    console.log(`   GET    /api/medicines - Get all medicines`);
    console.log(`   GET    /api/medicines/:id - Get single medicine`);
    console.log(`   POST   /api/medicines - Add new medicine`);
    console.log(`   PUT    /api/medicines/:id - Update medicine`);
    console.log(`   DELETE /api/medicines/:id - Delete medicine`);
    console.log(`   POST   /api/register - Register user`);
    console.log(`   POST   /api/login - Login user`);
    console.log(`   GET    /api/health - Health check`);
});