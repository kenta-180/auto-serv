const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const { logAudit } = require('../middleware/audit');

const getUsers = async (req, res) => {
  try {
    const { role } = req.query;
    let users = [];
    if (role && ['ADMIN', 'TECHNICIAN', 'CUSTOMER'].includes(role)) {
      users = await userRepository.findManyByRole(role);
    } else {
      const admins = await userRepository.findManyByRole('ADMIN');
      const techs = await userRepository.findManyByRole('TECHNICIAN');
      const custs = await userRepository.findManyByRole('CUSTOMER');
      users = [...admins, ...techs, ...custs];
    }

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

const createUserByAdmin = async (req, res) => {
  try {
    const { email, password, name, phone, role } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'Email, password, name, and role are required' });
    }

    const existing = await userRepository.findByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await userRepository.create({
      email,
      passwordHash,
      name,
      phone: phone || null,
      role
    });

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt
    };

    await logAudit({
      userId: req.user.id,
      action: 'ADMIN_USER_CREATED',
      entity: 'User',
      entityId: user.id,
      details: `Admin created user ${user.email} with role ${user.role}`
    });

    res.status(201).json(safeUser);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

module.exports = {
  getUsers,
  createUserByAdmin
};
